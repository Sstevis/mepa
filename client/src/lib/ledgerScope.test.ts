import { describe, expect, it } from "vitest";

import {
  buildLedgerScopeKey,
  buildScopedLedgerDatabaseName,
  sanitizeScopeSegment,
} from "@/lib/ledgerScope";

describe("ledgerScope", () => {
  const userA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const userB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const workspaceOne = "11111111-1111-1111-1111-111111111111";
  const workspaceTwo = "22222222-2222-2222-2222-222222222222";

  it("sanitizes unsafe characters in scope segments", () => {
    expect(sanitizeScopeSegment(" user/id? ")).toBe("user_id_");
  });

  it("produces different scope keys for different users and workspaces", () => {
    const keyA = buildLedgerScopeKey(userA, workspaceOne);
    const keyB = buildLedgerScopeKey(userB, workspaceOne);
    const keyC = buildLedgerScopeKey(userA, workspaceTwo);

    expect(keyA).not.toBe(keyB);
    expect(keyA).not.toBe(keyC);
    expect(keyB).not.toBe(keyC);
  });

  it("produces the same scope key for the same user and workspace", () => {
    expect(buildLedgerScopeKey(userA, workspaceOne)).toBe(
      buildLedgerScopeKey(userA, workspaceOne),
    );
  });

  it("builds deterministic scoped database names without email", () => {
    const name = buildScopedLedgerDatabaseName(userA, workspaceOne);

    expect(name).toBe(
      "MepaLedger__user_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa__workspace_11111111-1111-1111-1111-111111111111",
    );
    expect(name).not.toContain("@");
  });

  it("builds different database names for different scopes", () => {
    const nameA = buildScopedLedgerDatabaseName(userA, workspaceOne);
    const nameB = buildScopedLedgerDatabaseName(userB, workspaceOne);

    expect(nameA).not.toBe(nameB);
  });
});
