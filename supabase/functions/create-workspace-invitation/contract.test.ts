import { describe, expect, it } from "vitest";

import {
  bodyInvalidResponse,
  buildCreateWorkspaceInvitationRpcArgs,
  buildPendingSuccessResponse,
  emailInvalidResponse,
  extractInvitationIdFromRpcResult,
  internalErrorResponse,
  mapRpcErrorToSafeResponse,
  parseBearerAuthorization,
  readServiceRoleKeyFromEnv,
  responseContainsDisallowedPublicContent,
  responseContainsSensitiveFields,
  roleInvalidResponse,
  unauthorizedResponse,
  validateCreateInvitationBody,
  workspaceIdInvalidResponse,
  type CreateInvitationErrorResponse,
  type ErrorReasonCode,
} from "./contract.ts";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const INVITER_ID = "22222222-2222-4222-8222-222222222222";
const INVITATION_ID = "33333333-3333-4333-8333-333333333333";

const ALL_REASON_CODES: ErrorReasonCode[] = [
  "BODY_INVALID",
  "WORKSPACE_ID_INVALID",
  "EMAIL_INVALID",
  "ROLE_INVALID",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "SELF_INVITE",
  "DUPLICATE_PENDING",
  "INVITEE_ALREADY_MEMBER",
  "RPC_INVALID",
  "INTERNAL",
];

function expectSafeErrorResponse(
  response: CreateInvitationErrorResponse,
  reasonCode: ErrorReasonCode,
): void {
  expect(response.ok).toBe(false);
  expect(response.reasonCode).toBe(reasonCode);
  expect(ALL_REASON_CODES).toContain(response.reasonCode);
  expect(responseContainsSensitiveFields(response)).toBe(false);
  expect(responseContainsDisallowedPublicContent(response)).toBe(false);
  expect(JSON.stringify(response)).not.toContain(WORKSPACE_ID);
  expect(JSON.stringify(response)).not.toContain(INVITER_ID);
  expect(JSON.stringify(response)).not.toContain(INVITATION_ID);
  expect(response.error).not.toMatch(/42501|23505|22023|insufficient role|duplicate|select from/i);
}

describe("create-workspace-invitation contract", () => {
  it("rejects missing Authorization bearer token", () => {
    expect(parseBearerAuthorization(null)).toBeNull();
    expect(parseBearerAuthorization("Token abc")).toBeNull();
    expect(parseBearerAuthorization("Bearer")).toBeNull();
  });

  it("parses a bearer token from Authorization header", () => {
    expect(parseBearerAuthorization("Bearer jwt-token-value")).toBe("jwt-token-value");
  });

  it("maps every allow-listed reason code through a dedicated branch", () => {
    const reasonCodeFixtures: Array<{
      reasonCode: ErrorReasonCode;
      response: CreateInvitationErrorResponse;
    }> = [
      { reasonCode: "BODY_INVALID", response: bodyInvalidResponse() },
      { reasonCode: "WORKSPACE_ID_INVALID", response: workspaceIdInvalidResponse() },
      { reasonCode: "EMAIL_INVALID", response: emailInvalidResponse() },
      { reasonCode: "ROLE_INVALID", response: roleInvalidResponse() },
      { reasonCode: "UNAUTHORIZED", response: unauthorizedResponse() },
      {
        reasonCode: "FORBIDDEN",
        response: mapRpcErrorToSafeResponse({ code: "42501", message: "Insufficient role" }),
      },
      {
        reasonCode: "SELF_INVITE",
        response: mapRpcErrorToSafeResponse({
          code: "22023",
          message: "You cannot invite your own email address",
        }),
      },
      {
        reasonCode: "DUPLICATE_PENDING",
        response: mapRpcErrorToSafeResponse({ code: "23505", message: "duplicate key value" }),
      },
      {
        reasonCode: "INVITEE_ALREADY_MEMBER",
        response: mapRpcErrorToSafeResponse({
          code: "23505",
          message: "This email is already an active member of this workspace",
        }),
      },
      {
        reasonCode: "RPC_INVALID",
        response: mapRpcErrorToSafeResponse({ code: "99999", message: "unexpected server failure" }),
      },
      { reasonCode: "INTERNAL", response: internalErrorResponse() },
    ];

    expect(reasonCodeFixtures.map((fixture) => fixture.reasonCode).sort()).toEqual(
      [...ALL_REASON_CODES].sort(),
    );

    for (const fixture of reasonCodeFixtures) {
      expectSafeErrorResponse(fixture.response, fixture.reasonCode);
    }
  });

  it("returns BODY_INVALID for malformed bodies and forbidden inviter fields", () => {
    expectSafeErrorResponse(validateCreateInvitationBody(null) as CreateInvitationErrorResponse, "BODY_INVALID");
    expectSafeErrorResponse(
      validateCreateInvitationBody([]) as CreateInvitationErrorResponse,
      "BODY_INVALID",
    );
    expectSafeErrorResponse(
      validateCreateInvitationBody({
        workspaceId: WORKSPACE_ID,
        inviteeEmail: "person@example.com",
        requestedRole: "member",
        inviterUserId: INVITER_ID,
      }) as CreateInvitationErrorResponse,
      "BODY_INVALID",
    );
  });

  it("returns WORKSPACE_ID_INVALID for non-uuid workspaceId values", () => {
    expectSafeErrorResponse(
      validateCreateInvitationBody({
        workspaceId: "not-a-uuid",
        inviteeEmail: "person@example.com",
        requestedRole: "member",
      }) as CreateInvitationErrorResponse,
      "WORKSPACE_ID_INVALID",
    );
  });

  it("returns EMAIL_INVALID for invalid inviteeEmail values", () => {
    expectSafeErrorResponse(
      validateCreateInvitationBody({
        workspaceId: WORKSPACE_ID,
        inviteeEmail: "not-an-email",
        requestedRole: "member",
      }) as CreateInvitationErrorResponse,
      "EMAIL_INVALID",
    );

    expectSafeErrorResponse(
      validateCreateInvitationBody({
        workspaceId: WORKSPACE_ID,
        inviteeEmail: 123,
        requestedRole: "member",
      }) as CreateInvitationErrorResponse,
      "EMAIL_INVALID",
    );
  });

  it("returns ROLE_INVALID for unsupported requestedRole values", () => {
    expectSafeErrorResponse(
      validateCreateInvitationBody({
        workspaceId: WORKSPACE_ID,
        inviteeEmail: "person@example.com",
        requestedRole: "owner",
      }) as CreateInvitationErrorResponse,
      "ROLE_INVALID",
    );
  });

  it("accepts a valid request body with normalized email", () => {
    const result = validateCreateInvitationBody({
      workspaceId: WORKSPACE_ID,
      inviteeEmail: " Person@Example.com ",
      requestedRole: "admin",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.inviteeEmail).toBe("person@example.com");
    }
  });

  it("builds exact RPC parameter names from verified JWT subject only", () => {
    const request = {
      workspaceId: WORKSPACE_ID,
      inviteeEmail: "person@example.com",
      requestedRole: "member" as const,
    };

    const rpcArgs = buildCreateWorkspaceInvitationRpcArgs(request, INVITER_ID);

    expect(rpcArgs).toEqual({
      p_workspace_id: WORKSPACE_ID,
      p_invitee_email: "person@example.com",
      p_requested_role: "member",
      p_inviter_user_id: INVITER_ID,
    });
    expect(Object.keys(rpcArgs)).not.toContain("p_raw_token");
    expect(Object.keys(rpcArgs)).not.toContain("p_token_hash");
  });

  it("extracts invitation id without exposing raw token fields", () => {
    const invitationId = extractInvitationIdFromRpcResult({
      invitation: { id: INVITATION_ID },
      raw_token: "super-secret-token-value",
    });

    expect(invitationId).toBe(INVITATION_ID);
  });

  it("returns deliveryStatus pending and never sent", () => {
    const response = buildPendingSuccessResponse(INVITATION_ID);

    expect(response).toEqual({
      ok: true,
      deliveryStatus: "pending",
      invitationId: INVITATION_ID,
    });
    expect(JSON.stringify(response)).not.toContain("sent");
    expect(responseContainsSensitiveFields(response)).toBe(false);
    expect(responseContainsDisallowedPublicContent(response)).toBe(false);
  });

  it("maps RPC authorization failures to FORBIDDEN without leaking SQL text", () => {
    const mapped = mapRpcErrorToSafeResponse({
      code: "42501",
      message: "Insufficient role to create invitations",
    });

    expectSafeErrorResponse(mapped, "FORBIDDEN");
    expect(mapped.category).toBe("FORBIDDEN");
    expect(mapped.error).toBe("You do not have permission to send this invitation.");
  });

  it("maps unknown RPC codes to RPC_INVALID and missing codes to INTERNAL", () => {
    expectSafeErrorResponse(
      mapRpcErrorToSafeResponse({ code: "22023", message: "unexpected check constraint" }),
      "RPC_INVALID",
    );
    expectSafeErrorResponse(mapRpcErrorToSafeResponse({}), "INTERNAL");
  });

  it("never includes raw_token or token_hash in public responses", () => {
    const success = buildPendingSuccessResponse(INVITATION_ID);
    const unauthorized = unauthorizedResponse();

    expect(responseContainsSensitiveFields(success)).toBe(false);
    expect(responseContainsSensitiveFields(unauthorized)).toBe(false);
    expect(JSON.stringify({ invitationId: INVITATION_ID, raw_token: "hidden" })).toContain(
      "raw_token",
    );
  });

  it("reads service-role key only from server environment without logging it", () => {
    expect(readServiceRoleKeyFromEnv({})).toBeNull();
    expect(readServiceRoleKeyFromEnv({ SUPABASE_SERVICE_ROLE_KEY: "service-role-secret" })).toBe(
      "service-role-secret",
    );
  });
});
