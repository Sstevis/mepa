/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import WorkspaceShell from "@/components/WorkspaceShell";
import { WorkspaceProvider, useWorkspace } from "@/contexts/WorkspaceContext";
import { SELECTED_WORKSPACE_STORAGE_KEY } from "@/lib/workspaceSelection";
import type { ActiveWorkspaceMembership } from "@/types/workspace";

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
  role: "admin",
  currencyCode: "GHS",
  timezone: "Africa/Accra",
  status: "active",
};

function SelectedWorkspaceLabel() {
  const { selectedMembership } = useWorkspace();
  return <p>{selectedMembership?.workspaceName ?? "None"}</p>;
}

function renderSwitcher(memberships: ActiveWorkspaceMembership[]) {
  return render(
    <WorkspaceProvider memberships={memberships} refreshMemberships={vi.fn()}>
      <WorkspaceShell>
        <SelectedWorkspaceLabel />
      </WorkspaceShell>
    </WorkspaceProvider>,
  );
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe("WorkspaceSwitcher", () => {
  it("does not render when the user has one membership", async () => {
    renderSwitcher([membershipA]);

    await waitFor(() => {
      expect(screen.queryByLabelText("Switch workspace")).toBeNull();
    });
  });

  it("SW-02 switches between active memberships and updates session storage", async () => {
    renderSwitcher([membershipA, membershipB]);

    const switcher = await screen.findByLabelText("Switch workspace");

    expect((switcher as HTMLSelectElement).value).toBe("ws-a");
    expect(screen.getByText("Alpha Traders")).toBeTruthy();

    fireEvent.change(switcher, { target: { value: "ws-b" } });

    expect((switcher as HTMLSelectElement).value).toBe("ws-b");
    expect(sessionStorage.getItem(SELECTED_WORKSPACE_STORAGE_KEY)).toBe("ws-b");
    expect(screen.getByText("Beta Supplies")).toBeTruthy();
  });
});
