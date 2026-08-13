import { describe, expect, it, vi } from "vitest";

import {
  createWorkspaceViaRpc,
  fetchActiveWorkspaceMemberships,
} from "@/lib/workspaceApi";
import { CREATE_WORKSPACE_RPC } from "@/types/workspace";

describe("workspaceApi", () => {
  it("loads active memberships through RLS-protected select only", async () => {
    const order = vi.fn().mockReturnThis();
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const supabase = { from } as never;

    order.mockResolvedValue({
      data: [
        {
          role: "owner",
          status: "active",
          workspace_id: "ws-1",
          joined_at: "2026-01-01T00:00:00Z",
          workspaces: {
            id: "ws-1",
            name: "Kwame Provisions",
            workspace_type: "individual",
            currency_code: "GHS",
            timezone: "Africa/Accra",
          },
        },
      ],
      error: null,
    });

    const result = await fetchActiveWorkspaceMemberships(supabase);

    expect(from).toHaveBeenCalledWith("workspace_memberships");
    expect(select).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith("status", "active");
    expect(result.memberships).toEqual([
      {
        workspaceId: "ws-1",
        workspaceName: "Kwame Provisions",
        workspaceType: "individual",
        role: "owner",
        currencyCode: "GHS",
        timezone: "Africa/Accra",
        status: "active",
      },
    ]);
  });

  it("calls create_workspace RPC with exact migration argument names", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "ws-1", error: null });
    const supabase = { rpc } as never;

    const result = await createWorkspaceViaRpc(
      supabase,
      "  Kwame Provisions  ",
      "company",
    );

    expect(result.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith(CREATE_WORKSPACE_RPC, {
      workspace_name: "Kwame Provisions",
      requested_type: "company",
    });
    expect(rpc.mock.calls[0][1]).not.toHaveProperty("user_id");
  });

  it("does not insert directly into workspace tables", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Authentication required to create a workspace", code: "42501" },
    });
    const insert = vi.fn();
    const supabase = {
      rpc,
      from: vi.fn().mockReturnValue({ insert }),
    } as never;

    const result = await createWorkspaceViaRpc(supabase, "Test", "individual");

    expect(result.error).toBe("You must be signed in to create a workspace.");
    expect(insert).not.toHaveBeenCalled();
  });
});
