import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateInvitationEmail } from "@/lib/invitationApi";
import {
  getInvitableRoleOptions,
  type InvitableRole,
} from "@/lib/invitationTypes";
import type { WorkspaceRole } from "@/types/workspace";
import { cn } from "@/lib/utils";

interface InviteMemberDialogProps {
  open: boolean;
  callerRole: WorkspaceRole;
  creating: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (email: string, role: InvitableRole) => Promise<void>;
}

export default function InviteMemberDialog({
  open,
  callerRole,
  creating,
  error,
  onClose,
  onSubmit,
}: InviteMemberDialogProps) {
  const roleOptions = getInvitableRoleOptions(callerRole);
  const [email, setEmail] = useState("");
  const [requestedRole, setRequestedRole] = useState<InvitableRole>(
    roleOptions[0] ?? "member",
  );
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setRequestedRole(roleOptions[0] ?? "member");
      setFieldError(null);
    }
  }, [open, roleOptions]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldError(null);

    const emailValidationError = validateInvitationEmail(email);
    if (emailValidationError) {
      setFieldError(emailValidationError);
      return;
    }

    await onSubmit(email, requestedRole);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-member-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="invite-member-title" className="text-lg font-bold tracking-tight text-gray-900">
          Invite team member
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Invitations are recorded on the server. Email delivery is pending until a provider is
          configured.
        </p>

        <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <Label htmlFor="invitee-email">Email address</Label>
            <Input
              id="invitee-email"
              type="email"
              autoComplete="email"
              value={email}
              disabled={creating}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="person@example.com"
            />
            {fieldError && (
              <p className="text-sm text-red-700" role="alert">
                {fieldError}
              </p>
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Requested role</legend>
            <div className="grid gap-2">
              {roleOptions.map((role) => (
                <label
                  key={role}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm",
                    requestedRole === role
                      ? "border-teal-600 bg-teal-50/70"
                      : "border-gray-200 bg-white",
                  )}
                >
                  <input
                    type="radio"
                    name="requested-role"
                    value={role}
                    checked={requestedRole === role}
                    disabled={creating}
                    onChange={() => setRequestedRole(role)}
                  />
                  <span className="font-medium capitalize">{role}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {(error || fieldError) && (
            <p className="text-sm text-red-700" role="alert">
              {error ?? fieldError}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" variant="outline" disabled={creating} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating || roleOptions.length === 0}>
              {creating ? "Sending invitation…" : "Send invitation"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
