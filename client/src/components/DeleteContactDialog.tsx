import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ui/dialog";
import { getContactDeletionSummary } from "@/db";
import { useLedger } from "@/contexts/LedgerContext";

export interface DeleteContactDialogProps {
  open: boolean;
  contactId: string;
  contactName: string;
  deleting: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteContactDialog({
  open,
  contactId,
  contactName,
  deleting,
  error,
  onCancel,
  onConfirm,
}: DeleteContactDialogProps) {
  const { db } = useLedger();
  const [summary, setSummary] = useState({
    obligationCount: 0,
    paymentCount: 0,
  });

  useEffect(() => {
    if (!open) return;
    void getContactDeletionSummary(db, contactId).then(setSummary);
  }, [open, contactId, db]);

  return (
    <ConfirmDialog
      open={open}
      title="Delete contact?"
      confirmLabel="Delete contact"
      confirmVariant="destructive"
      loading={deleting}
      onCancel={onCancel}
      onConfirm={onConfirm}
      description={
        <>
          <p>
            You are about to delete <strong>{contactName}</strong>.
          </p>
          <p>
            Related obligations: <strong>{summary.obligationCount}</strong>
          </p>
          <p>
            Related payments: <strong>{summary.paymentCount}</strong>
          </p>
          {summary.obligationCount > 0 || summary.paymentCount > 0 ? (
            <p className="text-red-700">
              This will permanently delete this contact and all related
              obligations and payments from this device.
            </p>
          ) : (
            <p>This contact has no related ledger records.</p>
          )}
          {error && <p className="text-red-600">{error}</p>}
        </>
      }
    />
  );
}
