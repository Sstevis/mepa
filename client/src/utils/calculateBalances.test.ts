import { describe, expect, it } from "vitest";
import {
  calculateContactBalance,
  calculateGlobalBalance,
  isOverdue,
} from "./calculateBalances";
import type { Obligation } from "@/types";

const baseObligation = (
  overrides: Partial<Obligation> = {},
): Obligation => ({
  id: "1",
  contactId: "c1",
  direction: "they_owe_me",
  amount: 100,
  description: "Test",
  date: "2026-01-01",
  dueDate: "2026-02-01",
  status: "open",
  remainingAmount: 100,
  createdAt: 1,
  ...overrides,
});

describe("calculateBalances", () => {
  it("sums they_owe_me and i_owe_them per contact", () => {
    const obligations = [
      baseObligation({
        direction: "they_owe_me",
        remainingAmount: 800,
      }),
      baseObligation({
        id: "2",
        direction: "i_owe_them",
        remainingAmount: 700,
      }),
    ];

    const balance = calculateContactBalance("c1", obligations);
    expect(balance.theyOweMe).toBe(800);
    expect(balance.iOweThem).toBe(700);
  });

  it("excludes settled obligations from totals", () => {
    const obligations = [
      baseObligation({ status: "settled", remainingAmount: 0 }),
      baseObligation({
        id: "2",
        direction: "i_owe_them",
        remainingAmount: 500,
      }),
    ];

    const global = calculateGlobalBalance(obligations);
    expect(global.totalTheyOweMe).toBe(0);
    expect(global.totalIOweThem).toBe(500);
  });

  it("detects overdue open obligations", () => {
    const obligation = baseObligation({
      dueDate: "2020-01-01",
      status: "open",
    });
    expect(isOverdue(obligation, new Date("2026-08-12"))).toBe(true);
  });
});
