import { createClient } from "npm:@supabase/supabase-js@2";

import {
  buildCreateWorkspaceInvitationRpcArgs,
  buildCorsHeaders,
  buildPendingSuccessResponse,
  extractInvitationIdFromRpcResult,
  getAllowedOrigins,
  internalErrorResponse,
  invalidRequest,
  mapRpcErrorToSafeResponse,
  parseBearerAuthorization,
  readServiceRoleKeyFromEnv,
  unauthorizedResponse,
  validateCreateInvitationBody,
  type CreateInvitationErrorResponse,
  type CreateInvitationResponse,
} from "./contract.ts";

function jsonResponse(
  payload: CreateInvitationResponse,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function errorResponse(
  payload: CreateInvitationErrorResponse,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return jsonResponse(payload, status, corsHeaders);
}

Deno.serve(async (request) => {
  const corsHeaders = buildCorsHeaders(
    request.headers.get("Origin"),
    getAllowedOrigins(Deno.env.get("ALLOWED_ORIGINS")),
  );

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return errorResponse(invalidRequest(), 405, corsHeaders);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = readServiceRoleKeyFromEnv(Deno.env.toObject());

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return errorResponse(internalErrorResponse(), 500, corsHeaders);
  }

  const accessToken = parseBearerAuthorization(request.headers.get("Authorization"));
  if (!accessToken) {
    return errorResponse(unauthorizedResponse(), 401, corsHeaders);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  const verifiedUser = userData.user;

  if (userError || !verifiedUser?.id) {
    return errorResponse(unauthorizedResponse(), 401, corsHeaders);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(invalidRequest(), 400, corsHeaders);
  }

  const validated = validateCreateInvitationBody(body);
  if (!validated.ok) {
    return errorResponse(validated, 400, corsHeaders);
  }

  const rpcArgs = buildCreateWorkspaceInvitationRpcArgs(validated.value, verifiedUser.id);

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error: rpcError } = await serviceClient.rpc(
    "create_workspace_invitation",
    rpcArgs,
  );

  if (rpcError) {
    const safeError = mapRpcErrorToSafeResponse(rpcError);
    const status = safeError.category === "FORBIDDEN" ? 403 : 400;
    return errorResponse(safeError, status, corsHeaders);
  }

  const invitationId = extractInvitationIdFromRpcResult(data);
  if (!invitationId) {
    return errorResponse(internalErrorResponse(), 500, corsHeaders);
  }

  // raw_token may exist in server memory inside `data`; discard it here.
  return jsonResponse(buildPendingSuccessResponse(invitationId), 200, corsHeaders);
});
