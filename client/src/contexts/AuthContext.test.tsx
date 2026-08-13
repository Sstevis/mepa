/**
 * @vitest-environment jsdom
 */
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getAuthEmailRedirectUrl } from "@/lib/authErrors";

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
    },
  }),
  resetSupabaseClientForTests: vi.fn(),
}));

function AuthProbe() {
  const { session, user, loading, signIn, signUp, signOut } = useAuth();

  return (
    <div>
      <p data-testid="loading">{loading ? "yes" : "no"}</p>
      <p data-testid="session">{session ? "signed-in" : "signed-out"}</p>
      <p data-testid="email">{user?.email ?? "none"}</p>
      <button
        type="button"
        onClick={() => {
          void signIn("user@example.com", "password123");
        }}
      >
        Sign in
      </button>
      <button
        type="button"
        onClick={() => {
          void signUp("user@example.com", "password123");
        }}
      >
        Sign up
      </button>
      <button
        type="button"
        onClick={() => {
          void signOut();
        }}
      >
        Sign out
      </button>
    </div>
  );
}

const sampleUser = { email: "user@example.com" } as User;
const sampleSession = { user: sampleUser } as Session;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockOnAuthStateChange.mockReturnValue({
    data: {
      subscription: {
        unsubscribe: vi.fn(),
      },
    },
  });
});

describe("AuthProvider", () => {
  it("starts loading and resolves to a signed-out session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByTestId("loading").textContent).toBe("yes");

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("no");
    });

    expect(screen.getByTestId("session").textContent).toBe("signed-out");
    expect(mockOnAuthStateChange).toHaveBeenCalled();
  });

  it("exposes a signed-in user from the initial session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: sampleSession } });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("session").textContent).toBe("signed-in");
    });

    expect(screen.getByTestId("email").textContent).toBe("user@example.com");
  });

  it("handles sign-in success and error responses", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInWithPassword
      .mockResolvedValueOnce({
        error: { message: "Invalid login credentials" },
      })
      .mockResolvedValueOnce({ error: null });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("no");
    });

    await act(async () => {
      screen.getByRole("button", { name: "Sign in" }).click();
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123",
    });

    await act(async () => {
      screen.getByRole("button", { name: "Sign in" }).click();
    });

    expect(mockSignInWithPassword).toHaveBeenCalledTimes(2);
  });

  it("handles sign-up with email confirmation required", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignUp.mockResolvedValue({
      data: { session: null, user: sampleUser },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("no");
    });

    await act(async () => {
      screen.getByRole("button", { name: "Sign up" }).click();
    });

    expect(mockSignUp).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123",
      options: {
        emailRedirectTo: getAuthEmailRedirectUrl(window.location.origin),
      },
    });
  });

  it("maps sign-up errors safely and logs only non-sensitive diagnostics", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignUp.mockResolvedValue({
      data: { session: null, user: null },
      error: {
        code: "validation_failed",
        status: 400,
        message: "redirect_to url is not allowed",
      },
    });

    function SignUpProbe() {
      const { signUp } = useAuth();
      const [message, setMessage] = useState<string | null>(null);

      return (
        <div>
          <button
            type="button"
            onClick={() => {
              void signUp("user@example.com", "password123").then((result) => {
                setMessage(result.error);
              });
            }}
          >
            Sign up
          </button>
          {message && <p data-testid="error">{message}</p>}
        </div>
      );
    }

    render(
      <AuthProvider>
        <SignUpProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign up" })).toBeTruthy();
    });

    await act(async () => {
      screen.getByRole("button", { name: "Sign up" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("error").textContent).toContain(
        "Email confirmation redirect URL is not allowed",
      );
    });

    expect(consoleError).toHaveBeenCalledWith("[Mepa Auth] signUp", {
      code: "validation_failed",
      status: 400,
      message: "redirect_to url is not allowed",
    });

    const loggedPayload = JSON.stringify(consoleError.mock.calls[0]);
    expect(loggedPayload).not.toMatch(/password|token|secret|VITE_/i);
    consoleError.mockRestore();
  });

  it("calls signOut through Supabase auth", async () => {
    mockGetSession.mockResolvedValue({ data: { session: sampleSession } });
    mockSignOut.mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("session").textContent).toBe("signed-in");
    });

    await act(async () => {
      screen.getByRole("button", { name: "Sign out" }).click();
    });

    expect(mockSignOut).toHaveBeenCalled();
  });
});
