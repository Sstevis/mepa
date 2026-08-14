import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";

import InlineContactCreate from "@/components/InlineContactCreate";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addObligation } from "@/db";
import { useLedger } from "@/contexts/LedgerContext";
import type { Contact, Obligation, ObligationDirection } from "@/types";
import { DomainValidationError } from "@/validation";

export default function ObligationForm() {
  const { db } = useLedger();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const preselectedContactId = params.get("contactId") ?? "";

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState(preselectedContactId);
  const [showNewContact, setShowNewContact] = useState(false);
  const [direction, setDirection] =
    useState<ObligationDirection>("i_owe_them");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState<{
    contactId: string;
    obligation: Obligation;
  } | null>(null);

  useEffect(() => {
    void db.contacts.orderBy("name").toArray().then(setContacts);
  }, [db]);

  useEffect(() => {
    if (preselectedContactId) setContactId(preselectedContactId);
  }, [preselectedContactId]);

  function handleContactCreated(contact: Contact) {
    setContacts((current) =>
      [...current, contact].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setContactId(contact.id);
    setShowNewContact(false);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const parsedAmount = Number(amount);
    if (!contactId || !description.trim() || !dueDate || !parsedAmount) {
      setError("All fields are required.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const obligation = await addObligation(db, {
        contactId,
        direction,
        amount: parsedAmount,
        description: description.trim(),
        date,
        dueDate,
      });
      setSaved({ contactId, obligation });
    } catch (err) {
      if (err instanceof DomainValidationError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save obligation. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (saved) {
    return (
      <Layout title="Obligation saved">
        <div className="space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="font-medium text-emerald-900">
            Obligation saved successfully.
          </p>
          <p className="text-sm text-emerald-800">
            {saved.obligation.description} ·{" "}
            {saved.obligation.direction === "i_owe_them"
              ? "I owe them"
              : "They owe me"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/contacts/${saved.contactId}`}>
              <Button className="min-h-[44px] bg-teal-700 hover:bg-teal-800">
                View contact
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="min-h-[44px]">
                Back to dashboard
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Add Obligation">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="contact">Contact</Label>
          <select
            id="contact"
            value={contactId}
            onChange={(event) => setContactId(event.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
            disabled={submitting || showNewContact}
          >
            <option value="">Select contact</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
          {!showNewContact ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] w-full"
              onClick={() => setShowNewContact(true)}
              disabled={submitting}
            >
              Create new contact
            </Button>
          ) : (
            <InlineContactCreate
              onCreated={handleContactCreated}
              onCancel={() => setShowNewContact(false)}
            />
          )}
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="direction">Direction</Label>
            <select
              id="direction"
              value={direction}
              onChange={(event) =>
                setDirection(event.target.value as ObligationDirection)
              }
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
              disabled={submitting}
            >
              <option value="i_owe_them">I owe them</option>
              <option value="they_owe_me">They owe me</option>
            </select>
          </div>

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
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Carton of rice"
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
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              disabled={submitting}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="submit"
            className="min-h-[44px] w-full bg-teal-700 hover:bg-teal-800"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Save Obligation"}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
