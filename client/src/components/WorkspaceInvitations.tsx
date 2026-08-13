import { useState } from "react";

import InvitationList from "@/components/InvitationList";
import InviteMemberDialog from "@/components/InviteMemberDialog";
import RoleGate from "@/components/RoleGate";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInvitations } from "@/hooks/useWorkspaceInvitations";
import { canInviteMembers } from "@/lib/workspaceRoles";

export default function WorkspaceInvitations() {
  const { selectedMembership } = useWorkspace();
  const workspaceId = selectedMembership?.workspaceId ?? null;
  const callerRole = selectedMembership?.role ?? "member";

  const {
    invitations,
    loading,
    creating,
    revokingInvitationId,
    error,
    successMessage,
    createInvitation,
    revokeInvitation,
    clearMessages,
  } = useWorkspaceInvitations(workspaceId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null);

  const revokeTarget = invitations.find((invitation) => invitation.id === revokeTargetId);

  return (
    <RoleGate allow={canInviteMembers}>
      <section
        aria-labelledby="workspace-invitations-heading"
        className="space-y-4 rounded-xl border border-gray-100 bg-white/80 p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="workspace-invitations-heading"
              className="text-base font-semibold text-foreground"
            >
              Team invitations
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage pending workspace invitations. Acceptance links arrive in a later stage.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              clearMessages();
              setDialogOpen(true);
            }}
          >
            Invite member
          </Button>
        </div>

        {successMessage && (
          <p className="rounded-xl border border-teal-100 bg-teal-50/80 p-3 text-sm text-teal-950" role="status">
            {successMessage}
          </p>
        )}

        {error && !dialogOpen && (
          <p className="rounded-xl border border-red-100 bg-red-50/80 p-3 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}

        <InvitationList
          invitations={invitations}
          loading={loading}
          revokingInvitationId={revokingInvitationId}
          onRevoke={(invitationId) => {
            clearMessages();
            setRevokeTargetId(invitationId);
          }}
        />

        <InviteMemberDialog
          open={dialogOpen}
          callerRole={callerRole}
          creating={creating}
          error={error}
          onClose={() => {
            if (!creating) {
              setDialogOpen(false);
              clearMessages();
            }
          }}
          onSubmit={async (email, requestedRole) => {
            const result = await createInvitation(email, requestedRole);
            if (!result.error) {
              setDialogOpen(false);
            }
          }}
        />

        <ConfirmDialog
          open={revokeTargetId !== null}
          title="Revoke invitation?"
          confirmLabel="Revoke invitation"
          confirmVariant="destructive"
          loading={revokingInvitationId !== null}
          onCancel={() => {
            if (!revokingInvitationId) {
              setRevokeTargetId(null);
            }
          }}
          onConfirm={() => {
            if (!revokeTargetId) {
              return;
            }
            void revokeInvitation(revokeTargetId).then((result) => {
              if (!result.error) {
                setRevokeTargetId(null);
              }
            });
          }}
          description={
            revokeTarget ? (
              <>
                <p>
                  Revoke the pending invitation for{" "}
                  <strong>{revokeTarget.email}</strong>?
                </p>
                <p>This cannot be undone, but you may send a new invitation later.</p>
              </>
            ) : (
              <p>Revoke this pending invitation?</p>
            )
          }
        />
      </section>
    </RoleGate>
  );
}
