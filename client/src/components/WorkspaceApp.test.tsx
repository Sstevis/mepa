/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import WorkspaceApp from "@/components/WorkspaceApp";

const mockCreateWorkspace = vi.fn();
const mockRefresh = vi.fn();

vi.mock("@/hooks/useWorkspaceMemberships", () => ({
  useWorkspaceMemberships: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceMemberships } from "@/hooks/useWorkspaceMemberships";

const sampleMembership = {
  workspaceId: "ws-1",
  workspaceName: "Kwame Provisions",
  workspaceType: "individual" as const,
  role: "owner" as const,
  currencyCode: "GHS",
  timezone: "Africa/Accra",
  status: "active" as const,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("WorkspaceApp", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      session: { user: { email: "trader@example.com" } } as never,
      user: { email: "trader@example.com" } as never,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    });
  });

  it("shows onboarding when there is no active membership", () => {
    vi.mocked(useWorkspaceMemberships).mockReturnValue({
      memberships: [],
      loading: false,
      creating: false,
      error: null,
      refresh: mockRefresh,
      createWorkspace: mockCreateWorkspace,
    });

    render(<WorkspaceApp />);

    expect(
      screen.getByRole("heading", { name: "Set up your workspace" }),
    ).toBeTruthy();
    expect(screen.queryByText("Kwame Provisions")).toBeNull();
  });

  it("shows the workspace summary after RLS-protected membership load", () => {
    vi.mocked(useWorkspaceMemberships).mockReturnValue({
      memberships: [sampleMembership],
      loading: false,
      creating: false,
      error: null,
      refresh: mockRefresh,
      createWorkspace: mockCreateWorkspace,
    });

    render(<WorkspaceApp />);

    expect(screen.getByRole("heading", { name: "Kwame Provisions" })).toBeTruthy();
    expect(screen.getByText("Individual")).toBeTruthy();
    expect(screen.getByText("Owner")).toBeTruthy();
    expect(screen.queryByText("Contacts")).toBeNull();
    expect(screen.queryByText("Kwame Mensah")).toBeNull();
  });
});
