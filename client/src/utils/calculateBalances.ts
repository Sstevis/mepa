import type {
  ContactBalance,
  GlobalBalance,
  Obligation,
  ObligationDirection,
} from "@/types";

function sumByDirection(
  obligations: Obligation[],
  direction: ObligationDirection,
): number {
  return obligations
    .filter((o) => o.direction === direction && o.status !== "settled")
    .reduce((sum, o) => sum + o.remainingAmount, 0);
}

export function calculateContactBalance(
  contactId: string,
  obligations: Obligation[],
): ContactBalance {
  const contactObligations = obligations.filter((o) => o.contactId === contactId);

  return {
    contactId,
    theyOweMe: sumByDirection(contactObligations, "they_owe_me"),
    iOweThem: sumByDirection(contactObligations, "i_owe_them"),
  };
}

export function calculateGlobalBalance(
  obligations: Obligation[],
): GlobalBalance {
  return {
    totalTheyOweMe: sumByDirection(obligations, "they_owe_me"),
    totalIOweThem: sumByDirection(obligations, "i_owe_them"),
  };
}

export function isOverdue(obligation: Obligation, today = new Date()): boolean {
  if (obligation.status === "settled") return false;
  const due = new Date(obligation.dueDate);
  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return due < todayDate;
}
