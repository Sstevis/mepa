/**
 * @vitest-environment jsdom
 */
import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session, User } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import AuthPage from "@/components/AuthPage";

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/contexts/AuthContext";

const sampleUser = { email: "trader@example.com" } as User;
const sampleSession = { user: sampleUser } as Session;

function mockAuthState(
  overrides: Partial<ReturnType<typeof useAuth>> = {},
) {
  vi.mocked(useAuth).mockReturnValue({
    session: null,
    user: null,
    loading: false,
    signIn: mockSignIn,
    signUp: mockSignUp,
    signOut: vi.fn(),
    ...overrides,
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AuthPage", () => {
  it("validates missing email and weak sign-up passwords", async () => {
    mockAuthState();
    const user = userEvent.setup();

    render(<AuthPage />);

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText("Email is required.")).toBeTruthy();
    expect(screen.getByText("Password is required.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(
      screen.getByText("Password must be at least 8 characters."),
    ).toBeTruthy();
  });

  it("shows sign-in errors from Supabase without leaking provider details", async () => {
    mockAuthState();
    mockSignIn.mockResolvedValue({
      error: "Invalid email or password.",
    });
    const user = userEvent.setup();

    render(<AuthPage />);

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password.")).toBeTruthy();
    });
  });

  it("shows email confirmation guidance after sign-up", async () => {
    mockAuthState();
    mockSignUp.mockResolvedValue({
      error: null,
      confirmationRequired: true,
    });
    const user = userEvent.setup();

    render(<AuthPage />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Account created. Check your email and confirm your address before signing in.",
        ),
      ).toBeTruthy();
    });
  });

  it("redirects authenticated users away from the auth page", () => {
    mockAuthState({
      session: sampleSession,
      user: sampleUser,
    });

    render(<AuthPage />);

    expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
  });
});
