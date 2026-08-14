import Papa from "papaparse";

import type { Contact, Obligation, Payment } from "@/types";
import { formatGhanaPhoneForDisplay } from "@/utils/ghanaPhone";

export const LEDGER_EXPORT_COLUMNS = [
  "rowType",
  "contactId",
  "contactName",
  "contactPhone",
  "obligationId",
  "paymentId",
  "direction",
  "description",
  "obligationAmount",
  "paymentAmount",
  "totalPaid",
  "remainingAmount",
  "obligationStatus",
  "paymentMethod",
  "paymentReference",
  "paymentNote",
  "obligationDate",
  "dueDate",
  "paymentDate",
] as const;

export type LedgerExportColumn = (typeof LEDGER_EXPORT_COLUMNS)[number];

export type LedgerExportRow = Record<LedgerExportColumn, string | number>;

const EMPTY = "";

function normalizeCurrencyAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeExportRow(row: LedgerExportRow): LedgerExportRow {
  return {
    ...row,
    obligationAmount:
      typeof row.obligationAmount === "number"
        ? normalizeCurrencyAmount(row.obligationAmount)
        : row.obligationAmount,
    paymentAmount:
      typeof row.paymentAmount === "number"
        ? normalizeCurrencyAmount(row.paymentAmount)
        : row.paymentAmount,
    totalPaid:
      typeof row.totalPaid === "number"
        ? normalizeCurrencyAmount(row.totalPaid)
        : row.totalPaid,
    remainingAmount:
      typeof row.remainingAmount === "number"
        ? normalizeCurrencyAmount(row.remainingAmount)
        : row.remainingAmount,
  };
}

export function computeObligationTotalPaid(obligation: Obligation): number {
  return normalizeCurrencyAmount(obligation.amount - obligation.remainingAmount);
}

function formatContactPhone(phone: string | undefined): string {
  if (!phone) {
    return EMPTY;
  }

  return formatGhanaPhoneForDisplay(phone);
}

interface ObligationExportContext {
  contactId: string;
  contactName: string;
  contactPhone: string;
  obligationId: string;
  direction: Obligation["direction"];
  description: string;
  obligationAmount: number;
  totalPaid: number;
  remainingAmount: number;
  obligationStatus: Obligation["status"];
  obligationDate: string;
  dueDate: string;
}

function buildObligationContext(
  obligation: Obligation,
  contact: Contact | undefined,
): ObligationExportContext {
  return {
    contactId: contact?.id ?? EMPTY,
    contactName: contact?.name ?? EMPTY,
    contactPhone: formatContactPhone(contact?.phone),
    obligationId: obligation.id,
    direction: obligation.direction,
    description: obligation.description,
    obligationAmount: normalizeCurrencyAmount(obligation.amount),
    totalPaid: computeObligationTotalPaid(obligation),
    remainingAmount: normalizeCurrencyAmount(obligation.remainingAmount),
    obligationStatus: obligation.status,
    obligationDate: obligation.date,
    dueDate: obligation.dueDate,
  };
}

function compareObligations(a: Obligation, b: Obligation): number {
  const dateCompare = a.date.localeCompare(b.date);
  if (dateCompare !== 0) {
    return dateCompare;
  }

  return a.id.localeCompare(b.id);
}

function comparePayments(a: Payment, b: Payment): number {
  const dateCompare = a.date.localeCompare(b.date);
  if (dateCompare !== 0) {
    return dateCompare;
  }

  return a.id.localeCompare(b.id);
}

export function buildLedgerExportRows(
  contacts: Contact[],
  obligations: Obligation[],
  payments: Payment[],
): LedgerExportRow[] {
  const contactMap = Object.fromEntries(contacts.map((contact) => [contact.id, contact]));
  const obligationMap = Object.fromEntries(
    obligations.map((obligation) => [obligation.id, obligation]),
  );

  const obligationRows = [...obligations].sort(compareObligations).map((obligation) => {
    const context = buildObligationContext(obligation, contactMap[obligation.contactId]);

    return {
      rowType: "obligation",
      contactId: context.contactId,
      contactName: context.contactName,
      contactPhone: context.contactPhone,
      obligationId: context.obligationId,
      paymentId: EMPTY,
      direction: context.direction,
      description: context.description,
      obligationAmount: context.obligationAmount,
      paymentAmount: EMPTY,
      totalPaid: context.totalPaid,
      remainingAmount: context.remainingAmount,
      obligationStatus: context.obligationStatus,
      paymentMethod: EMPTY,
      paymentReference: EMPTY,
      paymentNote: EMPTY,
      obligationDate: context.obligationDate,
      dueDate: context.dueDate,
      paymentDate: EMPTY,
    } satisfies LedgerExportRow;
  });

  const paymentRows = [...payments].sort(comparePayments).map((payment) => {
    const obligation = obligationMap[payment.obligationId];
    const contact = obligation ? contactMap[obligation.contactId] : undefined;
    const context = obligation
      ? buildObligationContext(obligation, contact)
      : {
          contactId: EMPTY,
          contactName: EMPTY,
          contactPhone: EMPTY,
          obligationId: payment.obligationId,
          direction: "they_owe_me" as const,
          description: EMPTY,
          obligationAmount: EMPTY,
          totalPaid: EMPTY,
          remainingAmount: EMPTY,
          obligationStatus: "open" as const,
          obligationDate: EMPTY,
          dueDate: EMPTY,
        };

    return {
      rowType: "payment",
      contactId: context.contactId,
      contactName: context.contactName,
      contactPhone: context.contactPhone,
      obligationId: context.obligationId,
      paymentId: payment.id,
      direction: context.direction,
      description: context.description,
      obligationAmount: context.obligationAmount,
      paymentAmount: normalizeCurrencyAmount(payment.amount),
      totalPaid: context.totalPaid,
      remainingAmount: context.remainingAmount,
      obligationStatus: context.obligationStatus,
      paymentMethod: payment.method,
      paymentReference: payment.reference,
      paymentNote: payment.note,
      obligationDate: context.obligationDate,
      dueDate: context.dueDate,
      paymentDate: payment.date,
    } satisfies LedgerExportRow;
  });

  return [...obligationRows, ...paymentRows];
}

export function serializeLedgerExportCsv(rows: LedgerExportRow[]): string {
  const normalizedRows = rows.map(normalizeExportRow);
  return Papa.unparse(normalizedRows, {
    columns: [...LEDGER_EXPORT_COLUMNS],
    quotes: true,
    skipEmptyLines: false,
  }).replace(/\r\n/g, "\n");
}

export function buildLedgerExportFilename(asOf: Date = new Date()): string {
  return `mepa-ledger-export-${asOf.toISOString().slice(0, 10)}.csv`;
}
