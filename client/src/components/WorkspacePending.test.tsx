/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import WorkspacePending from "@/components/WorkspacePending";

const mockSignOut = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/contexts/AuthContext";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("WorkspacePending", () => {
  it("shows the safety boundary message and sign-out control", async () => {
    vi.mocked(useAuth).mockReturnValue({
      session: { user: { email: "trader@example.com" } } as never,
      user: { email: "trader@example.com" } as never,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: mockSignOut,
    });

    const user = userEvent.setup();
    render(<WorkspacePending />);

    expect(
      screen.getByRole("heading", { name: "Workspace setup pending" }),
    ).toBeTruthy();
    expect(screen.getByText("Signed in as")).toBeTruthy();
    expect(screen.getByText("trader@example.com")).toBeTruthy();
    expect(
      screen.getByText(/Local browser ledger data from the prototype is not linked/),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(mockSignOut).toHaveBeenCalled();
  });
});
