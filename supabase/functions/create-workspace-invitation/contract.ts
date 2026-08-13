export type RequestedInvitationRole = "admin" | "member";

export type ErrorCategory =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_REQUEST"
  | "INVITATION_PENDING"
  | "DELIVERY_PENDING"
  | "INTERNAL_ERROR";

export interface CreateInvitationRequestBody {
  workspaceId: string;
  inviteeEmail: string;
  requestedRole: RequestedInvitationRole;
}

export interface CreateInvitationSuccessResponse {
  ok: true;
  deliveryStatus: "pending";
  invitationId: string;
}

export interface CreateInvitationErrorResponse {
  ok: false;
  error: string;
  category: ErrorCategory;
}

export type CreateInvitationResponse =
  | CreateInvitationSuccessResponse
  | CreateInvitationErrorResponse;

export interface CreateWorkspaceInvitationRpcArgs {
  p_workspace_id: string;
  p_invitee_email: string;
  p_requested_role: RequestedInvitationRole;
  p_inviter_user_id: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_EMAIL_LENGTH = 254;

const GENERIC_FAILURE_MESSAGE = "Unable to send invitation. Please try again.";

const SENSITIVE_RESPONSE_KEYS = ["raw_token", "token_hash", "rawToken", "tokenHash"];

export function parseBearerAuthorization(
  authorizationHeader: string | null,
): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const match = authorizationHeader.match(/^Bearer\s+(\S+)$/i);
  if (!match?.[1]) {
    return null;
  }

  return match[1];
}

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function normalizeInviteeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateCreateInvitationBody(
  body: unknown,
): { ok: true; value: CreateInvitationRequestBody } | CreateInvitationErrorResponse {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return invalidRequest();
  }

  const record = body as Record<string, unknown>;

  if ("inviterUserId" in record || "p_inviter_user_id" in record || "userId" in record) {
    return invalidRequest();
  }

  if (typeof record.workspaceId !== "string" || !isUuid(record.workspaceId)) {
    return invalidRequest();
  }

  if (typeof record.inviteeEmail !== "string") {
    return invalidRequest();
  }

  const inviteeEmail = normalizeInviteeEmail(record.inviteeEmail);
  if (
    inviteeEmail.length === 0 ||
    inviteeEmail.length > MAX_EMAIL_LENGTH ||
    !EMAIL_REGEX.test(inviteeEmail)
  ) {
    return invalidRequest();
  }

  if (record.requestedRole !== "admin" && record.requestedRole !== "member") {
    return invalidRequest();
  }

  return {
    ok: true,
    value: {
      workspaceId: record.workspaceId,
      inviteeEmail,
      requestedRole: record.requestedRole,
    },
  };
}

export function buildCreateWorkspaceInvitationRpcArgs(
  request: CreateInvitationRequestBody,
  inviterUserId: string,
): CreateWorkspaceInvitationRpcArgs {
  if (!isUuid(inviterUserId)) {
    throw new Error("Verified inviter user id must be a UUID.");
  }

  return {
    p_workspace_id: request.workspaceId,
    p_invitee_email: request.inviteeEmail,
    p_requested_role: request.requestedRole,
    p_inviter_user_id: inviterUserId,
  };
}

export function extractInvitationIdFromRpcResult(data: unknown): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const record = data as Record<string, unknown>;
  const invitation = record.invitation;

  if (!invitation || typeof invitation !== "object" || Array.isArray(invitation)) {
    return null;
  }

  const invitationId = (invitation as Record<string, unknown>).id;
  if (typeof invitationId !== "string" || !isUuid(invitationId)) {
    return null;
  }

  return invitationId;
}

export function buildPendingSuccessResponse(
  invitationId: string,
): CreateInvitationSuccessResponse {
  return {
    ok: true,
    deliveryStatus: "pending",
    invitationId,
  };
}

export function mapRpcErrorToSafeResponse(error: {
  code?: string;
  message?: string;
}): CreateInvitationErrorResponse {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (code === "42501" || message.includes("insufficient role")) {
    return {
      ok: false,
      category: "FORBIDDEN",
      error: "You do not have permission to send this invitation.",
    };
  }

  if (
    code === "23505" ||
    message.includes("already an active member") ||
    message.includes("duplicate")
  ) {
    return {
      ok: false,
      category: "INVITATION_PENDING",
      error: GENERIC_FAILURE_MESSAGE,
    };
  }

  if (code === "22023" || message.includes("valid email")) {
    return {
      ok: false,
      category: "INVALID_REQUEST",
      error: GENERIC_FAILURE_MESSAGE,
    };
  }

  return {
    ok: false,
    category: "INTERNAL_ERROR",
    error: GENERIC_FAILURE_MESSAGE,
  };
}

export function unauthorizedResponse(): CreateInvitationErrorResponse {
  return {
    ok: false,
    category: "UNAUTHORIZED",
    error: "Authentication required.",
  };
}

export function invalidRequest(): CreateInvitationErrorResponse {
  return {
    ok: false,
    category: "INVALID_REQUEST",
    error: GENERIC_FAILURE_MESSAGE,
  };
}

export function internalErrorResponse(): CreateInvitationErrorResponse {
  return {
    ok: false,
    category: "INTERNAL_ERROR",
    error: GENERIC_FAILURE_MESSAGE,
  };
}

export function responseContainsSensitiveFields(payload: unknown): boolean {
  const serialized = JSON.stringify(payload).toLowerCase();
  return SENSITIVE_RESPONSE_KEYS.some((key) => serialized.includes(`"${key.toLowerCase()}"`));
}

export function getAllowedOrigins(envValue: string | undefined): string[] {
  const configured = (envValue ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaults = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
  ];

  return [...new Set([...defaults, ...configured])];
}

export function buildCorsHeaders(
  requestOrigin: string | null,
  allowedOrigins: string[],
): Record<string, string> {
  const allowOrigin =
    requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function readServiceRoleKeyFromEnv(env: Record<string, string | undefined>): string | null {
  const value = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value || value.trim().length === 0) {
    return null;
  }
  return value;
}
