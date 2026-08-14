import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addContact } from "@/db";
import { useLedger } from "@/contexts/LedgerContext";
import type { Contact, ContactType } from "@/types";
import { DomainValidationError } from "@/validation";

interface InlineContactCreateProps {
  onCreated: (contact: Contact) => void;
  onCancel: () => void;
}

export default function InlineContactCreate({
  onCreated,
  onCancel,
}: InlineContactCreateProps) {
  const { db } = useLedger();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<ContactType>("supplier");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!name.trim() || !phone.trim()) {
      setError("Name and phone are required.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const contact = await addContact(db, {
        name: name.trim(),
        phone: phone.trim(),
        type,
      });
      onCreated(contact);
    } catch (err) {
      if (err instanceof DomainValidationError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save contact. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-3 rounded-xl border border-teal-100 bg-teal-50/40 p-4"
    >
      <p className="text-sm font-medium text-teal-900">Create new contact</p>

      <div className="space-y-2">
        <Label htmlFor="inline-contact-name">Name</Label>
        <Input
          id="inline-contact-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Kwame Mensah"
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="inline-contact-phone">Phone</Label>
        <Input
          id="inline-contact-phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="024 123 4567"
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="inline-contact-type">Type</Label>
        <select
          id="inline-contact-type"
          value={type}
          onChange={(event) => setType(event.target.value as ContactType)}
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
          disabled={submitting}
        >
          <option value="supplier">Supplier</option>
          <option value="customer">Customer</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          className="min-h-[44px] bg-teal-700 hover:bg-teal-800"
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Save contact"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px]"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
