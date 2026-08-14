import Papa from "papaparse";
import { describe, expect, it } from "vitest";

import { DomainValidationError, validatePaymentAgainstObligation } from "@/validation";
import {
  buildLedgerExportFilename,
  buildLedgerExportRows,
  computeObligationTotalPaid,
  LEDGER_EXPORT_COLUMNS,
  serializeLedgerExportCsv,
} from "@/lib/ledgerExport";
import type { Contact, Obligation, Payment } from "@/types";
import { formatGhanaPhoneForDisplay } from "@/utils/ghanaPhone";

const CREATED = 1;

const kwame: Contact = {
  id: "seed-contact-kwame",
  name: "Kwame",
  phone: "024 412 3456",
  type: "supplier",
  createdAt: CREATED,
};

const kofi: Contact = {
  id: "seed-contact-kofi",
  name: "Kofi",
  phone: "020 987 6543",
  type: "supplier",
  createdAt: CREATED,
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
  createdAt: CREATED,
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
  createdAt: CREATED,
};

const settledObligation: Obligation = {
  id: "obl-settled",
  contactId: kwame.id,
  direction: "they_owe_me",
  amount: 1000.04,
  description: "Exact settlement sample",
  date: "2026-08-02",
  dueDate: "2026-08-22",
  status: "settled",
  remainingAmount: 0,
  createdAt: CREATED,
};

const kwamePayment: Payment = {
  id: "seed-pay-kwame",
  obligationId: kwameObligation.id,
  amount: 500,
  method: "momo",
  reference: "MOMO123456",
  date: "2026-08-12",
  note: "First installment",
  createdAt: CREATED,
};

const settledPayment: Payment = {
  id: "pay-settled",
  obligationId: settledObligation.id,
  amount: 1000.04,
  method: "cash",
  reference: "CASH-849",
  date: "2026-08-13",
  note: "Paid in full",
  createdAt: CREATED,
};

const partialDecimalObligation: Obligation = {
  id: "obl-decimal",
  contactId: kofi.id,
  direction: "i_owe_them",
  amount: 1000.04,
  description: "Decimal preservation",
  date: "2026-08-03",
  dueDate: "2026-08-23",
  status: "partial",
  remainingAmount: 150.08,
  createdAt: CREATED,
};

function parseCsv(csv: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  return result.data;
}

describe("ledgerExport", () => {
  it("uses deterministic CSV headers and rowType values", () => {
    const rows = buildLedgerExportRows([kofi], [kofiObligation], []);
    const csv = serializeLedgerExportCsv(rows);
    const headerLine = (csv.split("\n")[0] ?? "").replace(/\r$/, "");

    expect(headerLine).toBe(
      LEDGER_EXPORT_COLUMNS.map((column) => `"${column}"`).join(","),
    );
    expect(rows[0]?.rowType).toBe("obligation");
    expect(csv).not.toContain("undefined");
    expect(csv).not.toContain("null");
  });

  it("exports an unpaid obligation with totalPaid 0 and full remaining balance", () => {
    const rows = buildLedgerExportRows([kofi], [kofiObligation], []);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      rowType: "obligation",
      contactName: "Kofi",
      obligationId: kofiObligation.id,
      obligationAmount: 2500,
      paymentAmount: "",
      totalPaid: 0,
      remainingAmount: 2500,
      obligationStatus: "open",
      paymentMethod: "",
      paymentReference: "",
      paymentNote: "",
      paymentDate: "",
    });
    expect(rows[0]?.contactPhone).toBe(formatGhanaPhoneForDisplay(kofi.phone));
  });

  it("exports a partial obligation row plus a linked payment row", () => {
    const rows = buildLedgerExportRows([kwame], [kwameObligation], [kwamePayment]);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.rowType).toBe("obligation");
    expect(rows[1]?.rowType).toBe("payment");
    expect(rows[0]?.totalPaid).toBe(500);
    expect(rows[0]?.remainingAmount).toBe(700);
    expect(rows[1]?.paymentAmount).toBe(500);
  });

  it("repeats obligationId and contactName on payment rows", () => {
    const rows = buildLedgerExportRows([kwame], [kwameObligation], [kwamePayment]);
    const paymentRow = rows.find((row) => row.rowType === "payment");

    expect(paymentRow?.obligationId).toBe(kwameObligation.id);
    expect(paymentRow?.contactName).toBe("Kwame");
    expect(paymentRow?.description).toBe("Carton of rice");
    expect(paymentRow?.dueDate).toBe("2026-08-24");
  });

  it("keeps totalPaid plus remainingAmount equal to obligationAmount", () => {
    const rows = buildLedgerExportRows(
      [kwame, kofi],
      [kwameObligation, kofiObligation, partialDecimalObligation],
      [kwamePayment],
    );

    for (const row of rows.filter((entry) => entry.rowType === "obligation")) {
      const obligationAmount = Number(row.obligationAmount);
      const totalPaid = Number(row.totalPaid);
      const remainingAmount = Number(row.remainingAmount);
      const paidPlusRemaining = Math.round((totalPaid + remainingAmount) * 100) / 100;
      expect(paidPlusRemaining).toBe(obligationAmount);
    }
  });

  it("exports exact settlement with settled status and zero remaining balance", () => {
    const rows = buildLedgerExportRows([kwame], [settledObligation], [settledPayment]);
    const obligationRow = rows.find((row) => row.rowType === "obligation");

    expect(obligationRow).toMatchObject({
      obligationStatus: "settled",
      remainingAmount: 0,
      totalPaid: 1000.04,
      obligationAmount: 1000.04,
    });
  });

  it("preserves decimal amounts exactly in CSV output", () => {
    const rows = buildLedgerExportRows([kofi], [partialDecimalObligation], []);
    const csv = serializeLedgerExportCsv(rows);

    expect(rows[0]?.totalPaid).toBe(849.96);
    expect(computeObligationTotalPaid(partialDecimalObligation)).toBe(849.96);
    expect(csv).toContain("849.96");
    expect(csv).toContain("1000.04");
    expect(csv).toContain("150.08");
  });

  it("exports payment method, reference, and note when present", () => {
    const rows = buildLedgerExportRows([kwame], [kwameObligation], [kwamePayment]);
    const paymentRow = rows.find((row) => row.rowType === "payment");

    expect(paymentRow).toMatchObject({
      paymentMethod: "momo",
      paymentReference: "MOMO123456",
      paymentNote: "First installment",
      paymentDate: "2026-08-12",
    });
  });

  it("rejects overpayments before they can be exported", () => {
    expect(() =>
      validatePaymentAgainstObligation(kwameObligation, kwameObligation.remainingAmount + 0.01),
    ).toThrow(DomainValidationError);

    const rows = buildLedgerExportRows([kwame], [kwameObligation], [kwamePayment]);
    const paymentAmounts = rows
      .filter((row) => row.rowType === "payment")
      .map((row) => Number(row.paymentAmount));

    expect(paymentAmounts).toEqual([500]);
    expect(paymentAmounts).not.toContain(700.01);
  });

  it("builds the existing dated export filename pattern", () => {
    expect(buildLedgerExportFilename(new Date("2026-08-14T15:30:00.000Z"))).toBe(
      "mepa-ledger-export-2026-08-14.csv",
    );
  });

  it("exports seed-style Kofi and Kwame rows with linked payment context", () => {
    const rows = buildLedgerExportRows(
      [kwame, kofi],
      [kwameObligation, kofiObligation],
      [kwamePayment],
    );
    const csv = serializeLedgerExportCsv(rows);
    const parsed = parseCsv(csv);

    const kofiRow = parsed.find(
      (row) => row.rowType === "obligation" && row.contactName === "Kofi",
    );
    const kwameObligationRow = parsed.find(
      (row) => row.rowType === "obligation" && row.contactName === "Kwame",
    );
    const kwamePaymentRow = parsed.find(
      (row) => row.rowType === "payment" && row.contactName === "Kwame",
    );

    expect(kofiRow).toMatchObject({
      rowType: "obligation",
      obligationAmount: "2500",
      totalPaid: "0",
      remainingAmount: "2500",
      obligationStatus: "open",
    });

    expect(kwameObligationRow).toMatchObject({
      rowType: "obligation",
      obligationAmount: "1200",
      totalPaid: "500",
      remainingAmount: "700",
      obligationStatus: "partial",
    });

    expect(kwamePaymentRow).toMatchObject({
      rowType: "payment",
      obligationId: kwameObligation.id,
      contactName: "Kwame",
      paymentAmount: "500",
      paymentMethod: "momo",
      paymentReference: "MOMO123456",
      remainingAmount: "700",
      obligationStatus: "partial",
    });
  });
});
