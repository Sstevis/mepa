import { describe, expect, it } from "vitest";

import type { Contact, Obligation } from "@/types";
import {
  filterContactsByNameOrPhone,
  getEligiblePaymentContacts,
  getOutstandingObligationsForContact,
  isOutstandingObligation,
} from "@/lib/outstandingObligations";

const contactA: Contact = {
  id: "contact-a",
  name: "Kwame Mensah",
  phone: "+233244123456",
  type: "supplier",
  createdAt: 1,
};

const contactB: Contact = {
  id: "contact-b",
  name: "Ama Boateng",
  phone: "+233551237890",
  type: "customer",
  createdAt: 1,
};

const contactC: Contact = {
  id: "contact-c",
  name: "Kofi",
  phone: "+233209876543",
  type: "supplier",
  createdAt: 1,
};

function obligation(
  overrides: Partial<Obligation> & Pick<Obligation, "contactId" | "status" | "remainingAmount">,
): Obligation {
  return {
    id: overrides.id ?? `obl-${overrides.contactId}-${overrides.status}`,
    contactId: overrides.contactId,
    direction: overrides.direction ?? "they_owe_me",
    amount: overrides.amount ?? 1000,
    description: overrides.description ?? "Sample obligation",
    date: "2026-08-01",
    dueDate: "2026-08-20",
    status: overrides.status,
    remainingAmount: overrides.remainingAmount,
    createdAt: 1,
  };
}

describe("outstandingObligations", () => {
  it("treats open and partial obligations with remaining balance as outstanding", () => {
    expect(
      isOutstandingObligation(
        obligation({ contactId: contactA.id, status: "open", remainingAmount: 500 }),
      ),
    ).toBe(true);
    expect(
      isOutstandingObligation(
        obligation({ contactId: contactA.id, status: "partial", remainingAmount: 200 }),
      ),
    ).toBe(true);
  });

  it("excludes settled obligations and zero balances", () => {
    expect(
      isOutstandingObligation(
        obligation({ contactId: contactA.id, status: "settled", remainingAmount: 0 }),
      ),
    ).toBe(false);
    expect(
      isOutstandingObligation(
        obligation({ contactId: contactA.id, status: "open", remainingAmount: 0 }),
      ),
    ).toBe(false);
  });

  it("returns only contacts with outstanding obligations for Make Payment", () => {
    const obligations = [
      obligation({ contactId: contactA.id, status: "open", remainingAmount: 500 }),
      obligation({ contactId: contactB.id, status: "settled", remainingAmount: 0 }),
      obligation({ contactId: contactC.id, status: "partial", remainingAmount: 150 }),
    ];

    const eligible = getEligiblePaymentContacts(
      [contactA, contactB, contactC],
      obligations,
    );

    expect(eligible.map((contact) => contact.id)).toEqual([contactC.id, contactA.id]);
  });

  it("excludes contacts whose obligations are all settled", () => {
    const obligations = [
      obligation({ contactId: contactB.id, status: "settled", remainingAmount: 0 }),
    ];

    expect(getEligiblePaymentContacts([contactB], obligations)).toEqual([]);
  });

  it("returns only open/partial obligations with remaining balance for a contact", () => {
    const obligations = [
      obligation({
        id: "open-1",
        contactId: contactA.id,
        status: "open",
        remainingAmount: 800,
      }),
      obligation({
        id: "partial-1",
        contactId: contactA.id,
        status: "partial",
        remainingAmount: 300,
      }),
      obligation({
        id: "settled-1",
        contactId: contactA.id,
        status: "settled",
        remainingAmount: 0,
      }),
    ];

    expect(getOutstandingObligationsForContact(contactA.id, obligations)).toHaveLength(2);
  });

  it("filters eligible contacts by name or phone", () => {
    const eligible = [contactA, contactC];

    expect(filterContactsByNameOrPhone(eligible, "kwame")).toEqual([contactA]);
    expect(filterContactsByNameOrPhone(eligible, "0244123456")).toEqual([contactA]);
    expect(filterContactsByNameOrPhone(eligible, "kofi")).toEqual([contactC]);
  });
});
