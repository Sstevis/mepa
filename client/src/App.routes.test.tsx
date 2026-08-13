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

vi.mock("@/hooks/useWorkspaceMemberships", () => ({
  useWorkspaceMemberships: vi.fn(),
}));

import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceMemberships } from "@/hooks/useWorkspaceMemberships";

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

function mockNoWorkspace() {
  vi.mocked(useWorkspaceMemberships).mockReturnValue({
    memberships: [],
    activeMembership: null,
    loading: false,
    creating: false,
    error: null,
    refresh: vi.fn(),
    createWorkspace: vi.fn(),
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("App route protection", () => {
  it("redirects unauthenticated users from protected routes to sign in", async () => {
    mockAuthState();
    mockNoWorkspace();

    renderAppAt("/contacts");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy();
    });
  });

  it("shows a loading state while auth initializes on protected routes", () => {
    mockAuthState({ loading: true });
    mockNoWorkspace();

    renderAppAt("/");

    expect(screen.getByLabelText("Loading authentication state")).toBeTruthy();
  });

  it("shows onboarding for authenticated users without a workspace", () => {
    mockAuthState({
      session: sampleSession,
      user: sampleUser,
      loading: false,
    });
    mockNoWorkspace();

    renderAppAt("/");

    expect(screen.queryByRole("heading", { name: "Sign in" })).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Set up your workspace" }),
    ).toBeTruthy();
  });

  it("does not render unscoped IndexedDB ledger data for signed-in users", () => {
    mockAuthState({
      session: sampleSession,
      user: sampleUser,
    });
    mockNoWorkspace();

    renderAppAt("/contacts");

    expect(
      screen.getByRole("heading", { name: "Set up your workspace" }),
    ).toBeTruthy();
    expect(screen.queryByText("Contacts")).toBeNull();
    expect(screen.queryByText("Kwame Mensah")).toBeNull();
    expect(screen.queryByText("Dashboard")).toBeNull();
  });

  it("keeps shared receipt verification public without auth", () => {
    mockAuthState();
    mockNoWorkspace();

    renderAppAt("/verify");

    expect(screen.queryByRole("heading", { name: "Sign in" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Verify Receipt" })).toBeTruthy();
  });
});
