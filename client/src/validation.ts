import type { Obligation } from "@/types";

export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainValidationError";
  }
}

export function validateObligationAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new DomainValidationError(
      "Obligation amount must be a finite number greater than zero.",
    );
  }
}

export function validatePaymentAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new DomainValidationError(
      "Payment amount must be a finite number greater than zero.",
    );
  }
}

export function validatePaymentAgainstObligation(
  obligation: Obligation | undefined,
  paymentAmount: number,
): asserts obligation is Obligation {
  validatePaymentAmount(paymentAmount);

  if (!obligation) {
    throw new DomainValidationError(
      "Cannot record payment: obligation not found.",
    );
  }

  if (obligation.status === "settled") {
    throw new DomainValidationError(
      "Cannot record payment: obligation is already settled.",
    );
  }

  if (paymentAmount > obligation.remainingAmount) {
    throw new DomainValidationError(
      `Payment amount cannot exceed the remaining balance of ${obligation.remainingAmount.toFixed(2)}.`,
    );
  }
}

export function computePaymentOutcome(
  obligation: Obligation,
  paymentAmount: number,
): { remainingAmount: number; status: Obligation["status"] } {
  const remaining = obligation.remainingAmount - paymentAmount;

  if (remaining <= 0) {
    return { remainingAmount: 0, status: "settled" };
  }

  if (remaining < obligation.amount) {
    return { remainingAmount: remaining, status: "partial" };
  }

  return { remainingAmount: remaining, status: "open" };
}
