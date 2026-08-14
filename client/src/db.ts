import Dexie, { type Table } from "dexie";
import type { Contact, Obligation, Payment } from "@/types";
import {
  buildScopedLedgerDatabaseName,
  LEGACY_LEDGER_DATABASE_NAME,
} from "@/lib/ledgerScope";
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

/** Legacy unscoped database name — preserved; authenticated routes use scoped databases only. */
export { LEGACY_LEDGER_DATABASE_NAME };

export class MepaDatabase extends Dexie {
  contacts!: Table<Contact, string>;
  obligations!: Table<Obligation, string>;
  payments!: Table<Payment, string>;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores({
      contacts: "id, name, phone, type, createdAt",
      obligations: "id, contactId, direction, status, date, dueDate, createdAt",
      payments: "id, obligationId, date, createdAt",
    });
  }
}

const scopedInstances = new Map<string, MepaDatabase>();

export function getScopedLedgerDatabase(
  userId: string,
  workspaceId: string,
): MepaDatabase {
  const databaseName = buildScopedLedgerDatabaseName(userId, workspaceId);
  const existing = scopedInstances.get(databaseName);

  if (existing && !existing.isOpen()) {
    scopedInstances.delete(databaseName);
  }

  let instance = scopedInstances.get(databaseName);
  if (!instance) {
    instance = new MepaDatabase(databaseName);
    scopedInstances.set(databaseName, instance);
  }

  return instance;
}

export async function releaseScopedLedgerDatabase(
  userId: string,
  workspaceId: string,
): Promise<void> {
  const databaseName = buildScopedLedgerDatabaseName(userId, workspaceId);
  const instance = scopedInstances.get(databaseName);

  if (!instance) {
    return;
  }

  if (instance.isOpen()) {
    await instance.close();
  }

  scopedInstances.delete(databaseName);
}

export async function addContact(
  db: MepaDatabase,
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
  db: MepaDatabase,
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
  db: MepaDatabase,
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
  db: MepaDatabase,
  obligationId: string,
): Promise<Payment[]> {
  return db.payments.where("obligationId").equals(obligationId).toArray();
}

export async function getObligationsForContact(
  db: MepaDatabase,
  contactId: string,
): Promise<Obligation[]> {
  return db.obligations.where("contactId").equals(contactId).toArray();
}

export interface ContactDeletionSummary {
  obligationCount: number;
  paymentCount: number;
}

export async function getContactDeletionSummary(
  db: MepaDatabase,
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

export async function deleteContact(
  db: MepaDatabase,
  contactId: string,
): Promise<void> {
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
