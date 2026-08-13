import Papa from "papaparse";

import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useContacts, useObligations, usePayments } from "@/hooks/useDbData";
import { formatGhanaPhoneForDisplay } from "@/utils/ghanaPhone";

export default function ExportButton() {
  const { contacts } = useContacts();
  const { obligations } = useObligations();
  const { payments } = usePayments();

  async function handleExport() {
    const contactMap = Object.fromEntries(contacts.map((c) => [c.id, c]));

    const obligationRows = obligations.map((o) => {
      const contact = contactMap[o.contactId];
      const rawPhone = contact?.phone ?? "";
      return {
        type: "obligation",
        contactName: contact?.name ?? "",
        contactPhone: rawPhone
          ? formatGhanaPhoneForDisplay(rawPhone)
          : "",
        direction: o.direction,
        description: o.description,
        amount: o.amount,
        remainingAmount: o.remainingAmount,
        status: o.status,
        date: o.date,
        dueDate: o.dueDate,
      };
    });

    const paymentRows = payments.map((p) => {
      const obligation = obligations.find((o) => o.id === p.obligationId);
      const contact = obligation
        ? contactMap[obligation.contactId]
        : undefined;
      return {
        type: "payment",
        contactName: contact?.name ?? "",
        obligationDescription: obligation?.description ?? "",
        amount: p.amount,
        method: p.method,
        reference: p.reference,
        date: p.date,
        note: p.note,
      };
    });

    const csv = Papa.unparse([...obligationRows, ...paymentRows]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mepa-ledger-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Layout title="Export">
      <p className="mb-4 text-muted-foreground">
        Download all obligations and payments as a CSV file for backup or
        review.
      </p>
      <Button
        className="min-h-[44px] w-full bg-teal-700 hover:bg-teal-800"
        onClick={() => void handleExport()}
        disabled={obligations.length === 0 && payments.length === 0}
      >
        Download CSV
      </Button>
      {obligations.length === 0 && payments.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          No data to export yet. Record contacts and obligations first.
        </p>
      )}
    </Layout>
  );
}
