/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { Session, User } from "@supabase/supabase-js";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "@/App";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/contexts/AuthContext";

const sampleUser = { email: "trader@example.com" } as User;
const sampleSession = { user: sampleUser } as Session;

function renderAppAt(path: string) {
  const { hook } = memoryLocation({ path });

  return render(
    <Router hook={hook}>
      <App />
    </Router>,
  );
}

function mockAuthState(
  overrides: Partial<ReturnType<typeof useAuth>> = {},
) {
  vi.mocked(useAuth).mockReturnValue({
    session: null,
    user: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("App route protection", () => {
  it("redirects unauthenticated users from protected routes to sign in", async () => {
    mockAuthState();

    renderAppAt("/contacts");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy();
    });
  });

  it("shows a loading state while auth initializes on protected routes", () => {
    mockAuthState({ loading: true });

    renderAppAt("/");

    expect(screen.getByLabelText("Loading authentication state")).toBeTruthy();
  });

  it("does not redirect authenticated users to sign in during session init", () => {
    mockAuthState({
      session: sampleSession,
      user: sampleUser,
      loading: false,
    });

    renderAppAt("/");

    expect(screen.queryByRole("heading", { name: "Sign in" })).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Workspace setup pending" }),
    ).toBeTruthy();
  });

  it("keeps the workspace-pending boundary instead of unscoped ledger data", () => {
    mockAuthState({
      session: sampleSession,
      user: sampleUser,
    });

    renderAppAt("/contacts");

    expect(
      screen.getByRole("heading", { name: "Workspace setup pending" }),
    ).toBeTruthy();
    expect(screen.queryByText("Contacts")).toBeNull();
    expect(screen.queryByText("Kwame Mensah")).toBeNull();
    expect(
      screen.getByText(/Local browser ledger data from the prototype is not linked/),
    ).toBeTruthy();
  });

  it("keeps shared receipt verification public without auth", () => {
    mockAuthState();

    renderAppAt("/verify");

    expect(screen.queryByRole("heading", { name: "Sign in" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Verify Receipt" })).toBeTruthy();
  });
});
