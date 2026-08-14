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

vi.mock("@/contexts/LedgerContext", () => ({
  LedgerProvider: ({ children }: { children: React.ReactNode }) => children,
  useLedger: () => ({
    db: {},
    scopeKey: "user-1:ws-1",
    databaseName: "MepaLedger__user_user-1__workspace_ws-1",
  }),
}));

vi.mock("@/hooks/useDbData", () => ({
  useContacts: vi.fn(() => ({ contacts: [], loading: false, refresh: vi.fn() })),
  useObligations: vi.fn(() => ({ obligations: [], loading: false, refresh: vi.fn() })),
  usePayments: vi.fn(() => ({ payments: [], loading: false, refresh: vi.fn() })),
  useContact: vi.fn(() => ({ contact: null, loading: false })),
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
      session: { user: { id: "user-1", email: "trader@example.com" } } as never,
      user: { id: "user-1", email: "trader@example.com" } as never,
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

  it("renders the core ledger dashboard after membership load", () => {
    vi.mocked(useWorkspaceMemberships).mockReturnValue({
      memberships: [sampleMembership],
      loading: false,
      creating: false,
      error: null,
      refresh: mockRefresh,
      createWorkspace: mockCreateWorkspace,
    });

    render(<WorkspaceApp />);

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeTruthy();
    expect(screen.getAllByText("Kwame Provisions").length).toBeGreaterThan(0);
    expect(screen.getByText("Team invitations are deferred.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Team invitations" })).toBeNull();
  });
});
