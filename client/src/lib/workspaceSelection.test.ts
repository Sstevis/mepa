import { describe, expect, it } from "vitest";

import {
  isActiveWorkspaceMember,
  resolveSelectedWorkspaceId,
} from "@/lib/workspaceSelection";
import type { ActiveWorkspaceMembership } from "@/types/workspace";

const membershipA: ActiveWorkspaceMembership = {
  workspaceId: "ws-a",
  workspaceName: "Alpha Traders",
  workspaceType: "individual",
  role: "owner",
  currencyCode: "GHS",
  timezone: "Africa/Accra",
  status: "active",
};

const membershipB: ActiveWorkspaceMembership = {
  workspaceId: "ws-b",
  workspaceName: "Beta Supplies",
  workspaceType: "company",
  role: "member",
  currencyCode: "GHS",
  timezone: "Africa/Accra",
  status: "active",
};

describe("resolveSelectedWorkspaceId", () => {
  it("SW-01 selects the only active membership when none is stored", () => {
    expect(resolveSelectedWorkspaceId(null, [membershipA])).toBe("ws-a");
  });

  it("SW-02 keeps a stored workspace ID when it is still active", () => {
    expect(resolveSelectedWorkspaceId("ws-b", [membershipA, membershipB])).toBe(
      "ws-b",
    );
  });

  it("SW-03 discards an invalid stored workspace ID and falls back deterministically", () => {
    expect(
      resolveSelectedWorkspaceId("ws-unknown", [membershipA, membershipB]),
    ).toBe("ws-a");
  });

  it("returns null when there are no active memberships", () => {
    expect(resolveSelectedWorkspaceId("ws-a", [])).toBeNull();
  });
});

describe("isActiveWorkspaceMember", () => {
  it("SW-04 rejects workspace IDs that are not in the RLS membership list", () => {
    expect(isActiveWorkspaceMember("ws-attacker", [membershipA])).toBe(false);
    expect(isActiveWorkspaceMember("ws-a", [membershipA])).toBe(true);
  });
});
