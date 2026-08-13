import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CREATE_INVITATION_FUNCTION_NAME,
  GENERIC_INVITATION_ERROR,
  LIST_WORKSPACE_INVITATIONS_RPC,
  REVOKE_WORKSPACE_INVITATION_RPC,
  type CreateInvitationRequest,
  type CreateInvitationResult,
  type InvitableRole,
  type WorkspaceInvitation,
} from "@/lib/invitationTypes";
import { readSupabasePublicConfig } from "@/lib/supabaseConfig";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SENSITIVE_KEYS = ["raw_token", "token_hash", "rawToken", "tokenHash"];

interface InvitationRow {
  id: string;
  workspace_id: string;
  email: string;
  requested_role: InvitableRole;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export function buildCreateInvitationFunctionUrl(supabaseUrl: string): string {
  const trimmed = supabaseUrl.replace(/\/+$/, "");
  return `${trimmed}/functions/v1/${CREATE_INVITATION_FUNCTION_NAME}`;
}

export function validateInvitationEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.length > 254 || !EMAIL_REGEX.test(normalized)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validateInvitationRole(role: string): role is InvitableRole {
  return role === "admin" || role === "member";
}

export function responseContainsSensitiveInvitationFields(payload: unknown): boolean {
  const serialized = JSON.stringify(payload).toLowerCase();
  return SENSITIVE_KEYS.some((key) => serialized.includes(`"${key.toLowerCase()}"`));
}

export function mapInvitationRow(row: InvitationRow): WorkspaceInvitation {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    email: row.email,
    requestedRole: row.requested_role,
    invitedBy: row.invited_by,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}

export function mapCreateInvitationHttpError(status: number): string {
  if (status === 401) {
    return "You must be signed in to send an invitation.";
  }
  if (status === 403) {
    return "You do not have permission to send this invitation.";
  }
  if (status === 429) {
    return "Too many requests. Please wait and try again.";
  }
  if (status >= 500) {
    return GENERIC_INVITATION_ERROR;
  }
  return GENERIC_INVITATION_ERROR;
}

export function mapInvitationRpcError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("authentication required")) {
    return "You must be signed in to manage invitations.";
  }
  if (normalized.includes("insufficient role")) {
    return "You do not have permission to manage invitations.";
  }
  return GENERIC_INVITATION_ERROR;
}

export async function createWorkspaceInvitationViaEdgeFunction(
  supabase: SupabaseClient,
  request: CreateInvitationRequest,
): Promise<{ data: CreateInvitationResult | null; error: string | null }> {
  const emailError = validateInvitationEmail(request.inviteeEmail);
  if (emailError) {
    return { data: null, error: emailError };
  }

  if (!validateInvitationRole(request.requestedRole)) {
    return { data: null, error: GENERIC_INVITATION_ERROR };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (sessionError || !accessToken) {
    return { data: null, error: "You must be signed in to send an invitation." };
  }

  const { url, publishableKey } = readSupabasePublicConfig();
  const endpoint = buildCreateInvitationFunctionUrl(url);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceId: request.workspaceId,
        inviteeEmail: request.inviteeEmail.trim().toLowerCase(),
        requestedRole: request.requestedRole,
      }),
    });
  } catch {
    return { data: null, error: GENERIC_INVITATION_ERROR };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (responseContainsSensitiveInvitationFields(payload)) {
    return { data: null, error: GENERIC_INVITATION_ERROR };
  }

  if (!response.ok) {
    return { data: null, error: mapCreateInvitationHttpError(response.status) };
  }

  if (!payload || typeof payload !== "object") {
    return { data: null, error: GENERIC_INVITATION_ERROR };
  }

  const record = payload as Record<string, unknown>;
  if (
    record.ok !== true ||
    record.deliveryStatus !== "pending" ||
    typeof record.invitationId !== "string"
  ) {
    return { data: null, error: GENERIC_INVITATION_ERROR };
  }

  return {
    data: {
      invitationId: record.invitationId,
      deliveryStatus: "pending",
    },
    error: null,
  };
}

export async function listWorkspaceInvitations(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<{ invitations: WorkspaceInvitation[]; error: string | null }> {
  const { data, error } = await supabase.rpc(LIST_WORKSPACE_INVITATIONS_RPC, {
    p_workspace_id: workspaceId,
  });

  if (error) {
    return {
      invitations: [],
      error: mapInvitationRpcError(error.message ?? GENERIC_INVITATION_ERROR),
    };
  }

  const invitations = ((data ?? []) as InvitationRow[]).map(mapInvitationRow);
  return { invitations, error: null };
}

export async function revokeWorkspaceInvitation(
  supabase: SupabaseClient,
  workspaceId: string,
  invitationId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc(REVOKE_WORKSPACE_INVITATION_RPC, {
    p_workspace_id: workspaceId,
    p_invitation_id: invitationId,
  });

  if (error) {
    return { error: mapInvitationRpcError(error.message ?? GENERIC_INVITATION_ERROR) };
  }

  return { error: null };
}
