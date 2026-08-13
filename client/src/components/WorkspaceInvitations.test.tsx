/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import WorkspaceInvitations from "@/components/WorkspaceInvitations";
import { DELIVERY_PENDING_SUCCESS_MESSAGE } from "@/lib/invitationTypes";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const INVITATION_ID = "33333333-3333-4333-8333-333333333333";

const mockCreateInvitation = vi.fn();
const mockRevokeInvitation = vi.fn();
const mockClearMessages = vi.fn();
const mockRefresh = vi.fn();

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: vi.fn(),
}));

vi.mock("@/hooks/useWorkspaceInvitations", () => ({
  useWorkspaceInvitations: vi.fn(),
}));

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInvitations } from "@/hooks/useWorkspaceInvitations";

const sampleInvitation = {
  id: INVITATION_ID,
  workspaceId: WORKSPACE_ID,
  email: "person@example.com",
  requestedRole: "member" as const,
  invitedBy: "22222222-2222-4222-8222-222222222222",
  expiresAt: "2026-08-20T12:00:00.000Z",
  acceptedAt: null,
  revokedAt: null,
  createdAt: "2026-08-13T12:00:00.000Z",
};

function mockMembership(role: "owner" | "admin" | "member") {
  vi.mocked(useWorkspace).mockReturnValue({
    memberships: [],
    selectedMembership: {
      workspaceId: WORKSPACE_ID,
      workspaceName: "Augustine Test",
      workspaceType: "individual",
      role,
      currencyCode: "GHS",
      timezone: "Africa/Accra",
      status: "active",
    },
    selectedWorkspaceId: WORKSPACE_ID,
    workspaceScopeKey: 0,
    resolvingSelection: false,
    selectWorkspace: vi.fn(),
    refreshMemberships: vi.fn(),
  });
}

function mockInvitationHook(
  overrides: Partial<ReturnType<typeof useWorkspaceInvitations>> = {},
) {
  vi.mocked(useWorkspaceInvitations).mockReturnValue({
    invitations: [],
    loading: false,
    creating: false,
    revokingInvitationId: null,
    error: null,
    successMessage: null,
    refresh: mockRefresh,
    createInvitation: mockCreateInvitation,
    revokeInvitation: mockRevokeInvitation,
    clearMessages: mockClearMessages,
    ...overrides,
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("WorkspaceInvitations", () => {
  beforeEach(() => {
    mockCreateInvitation.mockResolvedValue({ error: null });
    mockRevokeInvitation.mockResolvedValue({ error: null });
    mockInvitationHook();
  });

  it("shows admin and member role choices for owners", () => {
    mockMembership("owner");

    render(<WorkspaceInvitations />);

    fireEvent.click(screen.getByRole("button", { name: "Invite member" }));

    expect(screen.getByLabelText(/Email address/i)).toBeTruthy();
    expect(screen.getByRole("radio", { name: /admin/i })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /member/i })).toBeTruthy();
  });

  it("shows only member role choice for admins", () => {
    mockMembership("admin");

    render(<WorkspaceInvitations />);

    fireEvent.click(screen.getByRole("button", { name: "Invite member" }));

    expect(screen.getByRole("radio", { name: /member/i })).toBeTruthy();
    expect(screen.queryByRole("radio", { name: /admin/i })).toBeNull();
  });

  it("does not render invitation controls for members", () => {
    mockMembership("member");

    render(<WorkspaceInvitations />);

    expect(screen.queryByRole("heading", { name: "Team invitations" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Invite member" })).toBeNull();
  });

  it("uses the active workspace id from context for the invitation hook", () => {
    mockMembership("owner");

    render(<WorkspaceInvitations />);

    expect(useWorkspaceInvitations).toHaveBeenCalledWith(WORKSPACE_ID);
  });

  it("shows delivery-pending success copy and never sent or token fields", async () => {
    mockMembership("owner");
    mockInvitationHook({
      successMessage: DELIVERY_PENDING_SUCCESS_MESSAGE,
    });

    render(<WorkspaceInvitations />);

    expect(screen.getByText(DELIVERY_PENDING_SUCCESS_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(/email sent/i)).toBeNull();
    expect(screen.queryByText(/raw_token/i)).toBeNull();
    expect(screen.queryByText(/token_hash/i)).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders safe list fields only", () => {
    mockMembership("owner");
    mockInvitationHook({ invitations: [sampleInvitation] });

    render(<WorkspaceInvitations />);

    expect(screen.getByText("person@example.com")).toBeTruthy();
    expect(screen.getByText("Member")).toBeTruthy();
    expect(screen.getByText("pending")).toBeTruthy();
    expect(screen.queryByText(/raw_token/i)).toBeNull();
  });

  it("requires confirmation before revoking a pending invitation", async () => {
    mockMembership("owner");
    mockInvitationHook({ invitations: [sampleInvitation] });

    render(<WorkspaceInvitations />);

    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));

    expect(screen.getByRole("alertdialog", { name: /Revoke invitation/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Revoke invitation" }));

    await waitFor(() => {
      expect(mockRevokeInvitation).toHaveBeenCalledWith(INVITATION_ID);
    });
  });

  it("shows safe server-side authorization errors", () => {
    mockMembership("owner");
    mockInvitationHook({
      error: "You do not have permission to manage invitations.",
    });

    render(<WorkspaceInvitations />);

    expect(
      screen.getByText("You do not have permission to manage invitations."),
    ).toBeTruthy();
  });

  it("does not reference IndexedDB or ledger records", () => {
    mockMembership("owner");

    render(<WorkspaceInvitations />);

    expect(screen.queryByText("Contacts")).toBeNull();
    expect(screen.queryByText("Dashboard")).toBeNull();
    expect(screen.queryByText("IndexedDB")).toBeNull();
  });
});
