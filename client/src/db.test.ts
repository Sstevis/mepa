import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";

import { addObligation, db, recordPayment } from "@/db";
import { DomainValidationError } from "@/validation";

describe("db domain validation", () => {
  beforeEach(async () => {
    await db.payments.clear();
    await db.obligations.clear();
    await db.contacts.clear();
  });

  it("records a valid partial payment and updates obligation state", async () => {
    const obligation = await addObligation({
      contactId: "seed-contact-kofi",
      direction: "i_owe_them",
      amount: 2500,
      description: "Beverages (assorted)",
      date: "2026-08-01",
      dueDate: "2026-08-30",
    });

    await recordPayment({
      obligationId: obligation.id,
      amount: 1000,
      method: "momo",
      reference: "MOMO999",
      date: "2026-08-12",
      note: "",
    });

    const updated = await db.obligations.get(obligation.id);
    expect(updated?.remainingAmount).toBe(1500);
    expect(updated?.status).toBe("partial");
  });

  it("records an exact payment that settles an obligation", async () => {
    const obligation = await addObligation({
      contactId: "seed-contact-kofi",
      direction: "i_owe_them",
      amount: 2500,
      description: "Beverages (assorted)",
      date: "2026-08-01",
      dueDate: "2026-08-30",
    });

    await recordPayment({
      obligationId: obligation.id,
      amount: 2500,
      method: "cash",
      reference: "CASH999",
      date: "2026-08-12",
      note: "",
    });

    const updated = await db.obligations.get(obligation.id);
    expect(updated?.remainingAmount).toBe(0);
    expect(updated?.status).toBe("settled");
  });

  it("rejects negative obligation amounts", async () => {
    await expect(
      addObligation({
        contactId: "contact-1",
        direction: "i_owe_them",
        amount: -100,
        description: "Invalid",
        date: "2026-08-01",
        dueDate: "2026-08-30",
      }),
    ).rejects.toThrow(DomainValidationError);
  });

  it("rejects zero obligation amounts", async () => {
    await expect(
      addObligation({
        contactId: "contact-1",
        direction: "i_owe_them",
        amount: 0,
        description: "Invalid",
        date: "2026-08-01",
        dueDate: "2026-08-30",
      }),
    ).rejects.toThrow(DomainValidationError);
  });

  it("rejects negative payment amounts", async () => {
    const obligation = await addObligation({
      contactId: "contact-1",
      direction: "i_owe_them",
      amount: 2500,
      description: "Beverages",
      date: "2026-08-01",
      dueDate: "2026-08-30",
    });

    await expect(
      recordPayment({
        obligationId: obligation.id,
        amount: -100,
        method: "cash",
        reference: "",
        date: "2026-08-12",
        note: "",
      }),
    ).rejects.toThrow(DomainValidationError);
  });

  it("rejects zero payment amounts", async () => {
    const obligation = await addObligation({
      contactId: "contact-1",
      direction: "i_owe_them",
      amount: 2500,
      description: "Beverages",
      date: "2026-08-01",
      dueDate: "2026-08-30",
    });

    await expect(
      recordPayment({
        obligationId: obligation.id,
        amount: 0,
        method: "cash",
        reference: "",
        date: "2026-08-12",
        note: "",
      }),
    ).rejects.toThrow(DomainValidationError);
  });

  it("rejects overpayment", async () => {
    const obligation = await addObligation({
      contactId: "contact-1",
      direction: "i_owe_them",
      amount: 2500,
      description: "Beverages",
      date: "2026-08-01",
      dueDate: "2026-08-30",
    });

    await expect(
      recordPayment({
        obligationId: obligation.id,
        amount: 2600,
        method: "momo",
        reference: "MOMO-OVER",
        date: "2026-08-12",
        note: "",
      }),
    ).rejects.toThrow("Payment amount cannot exceed the remaining balance");
  });

  it("rejects payment for a missing obligation", async () => {
    await expect(
      recordPayment({
        obligationId: "missing-obligation-id",
        amount: 100,
        method: "cash",
        reference: "",
        date: "2026-08-12",
        note: "",
      }),
    ).rejects.toThrow("Cannot record payment: obligation not found.");
  });

  it("rejects payment against an already-settled obligation", async () => {
    const obligation = await addObligation({
      contactId: "contact-1",
      direction: "i_owe_them",
      amount: 800,
      description: "Settled item",
      date: "2026-08-01",
      dueDate: "2026-08-20",
    });

    await recordPayment({
      obligationId: obligation.id,
      amount: 800,
      method: "cash",
      reference: "CASH001",
      date: "2026-08-11",
      note: "",
    });

    await expect(
      recordPayment({
        obligationId: obligation.id,
        amount: 100,
        method: "cash",
        reference: "CASH002",
        date: "2026-08-12",
        note: "",
      }),
    ).rejects.toThrow("Cannot record payment: obligation is already settled.");
  });

  it("keeps remaining balance and status correct after sequential valid payments", async () => {
    const obligation = await addObligation({
      contactId: "seed-contact-kofi",
      direction: "i_owe_them",
      amount: 2500,
      description: "Beverages (assorted)",
      date: "2026-08-01",
      dueDate: "2026-08-30",
    });

    await recordPayment({
      obligationId: obligation.id,
      amount: 1000,
      method: "momo",
      reference: "MOMO1000",
      date: "2026-08-12",
      note: "",
    });

    let updated = await db.obligations.get(obligation.id);
    expect(updated?.remainingAmount).toBe(1500);
    expect(updated?.status).toBe("partial");

    await recordPayment({
      obligationId: obligation.id,
      amount: 1500,
      method: "momo",
      reference: "MOMO1500",
      date: "2026-08-13",
      note: "",
    });

    updated = await db.obligations.get(obligation.id);
    expect(updated?.remainingAmount).toBe(0);
    expect(updated?.status).toBe("settled");
  });
});
