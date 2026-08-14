import { useCallback, useEffect, useState } from "react";

import { useLedger } from "@/contexts/LedgerContext";
import type { Contact, Obligation, Payment } from "@/types";

export function useContacts() {
  const { db, scopeKey } = useLedger();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await db.contacts.orderBy("name").toArray();
    setContacts(data);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh, scopeKey]);

  return { contacts, loading, refresh };
}

export function useObligations() {
  const { db, scopeKey } = useLedger();
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await db.obligations.toArray();
    setObligations(data);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh, scopeKey]);

  return { obligations, loading, refresh };
}

export function usePayments() {
  const { db, scopeKey } = useLedger();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await db.payments.toArray();
    setPayments(data);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh, scopeKey]);

  return { payments, loading, refresh };
}

export function useContact(id: string | undefined) {
  const { db, scopeKey } = useLedger();
  const [contact, setContact] = useState<Contact | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setContact(null);
      return;
    }

    setContact(undefined);
    void db.contacts.get(id).then((c) => setContact(c ?? null));
  }, [db, id, scopeKey]);

  return {
    contact: contact ?? null,
    loading: contact === undefined && Boolean(id),
  };
}
