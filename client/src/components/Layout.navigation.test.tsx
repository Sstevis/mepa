/**
 * @vitest-environment jsdom
 */
import { cleanup, render, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

import Layout from "@/components/Layout";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    signOut: vi.fn(),
  }),
}));

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspaceOptional: () => ({
    selectedMembership: {
      workspaceId: "ws-1",
      workspaceName: "Kwame Provisions",
      workspaceType: "individual",
      role: "owner",
      currencyCode: "GHS",
      timezone: "Africa/Accra",
      status: "active",
    },
  }),
}));

vi.mock("@/components/WorkspaceSwitcher", () => ({
  default: () => <div>Workspace switcher</div>,
}));

afterEach(() => {
  cleanup();
});

describe("Layout navigation", () => {
  it("contains Add Obligation, Make Payment, and Export Ledger actions in the sidebar menu", () => {
    const { hook } = memoryLocation({ path: "/" });

    render(
      <Router hook={hook}>
        <Layout title="Dashboard">
          <p>Dashboard body</p>
        </Layout>
      </Router>,
    );

    const sidebar = document.querySelector("aside");
    expect(sidebar).toBeTruthy();

    expect(
      within(sidebar!).getByRole("link", { name: "Add Obligation" }),
    ).toBeTruthy();
    expect(within(sidebar!).getByRole("link", { name: "Make Payment" })).toBeTruthy();
    expect(
      within(sidebar!).getByRole("link", { name: "Export Ledger" }),
    ).toBeTruthy();
    expect(
      within(sidebar!)
        .getByRole("link", { name: "Add Obligation" })
        .getAttribute("href"),
    ).toBe("/obligations/new");
    expect(
      within(sidebar!)
        .getByRole("link", { name: "Make Payment" })
        .getAttribute("href"),
    ).toBe("/payments/new");
    expect(
      within(sidebar!)
        .getByRole("link", { name: "Export Ledger" })
        .getAttribute("href"),
    ).toBe("/export");
  });
});
