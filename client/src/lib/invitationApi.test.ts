import { describe, expect, it, vi } from "vitest";

import {
  buildCreateInvitationFunctionUrl,
  createWorkspaceInvitationViaEdgeFunction,
  listWorkspaceInvitations,
  mapCreateInvitationHttpError,
  responseContainsSensitiveInvitationFields,
  revokeWorkspaceInvitation,
} from "@/lib/invitationApi";
import {
  CREATE_INVITATION_FUNCTION_NAME,
  LIST_WORKSPACE_INVITATIONS_RPC,
  REVOKE_WORKSPACE_INVITATION_RPC,
} from "@/lib/invitationTypes";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const INVITATION_ID = "33333333-3333-4333-8333-333333333333";

vi.mock("@/lib/supabaseConfig", () => ({
  readSupabasePublicConfig: () => ({
    url: "https://example.supabase.co",
    publishableKey: "publishable-key",
  }),
}));

describe("invitationApi", () => {
  it("builds the Edge Function URL from configured Supabase URL", () => {
    expect(buildCreateInvitationFunctionUrl("https://example.supabase.co/")).toBe(
      `https://example.supabase.co/functions/v1/${CREATE_INVITATION_FUNCTION_NAME}`,
    );
  });

  it("maps HTTP errors to safe generic messages", () => {
    expect(mapCreateInvitationHttpError(401)).toContain("signed in");
    expect(mapCreateInvitationHttpError(403)).toContain("permission");
    expect(mapCreateInvitationHttpError(429)).toContain("Too many requests");
    expect(mapCreateInvitationHttpError(500)).toBe(
      "Unable to send invitation. Please try again.",
    );
  });

  it("detects sensitive invitation response fields", () => {
    expect(responseContainsSensitiveInvitationFields({ ok: true })).toBe(false);
    expect(
      responseContainsSensitiveInvitationFields({ raw_token: "secret" }),
    ).toBe(true);
  });

  it("creates invitations through the Edge Function endpoint, not token RPCs", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        deliveryStatus: "pending",
        invitationId: INVITATION_ID,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const rpcMock = vi.fn();
    const supabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "access-token" } },
          error: null,
        }),
      },
      rpc: rpcMock,
    };

    const result = await createWorkspaceInvitationViaEdgeFunction(supabase as never, {
      workspaceId: WORKSPACE_ID,
      inviteeEmail: "person@example.com",
      requestedRole: "member",
    });

    expect(result.error).toBeNull();
    expect(result.data?.deliveryStatus).toBe("pending");
    expect(fetchMock).toHaveBeenCalledWith(
      `https://example.supabase.co/functions/v1/${CREATE_INVITATION_FUNCTION_NAME}`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
          apikey: "publishable-key",
        }),
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      workspaceId: WORKSPACE_ID,
      inviteeEmail: "person@example.com",
      requestedRole: "member",
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects Edge Function responses that include token material", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          deliveryStatus: "pending",
          invitationId: INVITATION_ID,
          raw_token: "secret",
        }),
      }),
    );

    const supabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "access-token" } },
          error: null,
        }),
      },
    };

    const result = await createWorkspaceInvitationViaEdgeFunction(supabase as never, {
      workspaceId: WORKSPACE_ID,
      inviteeEmail: "person@example.com",
      requestedRole: "admin",
    });

    expect(result.data).toBeNull();
    expect(result.error).toBe("Unable to send invitation. Please try again.");
  });

  it("lists invitations through the browser-safe RPC", async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: INVITATION_ID,
          workspace_id: WORKSPACE_ID,
          email: "person@example.com",
          requested_role: "member",
          invited_by: "22222222-2222-4222-8222-222222222222",
          expires_at: "2026-08-20T00:00:00.000Z",
          accepted_at: null,
          revoked_at: null,
          created_at: "2026-08-13T00:00:00.000Z",
        },
      ],
      error: null,
    });

    const result = await listWorkspaceInvitations({ rpc: rpcMock } as never, WORKSPACE_ID);

    expect(rpcMock).toHaveBeenCalledWith(LIST_WORKSPACE_INVITATIONS_RPC, {
      p_workspace_id: WORKSPACE_ID,
    });
    expect(result.invitations[0]?.email).toBe("person@example.com");
    expect(JSON.stringify(result.invitations[0])).not.toMatch(/raw_token|token_hash/i);
  });

  it("revokes invitations through the browser-safe RPC", async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });

    const result = await revokeWorkspaceInvitation(
      { rpc: rpcMock } as never,
      WORKSPACE_ID,
      INVITATION_ID,
    );

    expect(rpcMock).toHaveBeenCalledWith(REVOKE_WORKSPACE_INVITATION_RPC, {
      p_workspace_id: WORKSPACE_ID,
      p_invitation_id: INVITATION_ID,
    });
    expect(result.error).toBeNull();
  });
});
