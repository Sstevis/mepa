import { LEGACY_LEDGER_DATABASE_NAME, MepaDatabase } from "@/db";
import type { Contact, Obligation, Payment } from "@/types";

const SEED_CREATED = Date.now();

/**
 * Legacy-only demo seed for the unscoped `MepaLedger` database.
 * Authenticated routes use scoped databases and must not call this.
 */
export async function seedDatabase(): Promise<void> {
  const db = new MepaDatabase(LEGACY_LEDGER_DATABASE_NAME);
  const count = await db.contacts.count();
  if (count > 0) return;

  const kwame: Contact = {
    id: "seed-contact-kwame",
    name: "Kwame",
    phone: "024 412 3456",
    type: "supplier",
    createdAt: SEED_CREATED,
  };

  const ama: Contact = {
    id: "seed-contact-ama",
    name: "Ama",
    phone: "055 123 7890",
    type: "customer",
    createdAt: SEED_CREATED,
  };

  const kofi: Contact = {
    id: "seed-contact-kofi",
    name: "Kofi",
    phone: "020 987 6543",
    type: "supplier",
    createdAt: SEED_CREATED,
  };

  const esi: Contact = {
    id: "seed-contact-esi",
    name: "Esi",
    phone: "0244555666",
    type: "customer",
    createdAt: SEED_CREATED,
  };

  const kwameObligation: Obligation = {
    id: "seed-obl-kwame",
    contactId: kwame.id,
    direction: "i_owe_them",
    amount: 1200,
    description: "Carton of rice",
    date: "2026-08-01",
    dueDate: "2026-08-24",
    status: "partial",
    remainingAmount: 700,
    createdAt: SEED_CREATED,
  };

  const amaObligation: Obligation = {
    id: "seed-obl-ama",
    contactId: ama.id,
    direction: "they_owe_me",
    amount: 800,
    description: "Cosmetics batch",
    date: "2026-08-01",
    dueDate: "2026-08-20",
    status: "settled",
    remainingAmount: 0,
    createdAt: SEED_CREATED,
  };

  const kofiObligation: Obligation = {
    id: "seed-obl-kofi",
    contactId: kofi.id,
    direction: "i_owe_them",
    amount: 2500,
    description: "Beverages (assorted)",
    date: "2026-08-01",
    dueDate: "2026-08-30",
    status: "open",
    remainingAmount: 2500,
    createdAt: SEED_CREATED,
  };

  const esiObligation: Obligation = {
    id: "seed-obl-esi",
    contactId: esi.id,
    direction: "they_owe_me",
    amount: 1500,
    description: "Fabric materials",
    date: "2026-08-01",
    dueDate: "2026-08-25",
    status: "open",
    remainingAmount: 1500,
    createdAt: SEED_CREATED,
  };

  const kwamePayment: Payment = {
    id: "seed-pay-kwame",
    obligationId: kwameObligation.id,
    amount: 500,
    method: "momo",
    reference: "MOMO123456",
    date: "2026-08-12",
    note: "",
    createdAt: SEED_CREATED,
  };

  const amaPayment: Payment = {
    id: "seed-pay-ama",
    obligationId: amaObligation.id,
    amount: 800,
    method: "cash",
    reference: "CASH001",
    date: "2026-08-11",
    note: "",
    createdAt: SEED_CREATED,
  };

  await db.transaction(
    "rw",
    db.contacts,
    db.obligations,
    db.payments,
    async () => {
      await db.contacts.bulkAdd([kwame, ama, kofi, esi]);
      await db.obligations.bulkAdd([
        kwameObligation,
        amaObligation,
        kofiObligation,
        esiObligation,
      ]);
      await db.payments.bulkAdd([kwamePayment, amaPayment]);
    },
  );
}
