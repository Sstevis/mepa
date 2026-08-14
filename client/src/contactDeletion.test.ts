import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  addContact,
  addObligation,
  deleteContact,
  getContactDeletionSummary,
  MepaDatabase,
  recordPayment,
} from "@/db";

describe("contact deletion", () => {
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

  it("deletes a contact with no related records", async () => {
    const contact = await addContact(db, {
      name: "Empty Contact",
      phone: "0244000000",
      type: "customer",
    });

    await deleteContact(db, contact.id);

    expect(await db.contacts.get(contact.id)).toBeUndefined();
    expect(await db.obligations.count()).toBe(0);
    expect(await db.payments.count()).toBe(0);
  });

  it("cascade-deletes related obligations and payments after confirmation flow", async () => {
    const contact = await addContact(db, {
      name: "Kwame",
      phone: "0244111222",
      type: "supplier",
    });

    const obligation = await addObligation(db, {
      contactId: contact.id,
      direction: "i_owe_them",
      amount: 1200,
      description: "Carton of rice",
      date: "2026-08-01",
      dueDate: "2026-08-24",
    });

    await recordPayment(db, {
      obligationId: obligation.id,
      amount: 500,
      method: "momo",
      reference: "MOMO123456",
      date: "2026-08-12",
      note: "",
    });

    const summary = await getContactDeletionSummary(db, contact.id);
    expect(summary.obligationCount).toBe(1);
    expect(summary.paymentCount).toBe(1);

    await deleteContact(db, contact.id);

    expect(await db.contacts.get(contact.id)).toBeUndefined();
    expect(await db.obligations.count()).toBe(0);
    expect(await db.payments.count()).toBe(0);
  });

  it("leaves all records unchanged when deletion fails", async () => {
    const contact = await addContact(db, {
      name: "Protected",
      phone: "0244333444",
      type: "customer",
    });

    const obligation = await addObligation(db, {
      contactId: contact.id,
      direction: "they_owe_me",
      amount: 800,
      description: "Cosmetics batch",
      date: "2026-08-01",
      dueDate: "2026-08-20",
    });

    const deleteSpy = vi
      .spyOn(db.contacts, "delete")
      .mockRejectedValueOnce(new Error("IndexedDB write failed"));

    await expect(deleteContact(db, contact.id)).rejects.toThrow(
      "IndexedDB write failed",
    );

    expect(await db.contacts.get(contact.id)).toBeDefined();
    expect(await db.obligations.get(obligation.id)).toBeDefined();

    deleteSpy.mockRestore();
  });

  it("does not affect other contacts or their records", async () => {
    const target = await addContact(db, {
      name: "Target",
      phone: "0244000001",
      type: "supplier",
    });
    const other = await addContact(db, {
      name: "Other",
      phone: "0244000002",
      type: "customer",
    });

    const targetObligation = await addObligation(db, {
      contactId: target.id,
      direction: "i_owe_them",
      amount: 1000,
      description: "Target stock",
      date: "2026-08-01",
      dueDate: "2026-08-20",
    });

    const otherObligation = await addObligation(db, {
      contactId: other.id,
      direction: "they_owe_me",
      amount: 500,
      description: "Other sale",
      date: "2026-08-01",
      dueDate: "2026-08-20",
    });

    await deleteContact(db, target.id);

    expect(await db.contacts.get(target.id)).toBeUndefined();
    expect(await db.obligations.get(targetObligation.id)).toBeUndefined();
    expect(await db.contacts.get(other.id)).toBeDefined();
    expect(await db.obligations.get(otherObligation.id)).toBeDefined();
  });

  it("throws for a missing contact without changing database counts", async () => {
    const contactsBefore = await db.contacts.count();
    const obligationsBefore = await db.obligations.count();
    const paymentsBefore = await db.payments.count();

    await expect(deleteContact(db, "missing-contact-id")).rejects.toThrow(
      "Cannot delete contact: contact not found.",
    );

    expect(await db.contacts.count()).toBe(contactsBefore);
    expect(await db.obligations.count()).toBe(obligationsBefore);
    expect(await db.payments.count()).toBe(paymentsBefore);
  });
});
