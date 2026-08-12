import { useState } from "react";
import { useLocation } from "wouter";

import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addContact } from "@/db";
import type { ContactType } from "@/types";

export default function ContactForm() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<ContactType>("supplier");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("Name and phone are required.");
      return;
    }

    await addContact({ name: name.trim(), phone: phone.trim(), type });
    navigate("/contacts");
  }

  return (
    <Layout title="Add Contact">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Kwame Mensah"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="024 123 4567"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as ContactType)}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
          >
            <option value="supplier">Supplier</option>
            <option value="customer">Customer</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          type="submit"
          className="min-h-[44px] w-full bg-teal-700 hover:bg-teal-800"
        >
          Save Contact
        </Button>
      </form>
    </Layout>
  );
}
