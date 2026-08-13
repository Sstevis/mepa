import { useMemo, useState } from "react";
import { useSearch } from "wouter";

import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatGhanaPhoneForDisplay } from "@/utils/ghanaPhone";
import type { ReceiptPayload } from "@/types";

function decodeReceipt(data: string): ReceiptPayload | null {
  try {
    const json = atob(decodeURIComponent(data));
    return JSON.parse(json) as ReceiptPayload;
  } catch {
    return null;
  }
}

export default function ReceiptViewer() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const data = params.get("data") ?? "";
  const [acknowledged, setAcknowledged] = useState(false);

  const receipt = useMemo(() => (data ? decodeReceipt(data) : null), [data]);

  if (!data || !receipt) {
    return (
      <Layout title="Verify Receipt" hideNav>
        <p className="text-muted-foreground">
          Invalid or missing receipt data.
        </p>
      </Layout>
    );
  }

  const { obligation, payments, contact } = receipt;

  return (
    <Layout title="Verify Receipt" hideNav>
      <div className="space-y-4 rounded-lg border bg-card p-4">
        <div>
          <p className="text-sm text-muted-foreground">Mepa Ledger Receipt</p>
          <h2 className="text-xl font-semibold">{contact.name}</h2>
          <p className="text-sm">{formatGhanaPhoneForDisplay(contact.phone)}</p>
        </div>

        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Shared receipt copy — not independently verified in this demo.
        </p>

        <div className="rounded-lg bg-muted/40 p-3">
          <p className="font-medium">{obligation.description}</p>
          <p className="text-sm text-muted-foreground">
            Original: {formatCurrency(obligation.amount)}
          </p>
          <p className="text-sm text-muted-foreground">
            Remaining: {formatCurrency(obligation.remainingAmount)}
          </p>
          <Badge variant="muted" className="mt-2 capitalize">
            {obligation.status}
          </Badge>
        </div>

        {payments.length > 0 && (
          <div>
            <h3 className="mb-2 font-medium">Payments</h3>
            <ul className="space-y-2">
              {payments.map((payment) => (
                <li
                  key={payment.id}
                  className="rounded border px-3 py-2 text-sm"
                >
                  <div className="flex justify-between">
                    <span>{formatCurrency(payment.amount)}</span>
                    <span className="uppercase">{payment.method}</span>
                  </div>
                  {payment.reference && (
                    <p className="text-muted-foreground">
                      Ref: {payment.reference}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button
          className="min-h-[44px] w-full bg-teal-700 hover:bg-teal-800"
          onClick={() => setAcknowledged(true)}
        >
          Acknowledge shared copy
        </Button>

        {acknowledged && (
          <p className="text-center text-sm text-muted-foreground">
            Shared receipt copy — not independently verified in this demo.
          </p>
        )}
      </div>
    </Layout>
  );
}
