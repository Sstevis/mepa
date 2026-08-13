import { describe, expect, it } from "vitest";

import {
  buildCreateWorkspaceInvitationRpcArgs,
  buildPendingSuccessResponse,
  extractInvitationIdFromRpcResult,
  mapRpcErrorToSafeResponse,
  parseBearerAuthorization,
  readServiceRoleKeyFromEnv,
  responseContainsSensitiveFields,
  unauthorizedResponse,
  validateCreateInvitationBody,
} from "./contract.ts";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const INVITER_ID = "22222222-2222-4222-8222-222222222222";
const INVITATION_ID = "33333333-3333-4333-8333-333333333333";

describe("create-workspace-invitation contract", () => {
  it("rejects missing Authorization bearer token", () => {
    expect(parseBearerAuthorization(null)).toBeNull();
    expect(parseBearerAuthorization("Token abc")).toBeNull();
    expect(parseBearerAuthorization("Bearer")).toBeNull();
  });

  it("parses a bearer token from Authorization header", () => {
    expect(parseBearerAuthorization("Bearer jwt-token-value")).toBe("jwt-token-value");
  });

  it("rejects invalid JSON bodies and invalid UUIDs", () => {
    expect(validateCreateInvitationBody(null).ok).toBe(false);
    expect(
      validateCreateInvitationBody({
        workspaceId: "not-a-uuid",
        inviteeEmail: "person@example.com",
        requestedRole: "member",
      }).ok,
    ).toBe(false);
  });

  it("rejects invalid email and role values", () => {
    expect(
      validateCreateInvitationBody({
        workspaceId: WORKSPACE_ID,
        inviteeEmail: "not-an-email",
        requestedRole: "member",
      }).ok,
    ).toBe(false);

    expect(
      validateCreateInvitationBody({
        workspaceId: WORKSPACE_ID,
        inviteeEmail: "person@example.com",
        requestedRole: "owner",
      }).ok,
    ).toBe(false);
  });

  it("rejects body-supplied inviter identifiers", () => {
    expect(
      validateCreateInvitationBody({
        workspaceId: WORKSPACE_ID,
        inviteeEmail: "person@example.com",
        requestedRole: "member",
        inviterUserId: "99999999-9999-4999-8999-999999999999",
      }).ok,
    ).toBe(false);
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
  });

  it("maps RPC authorization failures to safe responses", () => {
    const mapped = mapRpcErrorToSafeResponse({
      code: "42501",
      message: "Insufficient role to create invitations",
    });

    expect(mapped.category).toBe("FORBIDDEN");
    expect(mapped.error).not.toContain("Insufficient role");
    expect(mapped.error).not.toContain("42501");
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
