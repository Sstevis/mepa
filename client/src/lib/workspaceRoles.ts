import type { WorkspaceRole } from "@/types/workspace";

export function canInviteMembers(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

export function canInviteAdmins(role: WorkspaceRole): boolean {
  return role === "owner";
}

export function isOwnerOrAdmin(role: WorkspaceRole): boolean {
  return canInviteMembers(role);
}
