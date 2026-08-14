import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordPayment } from "@/db";
import { useLedger } from "@/contexts/LedgerContext";
import { formatCurrency } from "@/utils/formatCurrency";
import type { Obligation, PaymentMethod } from "@/types";

function getPaymentErrorMessage(error: unknown, remainingAmount: number): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return `Failed to save payment. Please try again. Remaining balance: ${formatCurrency(remainingAmount)}.`;
}

interface PaymentEntryFormProps {
  obligation: Obligation;
  onSuccess: (updatedObligation: Obligation) => void;
  submitLabel?: string;
}

export default function PaymentEntryForm({
  obligation,
  onSuccess,
  submitLabel = "Save Payment",
}: PaymentEntryFormProps) {
  const { db } = useLedger();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("momo");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

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
      await recordPayment(db, {
        obligationId: obligation.id,
        amount: parsedAmount,
        method,
        reference: reference.trim(),
        date,
        note: note.trim(),
      });

      const updated = await db.obligations.get(obligation.id);
      if (!updated) {
        throw new Error("Payment saved but obligation could not be reloaded.");
      }

      onSuccess(updated);
    } catch (err) {
      setError(getPaymentErrorMessage(err, obligation.remainingAmount));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="amount">Amount (GHS)</Label>
        <Input
          id="amount"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="method">Method</Label>
        <select
          id="method"
          value={method}
          onChange={(event) => setMethod(event.target.value as PaymentMethod)}
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
          onChange={(event) => setReference(event.target.value)}
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
          onChange={(event) => setDate(event.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Input
          id="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
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
        {submitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
