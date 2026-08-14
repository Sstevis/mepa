import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useContacts, useObligations, usePayments } from "@/hooks/useDbData";
import {
  buildLedgerExportFilename,
  buildLedgerExportRows,
  serializeLedgerExportCsv,
} from "@/lib/ledgerExport";

export default function ExportButton() {
  const { contacts } = useContacts();
  const { obligations } = useObligations();
  const { payments } = usePayments();

  async function handleExport() {
    const rows = buildLedgerExportRows(contacts, obligations, payments);
    const csv = serializeLedgerExportCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildLedgerExportFilename();
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Layout title="Export Ledger">
      <p className="mb-4 text-muted-foreground">
        Download all obligations and payments as a CSV file for backup or
        review. Each row includes linked contact and obligation identifiers for
        traceability.
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
