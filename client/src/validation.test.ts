import { describe, expect, it } from "vitest";

import type { Obligation } from "@/types";
import {
  DomainValidationError,
  computePaymentOutcome,
  validateObligationAmount,
  validatePaymentAgainstObligation,
  validatePaymentAmount,
} from "@/validation";

const baseObligation = (
  overrides: Partial<Obligation> = {},
): Obligation => ({
  id: "obl-1",
  contactId: "contact-1",
  direction: "i_owe_them",
  amount: 2500,
  description: "Beverages (assorted)",
  date: "2026-08-01",
  dueDate: "2026-08-30",
  status: "open",
  remainingAmount: 2500,
  createdAt: 1,
  ...overrides,
});

describe("validateObligationAmount", () => {
  it("rejects negative obligation amounts", () => {
    expect(() => validateObligationAmount(-100)).toThrow(DomainValidationError);
    expect(() => validateObligationAmount(-100)).toThrow(
      "Obligation amount must be a finite number greater than zero.",
    );
  });

  it("rejects zero obligation amounts", () => {
    expect(() => validateObligationAmount(0)).toThrow(DomainValidationError);
  });
});

describe("validatePaymentAmount", () => {
  it("rejects negative payment amounts", () => {
    expect(() => validatePaymentAmount(-50)).toThrow(DomainValidationError);
    expect(() => validatePaymentAmount(-50)).toThrow(
      "Payment amount must be a finite number greater than zero.",
    );
  });

  it("rejects zero payment amounts", () => {
    expect(() => validatePaymentAmount(0)).toThrow(DomainValidationError);
  });
});

describe("validatePaymentAgainstObligation", () => {
  it("rejects payment for a missing obligation", () => {
    expect(() => validatePaymentAgainstObligation(undefined, 100)).toThrow(
      DomainValidationError,
    );
    expect(() => validatePaymentAgainstObligation(undefined, 100)).toThrow(
      "Cannot record payment: obligation not found.",
    );
  });

  it("rejects overpayment", () => {
    const obligation = baseObligation({ remainingAmount: 1500 });
    expect(() => validatePaymentAgainstObligation(obligation, 2000)).toThrow(
      DomainValidationError,
    );
    expect(() => validatePaymentAgainstObligation(obligation, 2000)).toThrow(
      "Payment amount cannot exceed the remaining balance of 1500.00.",
    );
  });

  it("rejects payment against an already-settled obligation", () => {
    const obligation = baseObligation({
      status: "settled",
      remainingAmount: 0,
    });
    expect(() => validatePaymentAgainstObligation(obligation, 100)).toThrow(
      "Cannot record payment: obligation is already settled.",
    );
  });
});

describe("computePaymentOutcome", () => {
  it("applies a valid partial payment", () => {
    const obligation = baseObligation();
    const outcome = computePaymentOutcome(obligation, 1000);

    expect(outcome.remainingAmount).toBe(1500);
    expect(outcome.status).toBe("partial");
  });

  it("applies an exact payment that settles an obligation", () => {
    const obligation = baseObligation({ remainingAmount: 1500, status: "partial" });
    const outcome = computePaymentOutcome(obligation, 1500);

    expect(outcome.remainingAmount).toBe(0);
    expect(outcome.status).toBe("settled");
  });

  it("keeps remaining balance and status correct after valid payments", () => {
    let obligation = baseObligation();

    const first = computePaymentOutcome(obligation, 1000);
    obligation = { ...obligation, ...first };
    expect(obligation.remainingAmount).toBe(1500);
    expect(obligation.status).toBe("partial");

    const second = computePaymentOutcome(obligation, 1500);
    obligation = { ...obligation, ...second };
    expect(obligation.remainingAmount).toBe(0);
    expect(obligation.status).toBe("settled");
  });
});
