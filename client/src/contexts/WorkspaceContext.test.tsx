/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import { useWorkspace, WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { SELECTED_WORKSPACE_STORAGE_KEY } from "@/lib/workspaceSelection";
import type { ActiveWorkspaceMembership } from "@/types/workspace";

function WorkspaceSelectionProbe() {
  const { selectedMembership } = useWorkspace();
  if (!selectedMembership) {
    return null;
  }

  const roleLabel =
    selectedMembership.role === "member"
      ? "Member"
      : selectedMembership.role === "owner"
        ? "Owner"
        : "Admin";

  const typeLabel =
    selectedMembership.workspaceType === "company" ? "Company" : "Individual";

  return (
    <>
      <h1>{selectedMembership.workspaceName}</h1>
      <p>{roleLabel}</p>
      <p>{typeLabel}</p>
      <WorkspaceSwitcher />
    </>
  );
}

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
      <WorkspaceSelectionProbe />
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
