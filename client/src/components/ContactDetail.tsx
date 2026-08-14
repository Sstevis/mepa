import { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { Share2 } from "lucide-react";

import { DeleteContactDialog } from "@/components/DeleteContactDialog";
import Layout from "@/components/Layout";
import ObligationCard from "@/components/ObligationCard";
import { Button } from "@/components/ui/button";
import { deleteContact, getPaymentsForObligation } from "@/db";
import { useLedger } from "@/contexts/LedgerContext";
import { useContact } from "@/hooks/useDbData";
import { calculateContactBalance } from "@/utils/calculateBalances";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatGhanaPhoneForDisplay } from "@/utils/ghanaPhone";
import type { Obligation, Payment, ReceiptPayload } from "@/types";

function formatMethod(method: Payment["method"]): string {
  return method === "momo" ? "MoMo" : "Cash";
}

function PaymentHistory({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return (
      <p className="px-1 text-sm text-muted-foreground">
        No payments recorded yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
      {payments.map((payment) => (
        <li key={payment.id} className="text-sm">
          <div className="flex justify-between font-medium">
            <span>{formatCurrency(payment.amount)}</span>
            <span>{formatMethod(payment.method)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Ref: {payment.reference || "—"}</span>
            <span>{payment.date}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ContactDetail() {
  const { db } = useLedger();
  const [, params] = useRoute("/contacts/:id");
  const contactId = params?.id;
  const { contact, loading } = useContact(contactId);
  const [, navigate] = useLocation();
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [shareObligation, setShareObligation] = useState<Obligation | null>(
    null,
  );
  const [shareUrl, setShareUrl] = useState("");
  const [paymentsByObligation, setPaymentsByObligation] = useState<
    Record<string, Payment[]>
  >({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!contactId) return;
    void db.obligations
      .where("contactId")
      .equals(contactId)
      .toArray()
      .then(setObligations);
  }, [contactId, db]);

  useEffect(() => {
    if (obligations.length === 0) {
      setPaymentsByObligation({});
      return;
    }

    void Promise.all(
      obligations.map(async (obligation) => ({
        id: obligation.id,
        payments: await getPaymentsForObligation(db, obligation.id),
      })),
    ).then((results) => {
      setPaymentsByObligation(
        Object.fromEntries(results.map((r) => [r.id, r.payments])),
      );
    });
  }, [db, obligations]);

  if (loading) {
    return (
      <Layout title="Contact">
        <p className="text-muted-foreground">Loading contact...</p>
      </Layout>
    );
  }

  if (!contact) {
    return (
      <Layout title="Contact">
        <p className="text-muted-foreground">Contact not found.</p>
      </Layout>
    );
  }

  const balance = calculateContactBalance(contact.id, obligations);

  async function handleShare(obligation: Obligation) {
    if (!contact) return;

    const payments = await getPaymentsForObligation(db, obligation.id);
    const payload: ReceiptPayload = {
      obligation,
      payments,
      contact,
    };
    const encoded = btoa(JSON.stringify(payload));
    const url = `${window.location.origin}/verify?data=${encodeURIComponent(encoded)}`;
    setShareUrl(url);
    setShareObligation(obligation);

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Mepa Ledger Receipt",
          text: `Receipt for ${obligation.description}`,
          url,
        });
      } catch {
        // User cancelled share
      }
    }
  }

  async function handleConfirmDelete() {
    if (!contactId || !contact) return;

    setDeleting(true);
    setDeleteError("");

    try {
      await deleteContact(db, contactId);
      setDeleteDialogOpen(false);
      navigate(
        `/contacts?deleted=${encodeURIComponent(contact.name)}`,
      );
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Failed to delete contact. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Layout title={contact.name} onBack={() => navigate("/contacts")}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:transition-shadow md:hover:shadow-md">
          <p className="truncate text-sm text-muted-foreground">
            {formatGhanaPhoneForDisplay(contact.phone)}
          </p>
          <p className="mt-1 capitalize text-sm">{contact.type}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm tabular-nums sm:grid-cols-2">
            <div className="break-words rounded-xl bg-emerald-50/90 p-2 font-mono text-emerald-800">
              Owes you: {formatCurrency(balance.theyOweMe)}
            </div>
            <div className="break-words rounded-xl bg-red-50/90 p-2 font-mono text-red-800">
              You owe: {formatCurrency(balance.iOweThem)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/obligations/new?contactId=${contact.id}`} className="min-w-0 flex-1">
            <Button className="min-h-[44px] w-full bg-teal-700 hover:bg-teal-800">
              New Obligation
            </Button>
          </Link>
        </div>

        <section>
          <h2 className="mb-3 text-lg font-bold tracking-tight">Obligations</h2>
          {obligations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No obligations recorded for this contact.
            </p>
          ) : (
            <div className="space-y-3">
              {obligations.map((obligation) => (
                <div key={obligation.id} className="space-y-2">
                  <ObligationCard obligation={obligation} />
                  <div>
                    <h3 className="mb-2 px-1 text-sm font-medium">
                      Payment history
                    </h3>
                    <PaymentHistory
                      payments={paymentsByObligation[obligation.id] ?? []}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {obligation.status !== "settled" && (
                      <Button
                        variant="outline"
                        className="min-h-[44px] min-w-0 flex-1"
                        onClick={() =>
                          navigate(`/obligations/${obligation.id}/pay`)
                        }
                      >
                        Record Payment
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="min-h-[44px] min-w-0 flex-1"
                      onClick={() => void handleShare(obligation)}
                    >
                      <Share2 className="mr-1 h-4 w-4" />
                      Share Receipt
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {shareObligation && shareUrl && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
            <p className="mb-3 text-sm font-medium">Scan to verify receipt</p>
            <div className="flex justify-center">
              <QRCodeSVG value={shareUrl} size={160} />
            </div>
          </div>
        )}

        <section className="border-t border-gray-100 pt-4">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
            onClick={() => {
              setDeleteError("");
              setDeleteDialogOpen(true);
            }}
          >
            Delete Contact
          </Button>
        </section>
      </div>

      <DeleteContactDialog
        open={deleteDialogOpen}
        contactId={contact.id}
        contactName={contact.name}
        deleting={deleting}
        error={deleteError}
        onCancel={() => {
          if (deleting) return;
          setDeleteDialogOpen(false);
          setDeleteError("");
        }}
        onConfirm={() => void handleConfirmDelete()}
      />
    </Layout>
  );
}
