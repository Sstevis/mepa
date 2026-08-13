/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useWorkspaceMemberships } from "@/hooks/useWorkspaceMemberships";

const mockFetch = vi.fn();
const mockCreateRpc = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({}),
}));

vi.mock("@/lib/workspaceApi", () => ({
  fetchActiveWorkspaceMemberships: (...args: unknown[]) => mockFetch(...args),
  createWorkspaceViaRpc: (...args: unknown[]) => mockCreateRpc(...args),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("useWorkspaceMemberships", () => {
  it("re-queries memberships after a successful RPC create", async () => {
    mockFetch
      .mockResolvedValueOnce({ memberships: [], error: null })
      .mockResolvedValueOnce({
        memberships: [
          {
            workspaceId: "ws-1",
            workspaceName: "Kwame Provisions",
            workspaceType: "individual",
            role: "owner",
            currencyCode: "GHS",
            timezone: "Africa/Accra",
            status: "active",
          },
        ],
        error: null,
      });
    mockCreateRpc.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useWorkspaceMemberships());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      const createResult = await result.current.createWorkspace(
        "Kwame Provisions",
        "individual",
      );
      expect(createResult.error).toBeNull();
    });

    expect(mockCreateRpc).toHaveBeenCalledWith({}, "Kwame Provisions", "individual");
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.current.activeMembership?.workspaceName).toBe("Kwame Provisions");
  });
});
