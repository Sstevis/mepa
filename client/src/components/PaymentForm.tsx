import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";

import Layout from "@/components/Layout";
import PaymentEntryForm from "@/components/PaymentEntryForm";
import { useLedger } from "@/contexts/LedgerContext";
import { formatCurrency } from "@/utils/formatCurrency";
import type { Obligation } from "@/types";

export default function PaymentForm() {
  const { db } = useLedger();
  const [, params] = useRoute("/obligations/:id/pay");
  const obligationId = params?.id;
  const [, navigate] = useLocation();
  const [obligation, setObligation] = useState<Obligation | null>(null);

  useEffect(() => {
    if (!obligationId) return;
    void db.obligations.get(obligationId).then((entry) => setObligation(entry ?? null));
  }, [db, obligationId]);

  if (!obligation) {
    return (
      <Layout title="Record Payment">
        <p className="text-muted-foreground">Obligation not found.</p>
      </Layout>
    );
  }

  return (
    <Layout title="Record Payment">
      <div className="mb-4 rounded-lg border bg-muted/30 p-4">
        <p className="font-medium">{obligation.description}</p>
        <p className="text-sm text-muted-foreground">
          Remaining: {formatCurrency(obligation.remainingAmount)}
        </p>
      </div>

      <PaymentEntryForm
        obligation={obligation}
        onSuccess={() => navigate(`/contacts/${obligation.contactId}`)}
      />
    </Layout>
  );
}
