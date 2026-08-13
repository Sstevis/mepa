/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import WorkspaceHome from "@/components/WorkspaceHome";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { SELECTED_WORKSPACE_STORAGE_KEY } from "@/lib/workspaceSelection";
import type { ActiveWorkspaceMembership } from "@/types/workspace";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: { email: "trader@example.com" },
    signOut: vi.fn(),
  })),
}));

const membershipA: ActiveWorkspaceMembership = {
  workspaceId: "ws-a",
  workspaceName: "Alpha Traders",
  workspaceType: "individual",
  role: "owner",
  currencyCode: "GHS",
  timezone: "Africa/Accra",
  status: "active",
};

const membershipB: ActiveWorkspaceMembership = {
  workspaceId: "ws-b",
  workspaceName: "Beta Supplies",
  workspaceType: "company",
  role: "member",
  currencyCode: "GHS",
  timezone: "Africa/Accra",
  status: "active",
};

function renderWithWorkspace(
  memberships: ActiveWorkspaceMembership[],
  refreshMemberships = vi.fn(),
) {
  return render(
    <WorkspaceProvider memberships={memberships} refreshMemberships={refreshMemberships}>
      <WorkspaceHome />
    </WorkspaceProvider>,
  );
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe("WorkspaceContext selection", () => {
  it("SW-01 selects the only active membership after sign-in", async () => {
    renderWithWorkspace([membershipA]);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Alpha Traders" })).toBeTruthy();
    });
    expect(sessionStorage.getItem(SELECTED_WORKSPACE_STORAGE_KEY)).toBe("ws-a");
  });

  it("SW-02 restores a valid stored workspace selection", async () => {
    sessionStorage.setItem(SELECTED_WORKSPACE_STORAGE_KEY, "ws-b");

    renderWithWorkspace([membershipA, membershipB]);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Beta Supplies" })).toBeTruthy();
    });
    expect(screen.getByText("Member")).toBeTruthy();
    expect(screen.getByText("Company")).toBeTruthy();
  });

  it("SW-03 replaces an invalid stored workspace ID with the first active membership", async () => {
    sessionStorage.setItem(SELECTED_WORKSPACE_STORAGE_KEY, "ws-attacker");

    renderWithWorkspace([membershipA, membershipB]);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Alpha Traders" })).toBeTruthy();
    });
    expect(sessionStorage.getItem(SELECTED_WORKSPACE_STORAGE_KEY)).toBe("ws-a");
    expect(screen.queryByText("Attacker Workspace")).toBeNull();
  });

  it("SW-04 never selects a tampered workspace ID outside the membership list", async () => {
    sessionStorage.setItem(SELECTED_WORKSPACE_STORAGE_KEY, "ws-attacker");

    renderWithWorkspace([membershipA]);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Alpha Traders" })).toBeTruthy();
    });

    expect(screen.queryByText("Attacker Workspace")).toBeNull();
    expect(sessionStorage.getItem(SELECTED_WORKSPACE_STORAGE_KEY)).toBe("ws-a");
  });
});
