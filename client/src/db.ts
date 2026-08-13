import Dexie, { type Table } from "dexie";
import type { Contact, Obligation, Payment } from "@/types";
import {
  computePaymentOutcome,
  validateObligationAmount,
  validatePaymentAgainstObligation,
  DomainValidationError,
} from "@/validation";
import {
  PhoneValidationError,
  validateAndNormalizeGhanaPhone,
} from "@/utils/ghanaPhone";

export class MepaDatabase extends Dexie {
  contacts!: Table<Contact, string>;
  obligations!: Table<Obligation, string>;
  payments!: Table<Payment, string>;

  constructor() {
    super("MepaLedger");
    this.version(1).stores({
      contacts: "id, name, phone, type, createdAt",
      obligations: "id, contactId, direction, status, date, dueDate, createdAt",
      payments: "id, obligationId, date, createdAt",
    });
  }
}

export const db = new MepaDatabase();

export async function addContact(
  data: Omit<Contact, "id" | "createdAt">,
): Promise<Contact> {
  let phone: string;
  try {
    phone = validateAndNormalizeGhanaPhone(data.phone);
  } catch (error) {
    if (error instanceof PhoneValidationError) {
      throw new DomainValidationError(error.message);
    }
    throw error;
  }

  const contact: Contact = {
    ...data,
    phone,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  await db.contacts.add(contact);
  return contact;
}

export async function addObligation(
  data: Omit<Obligation, "id" | "createdAt" | "status" | "remainingAmount">,
): Promise<Obligation> {
  validateObligationAmount(data.amount);

  const obligation: Obligation = {
    ...data,
    id: crypto.randomUUID(),
    status: "open",
    remainingAmount: data.amount,
    createdAt: Date.now(),
  };
  await db.obligations.add(obligation);
  return obligation;
}

export async function recordPayment(
  data: Omit<Payment, "id" | "createdAt">,
): Promise<Payment> {
  return db.transaction("rw", db.obligations, db.payments, async () => {
    const obligation = await db.obligations.get(data.obligationId);
    validatePaymentAgainstObligation(obligation, data.amount);

    const payment: Payment = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    const { remainingAmount, status } = computePaymentOutcome(
      obligation,
      payment.amount,
    );

    await db.payments.add(payment);
    await db.obligations.update(obligation.id, {
      remainingAmount,
      status,
    });

    return payment;
  });
}

export async function getPaymentsForObligation(
  obligationId: string,
): Promise<Payment[]> {
  return db.payments.where("obligationId").equals(obligationId).toArray();
}

export async function getObligationsForContact(
  contactId: string,
): Promise<Obligation[]> {
  return db.obligations.where("contactId").equals(contactId).toArray();
}

export interface ContactDeletionSummary {
  obligationCount: number;
  paymentCount: number;
}

/**
 * Deletion policy: cascade-delete all obligations and payments for the contact
 * inside a single IndexedDB transaction. If the transaction fails, no records
 * are removed.
 */
export async function getContactDeletionSummary(
  contactId: string,
): Promise<ContactDeletionSummary> {
  const obligations = await db.obligations
    .where("contactId")
    .equals(contactId)
    .toArray();
  const obligationIds = obligations.map((obligation) => obligation.id);

  const paymentCount =
    obligationIds.length === 0
      ? 0
      : await db.payments
          .where("obligationId")
          .anyOf(obligationIds)
          .count();

  return {
    obligationCount: obligations.length,
    paymentCount,
  };
}

export async function deleteContact(contactId: string): Promise<void> {
  await db.transaction("rw", db.contacts, db.obligations, db.payments, async () => {
    const contact = await db.contacts.get(contactId);
    if (!contact) {
      throw new Error("Cannot delete contact: contact not found.");
    }

    const obligations = await db.obligations
      .where("contactId")
      .equals(contactId)
      .toArray();
    const obligationIds = obligations.map((obligation) => obligation.id);

    if (obligationIds.length > 0) {
      await db.payments.where("obligationId").anyOf(obligationIds).delete();
      await db.obligations.where("contactId").equals(contactId).delete();
    }

    await db.contacts.delete(contactId);
  });
}
