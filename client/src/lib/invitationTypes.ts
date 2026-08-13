import type { WorkspaceRole } from "@/types/workspace";

export type InvitableRole = "admin" | "member";

export type InvitationDisplayStatus = "pending" | "accepted" | "revoked" | "expired";

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  requestedRole: InvitableRole;
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreateInvitationRequest {
  workspaceId: string;
  inviteeEmail: string;
  requestedRole: InvitableRole;
}

export interface CreateInvitationResult {
  invitationId: string;
  deliveryStatus: "pending";
}

export const CREATE_INVITATION_FUNCTION_NAME = "create-workspace-invitation";

export const LIST_WORKSPACE_INVITATIONS_RPC = "list_workspace_invitations";

export const REVOKE_WORKSPACE_INVITATION_RPC = "revoke_workspace_invitation";

export const DELIVERY_PENDING_SUCCESS_MESSAGE =
  "Invitation recorded. Email delivery is pending until an email provider is configured.";

export const GENERIC_INVITATION_ERROR =
  "Unable to send invitation. Please try again.";

export function getInvitableRoleOptions(role: WorkspaceRole): InvitableRole[] {
  if (role === "owner") {
    return ["admin", "member"];
  }
  if (role === "admin") {
    return ["member"];
  }
  return [];
}

export function getInvitationDisplayStatus(
  invitation: WorkspaceInvitation,
  now: Date = new Date(),
): InvitationDisplayStatus {
  if (invitation.acceptedAt) {
    return "accepted";
  }
  if (invitation.revokedAt) {
    return "revoked";
  }
  if (new Date(invitation.expiresAt) <= now) {
    return "expired";
  }
  return "pending";
}

export function canRevokeInvitation(
  invitation: WorkspaceInvitation,
  now: Date = new Date(),
): boolean {
  return getInvitationDisplayStatus(invitation, now) === "pending";
}
