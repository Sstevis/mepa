import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  addContact,
  addObligation,
  MepaDatabase,
  recordPayment,
} from "@/db";

describe("contact-detail payment flows remain valid", () => {
  let db: MepaDatabase;
  let databaseName: string;

  beforeEach(async () => {
    databaseName = `test-db-${crypto.randomUUID()}`;
    db = new MepaDatabase(databaseName);
    await db.open();
  });

  afterEach(async () => {
    await db.close();
    await Dexie.delete(databaseName);
  });

  it("records an exact payment that settles an obligation from contact detail flow", async () => {
    const contact = await addContact(db, {
      name: "Detail Contact",
      phone: "0244111222",
      type: "supplier",
    });

    const obligation = await addObligation(db, {
      contactId: contact.id,
      direction: "i_owe_them",
      amount: 800,
      description: "Settled from detail",
      date: "2026-08-01",
      dueDate: "2026-08-20",
    });

    await recordPayment(db, {
      obligationId: obligation.id,
      amount: 800,
      method: "cash",
      reference: "CASH001",
      date: "2026-08-12",
      note: "",
    });

    const updated = await db.obligations.get(obligation.id);
    expect(updated?.remainingAmount).toBe(0);
    expect(updated?.status).toBe("settled");
  });

  it("rejects overpayment from the shared recordPayment validation", async () => {
    const contact = await addContact(db, {
      name: "Detail Contact",
      phone: "0244222333",
      type: "customer",
    });

    const obligation = await addObligation(db, {
      contactId: contact.id,
      direction: "they_owe_me",
      amount: 500,
      description: "Overpay test",
      date: "2026-08-01",
      dueDate: "2026-08-20",
    });

    await expect(
      recordPayment(db, {
        obligationId: obligation.id,
        amount: 600,
        method: "momo",
        reference: "MOMO-OVER",
        date: "2026-08-12",
        note: "",
      }),
    ).rejects.toThrow("Payment amount cannot exceed the remaining balance");
  });
});
