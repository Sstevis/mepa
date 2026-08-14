import type { Contact, Obligation } from "@/types";
import { formatGhanaPhoneForDisplay } from "@/utils/ghanaPhone";

function contactMatchesSearch(contact: Contact, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  if (contact.name.toLowerCase().includes(normalizedQuery)) {
    return true;
  }

  const compactQuery = normalizedQuery.replace(/\s+/g, "");
  const phone = contact.phone.toLowerCase();

  if (phone.includes(compactQuery)) {
    return true;
  }

  if (phone.startsWith("+233")) {
    const localPhone = `0${phone.slice(4)}`;
    if (localPhone.includes(compactQuery)) {
      return true;
    }
  }

  try {
    const displayPhone = formatGhanaPhoneForDisplay(contact.phone)
      .toLowerCase()
      .replace(/\s+/g, "");
    if (displayPhone.includes(compactQuery)) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function isOutstandingObligation(obligation: Obligation): boolean {
  return (
    (obligation.status === "open" || obligation.status === "partial") &&
    obligation.remainingAmount > 0
  );
}

export function getOutstandingObligations(obligations: Obligation[]): Obligation[] {
  return obligations.filter(isOutstandingObligation);
}

export function getOutstandingObligationsForContact(
  contactId: string,
  obligations: Obligation[],
): Obligation[] {
  return obligations.filter(
    (obligation) =>
      obligation.contactId === contactId && isOutstandingObligation(obligation),
  );
}

export function getEligiblePaymentContacts(
  contacts: Contact[],
  obligations: Obligation[],
): Contact[] {
  const contactIds = new Set(
    getOutstandingObligations(obligations).map((obligation) => obligation.contactId),
  );

  return contacts
    .filter((contact) => contactIds.has(contact.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function filterContactsByNameOrPhone(
  contacts: Contact[],
  query: string,
): Contact[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return contacts;
  }

  return contacts.filter((contact) => contactMatchesSearch(contact, normalizedQuery));
}

export function formatObligationDirection(
  direction: Obligation["direction"],
): string {
  return direction === "i_owe_them" ? "I owe them" : "They owe me";
}
