import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";

import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db, recordPayment } from "@/db";
import { formatCurrency } from "@/utils/formatCurrency";
import type { Obligation, PaymentMethod } from "@/types";

function getPaymentErrorMessage(error: unknown, remainingAmount: number): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return `Failed to save payment. Please try again. Remaining balance: ${formatCurrency(remainingAmount)}.`;
}

export default function PaymentForm() {
  const [, params] = useRoute("/obligations/:id/pay");
  const obligationId = params?.id;
  const [, navigate] = useLocation();
  const [obligation, setObligation] = useState<Obligation | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("momo");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!obligationId) return;
    void db.obligations.get(obligationId).then((o) => setObligation(o ?? null));
  }, [obligationId]);

  if (!obligation) {
    return (
      <Layout title="Record Payment">
        <p className="text-muted-foreground">Obligation not found.</p>
      </Layout>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!obligation || submitting) return;

    setError("");

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    if (parsedAmount > obligation.remainingAmount) {
      setError(
        `Payment cannot exceed remaining ${formatCurrency(obligation.remainingAmount)}.`,
      );
      return;
    }

    setSubmitting(true);

    try {
      await recordPayment({
        obligationId: obligation.id,
        amount: parsedAmount,
        method,
        reference: reference.trim(),
        date,
        note: note.trim(),
      });

      navigate(`/contacts/${obligation.contactId}`);
    } catch (err) {
      setError(getPaymentErrorMessage(err, obligation.remainingAmount));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title="Record Payment">
      <div className="mb-4 rounded-lg border bg-muted/30 p-4">
        <p className="font-medium">{obligation.description}</p>
        <p className="text-sm text-muted-foreground">
          Remaining: {formatCurrency(obligation.remainingAmount)}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (GHS)</Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="method">Method</Label>
          <select
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
            disabled={submitting}
          >
            <option value="momo">Mobile Money</option>
            <option value="cash">Cash</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reference">Reference</Label>
          <Input
            id="reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="MoMo txn ID"
            disabled={submitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">Note</Label>
          <Input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            disabled={submitting}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          type="submit"
          className="min-h-[44px] w-full bg-teal-700 hover:bg-teal-800"
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Save Payment"}
        </Button>
      </form>
    </Layout>
  );
}
