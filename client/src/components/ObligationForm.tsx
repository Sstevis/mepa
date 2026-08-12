import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";

import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addObligation, db } from "@/db";
import type { Contact, ObligationDirection } from "@/types";

export default function ObligationForm() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const preselectedContactId = params.get("contactId") ?? "";

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState(preselectedContactId);
  const [direction, setDirection] =
    useState<ObligationDirection>("i_owe_them");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void db.contacts.orderBy("name").toArray().then(setContacts);
  }, []);

  useEffect(() => {
    if (preselectedContactId) setContactId(preselectedContactId);
  }, [preselectedContactId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!contactId || !description.trim() || !dueDate || !parsedAmount) {
      setError("All fields are required.");
      return;
    }

    await addObligation({
      contactId,
      direction,
      amount: parsedAmount,
      description: description.trim(),
      date,
      dueDate,
    });

    navigate(`/contacts/${contactId}`);
  }

  if (contacts.length === 0) {
    return (
      <Layout title="New Obligation">
        <p className="mb-4 text-muted-foreground">
          Add a contact before creating an obligation.
        </p>
        <Button
          className="min-h-[44px] bg-teal-700 hover:bg-teal-800"
          onClick={() => navigate("/contacts/new")}
        >
          Add Contact
        </Button>
      </Layout>
    );
  }

  return (
    <Layout title="New Obligation">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="contact">Contact</Label>
          <select
            id="contact"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
          >
            <option value="">Select contact</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="direction">Direction</Label>
          <select
            id="direction"
            value={direction}
            onChange={(e) =>
              setDirection(e.target.value as ObligationDirection)
            }
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
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
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Carton of rice"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          type="submit"
          className="min-h-[44px] w-full bg-teal-700 hover:bg-teal-800"
        >
          Save Obligation
        </Button>
      </form>
    </Layout>
  );
}
