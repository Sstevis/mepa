import { useCallback, useEffect, useState } from "react";
import { db } from "@/db";
import type { Contact, Obligation, Payment } from "@/types";

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await db.contacts.orderBy("name").toArray();
    setContacts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { contacts, loading, refresh };
}

export function useObligations() {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await db.obligations.toArray();
    setObligations(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { obligations, loading, refresh };
}

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await db.payments.toArray();
    setPayments(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { payments, loading, refresh };
}

export function useContact(id: string | undefined) {
  const [contact, setContact] = useState<Contact | null>(null);

  useEffect(() => {
    if (!id) return;
    void db.contacts.get(id).then((c) => setContact(c ?? null));
  }, [id]);

  return contact;
}
