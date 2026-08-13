import { describe, expect, it } from "vitest";

import {
  canInviteAdmins,
  canInviteMembers,
  isOwnerOrAdmin,
} from "@/lib/workspaceRoles";

describe("workspaceRoles", () => {
  it("allows owners and admins to invite members", () => {
    expect(canInviteMembers("owner")).toBe(true);
    expect(canInviteMembers("admin")).toBe(true);
    expect(canInviteMembers("member")).toBe(false);
  });

  it("allows only owners to invite admins", () => {
    expect(canInviteAdmins("owner")).toBe(true);
    expect(canInviteAdmins("admin")).toBe(false);
    expect(canInviteAdmins("member")).toBe(false);
  });

  it("treats owner and admin as management roles", () => {
    expect(isOwnerOrAdmin("owner")).toBe(true);
    expect(isOwnerOrAdmin("admin")).toBe(true);
    expect(isOwnerOrAdmin("member")).toBe(false);
  });
});
