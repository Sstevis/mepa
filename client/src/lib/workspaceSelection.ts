import type { ActiveWorkspaceMembership } from "@/types/workspace";

export const SELECTED_WORKSPACE_STORAGE_KEY = "mepa:selected-workspace-id";

export function resolveSelectedWorkspaceId(
  storedWorkspaceId: string | null,
  memberships: ActiveWorkspaceMembership[],
): string | null {
  if (memberships.length === 0) {
    return null;
  }

  if (
    storedWorkspaceId &&
    memberships.some((membership) => membership.workspaceId === storedWorkspaceId)
  ) {
    return storedWorkspaceId;
  }

  return memberships[0]?.workspaceId ?? null;
}

export function isActiveWorkspaceMember(
  workspaceId: string,
  memberships: ActiveWorkspaceMembership[],
): boolean {
  return memberships.some((membership) => membership.workspaceId === workspaceId);
}
