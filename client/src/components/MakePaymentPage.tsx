import { useMemo, useState } from "react";
import { Link } from "wouter";

import Layout from "@/components/Layout";
import PaymentEntryForm from "@/components/PaymentEntryForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContacts, useObligations } from "@/hooks/useDbData";
import {
  filterContactsByNameOrPhone,
  formatObligationDirection,
  getEligiblePaymentContacts,
  getOutstandingObligationsForContact,
} from "@/lib/outstandingObligations";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatGhanaPhoneForDisplay } from "@/utils/ghanaPhone";
import type { Contact, Obligation } from "@/types";

type Step = "contact" | "obligation" | "payment" | "success";

export default function MakePaymentPage() {
  const { contacts, loading: contactsLoading } = useContacts();
  const { obligations, loading: obligationsLoading, refresh: refreshObligations } =
    useObligations();

  const [step, setStep] = useState<Step>("contact");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedObligation, setSelectedObligation] = useState<Obligation | null>(
    null,
  );
  const [updatedObligation, setUpdatedObligation] = useState<Obligation | null>(
    null,
  );

  const eligibleContacts = useMemo(
    () => getEligiblePaymentContacts(contacts, obligations),
    [contacts, obligations],
  );

  const filteredContacts = useMemo(
    () => filterContactsByNameOrPhone(eligibleContacts, searchQuery),
    [eligibleContacts, searchQuery],
  );

  const outstandingForContact = useMemo(() => {
    if (!selectedContact) return [];
    return getOutstandingObligationsForContact(selectedContact.id, obligations);
  }, [selectedContact, obligations]);

  const loading = contactsLoading || obligationsLoading;

  function handleContactSelect(contact: Contact) {
    const outstanding = getOutstandingObligationsForContact(contact.id, obligations);

    setSelectedContact(contact);
    setSelectedObligation(null);
    setUpdatedObligation(null);

    if (outstanding.length === 1) {
      setSelectedObligation(outstanding[0] ?? null);
      setStep("payment");
      return;
    }

    setStep("obligation");
  }

  function handleObligationSelect(obligation: Obligation) {
    setSelectedObligation(obligation);
    setStep("payment");
  }

  function handlePaymentSuccess(obligation: Obligation) {
    setUpdatedObligation(obligation);
    setSelectedObligation(obligation);
    void refreshObligations();
    setStep("success");
  }

  function resetFlow() {
    setStep("contact");
    setSearchQuery("");
    setSelectedContact(null);
    setSelectedObligation(null);
    setUpdatedObligation(null);
  }

  if (loading) {
    return (
      <Layout title="Make Payment">
        <p className="text-muted-foreground">Loading outstanding obligations…</p>
      </Layout>
    );
  }

  if (eligibleContacts.length === 0) {
    return (
      <Layout title="Make Payment">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="font-medium">No outstanding payments</p>
          <p className="mt-2 text-sm text-muted-foreground">
            There are no contacts with open or partially paid obligations in this
            workspace. Record an obligation first, or settle existing ones from
            contact detail.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/obligations/new">
              <Button className="min-h-[44px] bg-teal-700 hover:bg-teal-800">
                Add Obligation
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

  if (step === "success" && updatedObligation && selectedContact) {
    return (
      <Layout title="Payment saved">
        <div className="space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="font-medium text-emerald-900">Payment recorded successfully.</p>
          <p className="text-sm text-emerald-800">
            {selectedContact.name} · {updatedObligation.description}
          </p>
          <p className="text-sm text-emerald-800">
            Remaining balance: {formatCurrency(updatedObligation.remainingAmount)} ·
            Status: {updatedObligation.status}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px]"
              onClick={resetFlow}
            >
              Record another payment
            </Button>
            <Link href={`/contacts/${selectedContact.id}`}>
              <Button className="min-h-[44px] bg-teal-700 hover:bg-teal-800">
                View contact
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (step === "payment" && selectedContact && selectedObligation) {
    const requiresObligationPicker = outstandingForContact.length > 1;

    return (
      <Layout
        title="Make Payment"
        onBack={() => {
          if (requiresObligationPicker) {
            setStep("obligation");
            return;
          }

          setStep("contact");
          setSelectedContact(null);
          setSelectedObligation(null);
        }}
      >
        <div className="mb-4 space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
          <p className="font-medium">{selectedContact.name}</p>
          <p>{selectedObligation.description}</p>
          <p>Direction: {formatObligationDirection(selectedObligation.direction)}</p>
          <p>Original amount: {formatCurrency(selectedObligation.amount)}</p>
          <p>Remaining: {formatCurrency(selectedObligation.remainingAmount)}</p>
          <p>Due date: {selectedObligation.dueDate}</p>
          <p className="capitalize">Status: {selectedObligation.status}</p>
        </div>

        <PaymentEntryForm
          obligation={selectedObligation}
          onSuccess={handlePaymentSuccess}
        />
      </Layout>
    );
  }

  if (step === "obligation" && selectedContact) {
    return (
      <Layout title="Select obligation" onBack={() => setStep("contact")}>
        <p className="mb-4 text-sm text-muted-foreground">
          {selectedContact.name} has multiple outstanding obligations. Select one
          before entering payment details.
        </p>
        <div className="space-y-2">
          {outstandingForContact.map((obligation) => (
            <button
              key={obligation.id}
              type="button"
              className="w-full rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:border-teal-200 hover:bg-teal-50/40"
              onClick={() => handleObligationSelect(obligation)}
            >
              <p className="font-medium">{obligation.description}</p>
              <p className="text-sm text-muted-foreground">
                {formatObligationDirection(obligation.direction)} · Remaining{" "}
                {formatCurrency(obligation.remainingAmount)} · Due {obligation.dueDate}
              </p>
            </button>
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Make Payment">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="payment-contact-search">Search contacts</Label>
          <Input
            id="payment-contact-search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name or phone"
          />
        </div>

        {filteredContacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No eligible contacts match your search.
          </p>
        ) : (
          <ul className="space-y-2">
            {filteredContacts.map((contact) => {
              const outstandingCount = getOutstandingObligationsForContact(
                contact.id,
                obligations,
              ).length;

              return (
                <li key={contact.id}>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:border-teal-200 hover:bg-teal-50/40"
                    onClick={() => handleContactSelect(contact)}
                  >
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatGhanaPhoneForDisplay(contact.phone)} · {outstandingCount}{" "}
                      outstanding obligation{outstandingCount === 1 ? "" : "s"}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Layout>
  );
}
