import {
  getInvitationDisplayStatus,
  type InvitableRole,
  type WorkspaceInvitation,
} from "@/lib/invitationTypes";
import { Button } from "@/components/ui/button";

interface InvitationListProps {
  invitations: WorkspaceInvitation[];
  loading: boolean;
  revokingInvitationId: string | null;
  onRevoke: (invitationId: string) => void;
}

function formatRole(role: InvitableRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

export default function InvitationList({
  invitations,
  loading,
  revokingInvitationId,
  onRevoke,
}: InvitationListProps) {
  if (loading) {
    return (
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        Loading invitations…
      </p>
    );
  }

  if (invitations.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 bg-white/70 p-4 text-sm text-muted-foreground">
        No invitations yet. Pending invites will appear here with safe details only.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-gray-50/80 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Expires</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((invitation) => {
            const status = getInvitationDisplayStatus(invitation);
            const isRevoking = revokingInvitationId === invitation.id;

            return (
              <tr key={invitation.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-foreground">{invitation.email}</td>
                <td className="px-4 py-3">{formatRole(invitation.requestedRole)}</td>
                <td className="px-4 py-3 capitalize">{status}</td>
                <td className="px-4 py-3">{formatTimestamp(invitation.expiresAt)}</td>
                <td className="px-4 py-3">{formatTimestamp(invitation.createdAt)}</td>
                <td className="px-4 py-3">
                  {status === "pending" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isRevoking}
                      onClick={() => {
                        onRevoke(invitation.id);
                      }}
                    >
                      {isRevoking ? "Revoking…" : "Revoke"}
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
