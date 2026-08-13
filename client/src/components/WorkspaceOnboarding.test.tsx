/**
 * @vitest-environment jsdom
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import WorkspaceOnboarding from "@/components/WorkspaceOnboarding";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/contexts/AuthContext";

const mockOnCreateWorkspace = vi.fn();
const mockSignOut = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("WorkspaceOnboarding", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      session: { user: { email: "trader@example.com" } } as never,
      user: { email: "trader@example.com" } as never,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: mockSignOut,
    });
    mockOnCreateWorkspace.mockResolvedValue({ error: null });
  });

  it("shows onboarding for a signed-in user", () => {
    render(
      <WorkspaceOnboarding creating={false} onCreateWorkspace={mockOnCreateWorkspace} />,
    );

    expect(
      screen.getByRole("heading", { name: "Set up your workspace" }),
    ).toBeTruthy();
  });

  it("submits individual and company enum values", async () => {
    render(
      <WorkspaceOnboarding creating={false} onCreateWorkspace={mockOnCreateWorkspace} />,
    );

    fireEvent.change(screen.getByLabelText("Workspace name"), {
      target: { value: "Kwame Provisions" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    await waitFor(() => {
      expect(mockOnCreateWorkspace).toHaveBeenCalledWith(
        "Kwame Provisions",
        "individual",
      );
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Company For a business/i }),
    );
    fireEvent.change(screen.getByLabelText("Workspace name"), {
      target: { value: "Ama Trading" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    await waitFor(() => {
      expect(mockOnCreateWorkspace).toHaveBeenLastCalledWith(
        "Ama Trading",
        "company",
      );
    });
  });

  it("rejects blank and too-long names before RPC", async () => {
    render(
      <WorkspaceOnboarding creating={false} onCreateWorkspace={mockOnCreateWorkspace} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));
    expect(screen.getByText("Workspace name is required.")).toBeTruthy();
    expect(mockOnCreateWorkspace).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Workspace name"), {
      target: { value: "a".repeat(121) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));
    expect(
      screen.getByText("Workspace name must be 120 characters or fewer."),
    ).toBeTruthy();
    expect(mockOnCreateWorkspace).not.toHaveBeenCalled();
  });

  it("disables submit while creating", () => {
    render(
      <WorkspaceOnboarding creating onCreateWorkspace={mockOnCreateWorkspace} />,
    );

    expect(
      screen.getByRole("button", { name: "Creating workspace…" }).hasAttribute(
        "disabled",
      ),
    ).toBe(true);
  });

  it("shows a safe RPC error and stays on onboarding", async () => {
    mockOnCreateWorkspace.mockResolvedValue({
      error: "Could not create the workspace. Please try again.",
    });

    render(
      <WorkspaceOnboarding creating={false} onCreateWorkspace={mockOnCreateWorkspace} />,
    );

    fireEvent.change(screen.getByLabelText("Workspace name"), {
      target: { value: "Kwame Provisions" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    await waitFor(() => {
      expect(
        screen.getByText("Could not create the workspace. Please try again."),
      ).toBeTruthy();
    });
    expect(
      screen.getByRole("heading", { name: "Set up your workspace" }),
    ).toBeTruthy();
  });

  it("supports sign out", () => {
    render(
      <WorkspaceOnboarding creating={false} onCreateWorkspace={mockOnCreateWorkspace} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(mockSignOut).toHaveBeenCalled();
  });
});
