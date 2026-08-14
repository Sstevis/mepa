export type RequestedInvitationRole = "admin" | "member";

export type ErrorCategory =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_REQUEST"
  | "INVITATION_PENDING"
  | "DELIVERY_PENDING"
  | "INTERNAL_ERROR";

export type ErrorReasonCode =
  | "BODY_INVALID"
  | "WORKSPACE_ID_INVALID"
  | "EMAIL_INVALID"
  | "ROLE_INVALID"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "SELF_INVITE"
  | "DUPLICATE_PENDING"
  | "INVITEE_ALREADY_MEMBER"
  | "RPC_INVALID"
  | "INTERNAL";

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
  reasonCode: ErrorReasonCode;
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

const DISALLOWED_PUBLIC_RESPONSE_PATTERNS = [
  /@[^\s"]+\.[^\s"]+/i,
  /\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bfrom\b|\bwhere\b/i,
  /person@example\.com/i,
  /inviteruserid|p_inviter_user_id|p_workspace_id|p_invitee_email/i,
];

function buildErrorResponse(
  category: ErrorCategory,
  reasonCode: ErrorReasonCode,
  error: string,
): CreateInvitationErrorResponse {
  return {
    ok: false,
    category,
    reasonCode,
    error,
  };
}

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
    return bodyInvalidResponse();
  }

  const record = body as Record<string, unknown>;

  if ("inviterUserId" in record || "p_inviter_user_id" in record || "userId" in record) {
    return bodyInvalidResponse();
  }

  if (typeof record.workspaceId !== "string" || !isUuid(record.workspaceId)) {
    return workspaceIdInvalidResponse();
  }

  if (typeof record.inviteeEmail !== "string") {
    return emailInvalidResponse();
  }

  const inviteeEmail = normalizeInviteeEmail(record.inviteeEmail);
  if (
    inviteeEmail.length === 0 ||
    inviteeEmail.length > MAX_EMAIL_LENGTH ||
    !EMAIL_REGEX.test(inviteeEmail)
  ) {
    return emailInvalidResponse();
  }

  if (record.requestedRole !== "admin" && record.requestedRole !== "member") {
    return roleInvalidResponse();
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

  if (code === "42501") {
    return buildErrorResponse(
      "FORBIDDEN",
      "FORBIDDEN",
      "You do not have permission to send this invitation.",
    );
  }

  if (code === "23505") {
    if (message.includes("already an active member")) {
      return buildErrorResponse("INVITATION_PENDING", "INVITEE_ALREADY_MEMBER", GENERIC_FAILURE_MESSAGE);
    }

    return buildErrorResponse("INVITATION_PENDING", "DUPLICATE_PENDING", GENERIC_FAILURE_MESSAGE);
  }

  if (code === "22023") {
    if (message.includes("cannot invite your own")) {
      return buildErrorResponse("INVALID_REQUEST", "SELF_INVITE", GENERIC_FAILURE_MESSAGE);
    }

    if (message.includes("owner role")) {
      return buildErrorResponse("INVALID_REQUEST", "ROLE_INVALID", GENERIC_FAILURE_MESSAGE);
    }

    if (message.includes("valid email")) {
      return buildErrorResponse("INVALID_REQUEST", "EMAIL_INVALID", GENERIC_FAILURE_MESSAGE);
    }

    return buildErrorResponse("INVALID_REQUEST", "RPC_INVALID", GENERIC_FAILURE_MESSAGE);
  }

  if (code.length > 0) {
    return buildErrorResponse("INTERNAL_ERROR", "RPC_INVALID", GENERIC_FAILURE_MESSAGE);
  }

  return internalErrorResponse();
}

export function unauthorizedResponse(): CreateInvitationErrorResponse {
  return buildErrorResponse("UNAUTHORIZED", "UNAUTHORIZED", "Authentication required.");
}

export function bodyInvalidResponse(): CreateInvitationErrorResponse {
  return buildErrorResponse("INVALID_REQUEST", "BODY_INVALID", GENERIC_FAILURE_MESSAGE);
}

export function workspaceIdInvalidResponse(): CreateInvitationErrorResponse {
  return buildErrorResponse(
    "INVALID_REQUEST",
    "WORKSPACE_ID_INVALID",
    GENERIC_FAILURE_MESSAGE,
  );
}

export function emailInvalidResponse(): CreateInvitationErrorResponse {
  return buildErrorResponse("INVALID_REQUEST", "EMAIL_INVALID", GENERIC_FAILURE_MESSAGE);
}

export function roleInvalidResponse(): CreateInvitationErrorResponse {
  return buildErrorResponse("INVALID_REQUEST", "ROLE_INVALID", GENERIC_FAILURE_MESSAGE);
}

/** @deprecated Use bodyInvalidResponse() for new call sites. */
export function invalidRequest(): CreateInvitationErrorResponse {
  return bodyInvalidResponse();
}

export function internalErrorResponse(): CreateInvitationErrorResponse {
  return buildErrorResponse("INTERNAL_ERROR", "INTERNAL", GENERIC_FAILURE_MESSAGE);
}

export function responseContainsSensitiveFields(payload: unknown): boolean {
  const serialized = JSON.stringify(payload).toLowerCase();
  return SENSITIVE_RESPONSE_KEYS.some((key) => serialized.includes(`"${key.toLowerCase()}"`));
}

export function responseContainsDisallowedPublicContent(payload: unknown): boolean {
  const serialized = JSON.stringify(payload);
  if (responseContainsSensitiveFields(payload)) {
    return true;
  }

  return DISALLOWED_PUBLIC_RESPONSE_PATTERNS.some((pattern) => pattern.test(serialized));
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
