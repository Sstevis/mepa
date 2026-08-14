import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import {
  addContact,
  addObligation,
  getScopedLedgerDatabase,
  MepaDatabase,
  recordPayment,
  releaseScopedLedgerDatabase,
} from "@/db";
import { buildLedgerExportRows } from "@/lib/ledgerExport";
import {
  buildScopedLedgerDatabaseName,
  LEGACY_LEDGER_DATABASE_NAME,
} from "@/lib/ledgerScope";
import { seedDatabase } from "@/seed";

const USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const WORKSPACE_ONE = "11111111-1111-1111-1111-111111111111";
const WORKSPACE_TWO = "22222222-2222-2222-2222-222222222222";

async function deleteDatabase(name: string): Promise<void> {
  await Dexie.delete(name);
}

afterEach(async () => {
  await Promise.all([
    releaseScopedLedgerDatabase(USER_A, WORKSPACE_ONE),
    releaseScopedLedgerDatabase(USER_A, WORKSPACE_TWO),
    releaseScopedLedgerDatabase(USER_B, WORKSPACE_ONE),
    deleteDatabase(buildScopedLedgerDatabaseName(USER_A, WORKSPACE_ONE)),
    deleteDatabase(buildScopedLedgerDatabaseName(USER_A, WORKSPACE_TWO)),
    deleteDatabase(buildScopedLedgerDatabaseName(USER_B, WORKSPACE_ONE)),
    deleteDatabase(LEGACY_LEDGER_DATABASE_NAME),
  ]);
});

describe("ledger isolation", () => {
  it("does not return contacts from another scope", async () => {
    const dbA = getScopedLedgerDatabase(USER_A, WORKSPACE_ONE);
    const dbB = getScopedLedgerDatabase(USER_B, WORKSPACE_ONE);

    await addContact(dbA, {
      name: "Scope A Contact",
      phone: "0244000001",
      type: "supplier",
    });

    expect(await dbA.contacts.count()).toBe(1);
    expect(await dbB.contacts.count()).toBe(0);
  });

  it("does not return obligations or payments from another scope", async () => {
    const dbA = getScopedLedgerDatabase(USER_A, WORKSPACE_ONE);
    const dbB = getScopedLedgerDatabase(USER_B, WORKSPACE_ONE);

    const contact = await addContact(dbA, {
      name: "Scope A Contact",
      phone: "0244000002",
      type: "customer",
    });

    const obligation = await addObligation(dbA, {
      contactId: contact.id,
      direction: "they_owe_me",
      amount: 500,
      description: "Scope A sale",
      date: "2026-08-01",
      dueDate: "2026-08-20",
    });

    await recordPayment(dbA, {
      obligationId: obligation.id,
      amount: 200,
      method: "cash",
      reference: "CASH-A",
      date: "2026-08-12",
      note: "",
    });

    expect(await dbA.obligations.count()).toBe(1);
    expect(await dbA.payments.count()).toBe(1);
    expect(await dbB.obligations.count()).toBe(0);
    expect(await dbB.payments.count()).toBe(0);
  });

  it("exports only records from the active scope", async () => {
    const dbA = getScopedLedgerDatabase(USER_A, WORKSPACE_ONE);
    const dbB = getScopedLedgerDatabase(USER_B, WORKSPACE_ONE);

    const contact = await addContact(dbA, {
      name: "Export Scope A",
      phone: "0244000003",
      type: "supplier",
    });

    const obligation = await addObligation(dbA, {
      contactId: contact.id,
      direction: "i_owe_them",
      amount: 900,
      description: "Scope A stock",
      date: "2026-08-01",
      dueDate: "2026-08-25",
    });

    await recordPayment(dbA, {
      obligationId: obligation.id,
      amount: 300,
      method: "momo",
      reference: "MOMO-A",
      date: "2026-08-12",
      note: "",
    });

    const scopeBContacts = await dbB.contacts.toArray();
    const scopeBObligations = await dbB.obligations.toArray();
    const scopeBPayments = await dbB.payments.toArray();
    const rows = buildLedgerExportRows(
      scopeBContacts,
      scopeBObligations,
      scopeBPayments,
    );

    expect(rows).toHaveLength(0);
  });

  it("uses a different database when the workspace changes", async () => {
    const dbWorkspaceOne = getScopedLedgerDatabase(USER_A, WORKSPACE_ONE);
    const dbWorkspaceTwo = getScopedLedgerDatabase(USER_A, WORKSPACE_TWO);

    expect(dbWorkspaceOne.name).not.toBe(dbWorkspaceTwo.name);

    await addContact(dbWorkspaceOne, {
      name: "Workspace One Contact",
      phone: "0244000004",
      type: "customer",
    });

    expect(await dbWorkspaceOne.contacts.count()).toBe(1);
    expect(await dbWorkspaceTwo.contacts.count()).toBe(0);
  });

  it("releases the previous account client on sign-out transition", async () => {
    const dbUserA = getScopedLedgerDatabase(USER_A, WORKSPACE_ONE);

    await addContact(dbUserA, {
      name: "User A Contact",
      phone: "0244000005",
      type: "supplier",
    });

    await releaseScopedLedgerDatabase(USER_A, WORKSPACE_ONE);

    const dbUserB = getScopedLedgerDatabase(USER_B, WORKSPACE_ONE);
    expect(await dbUserB.contacts.count()).toBe(0);

    const dbUserAAgain = getScopedLedgerDatabase(USER_A, WORKSPACE_ONE);
    expect(await dbUserAAgain.contacts.count()).toBe(1);
  });

  it("does not migrate or delete legacy MepaLedger records", async () => {
    await seedDatabase();

    const legacyDb = new MepaDatabase(LEGACY_LEDGER_DATABASE_NAME);
    expect(await legacyDb.contacts.count()).toBeGreaterThan(0);

    const scopedDb = getScopedLedgerDatabase(USER_A, WORKSPACE_ONE);
    expect(await scopedDb.contacts.count()).toBe(0);
    expect(await scopedDb.obligations.count()).toBe(0);
    expect(await scopedDb.payments.count()).toBe(0);

    expect(await legacyDb.contacts.count()).toBeGreaterThan(0);
    await legacyDb.close();
  });
});
