/** Legacy unscoped database name — preserved read-only; not opened by authenticated routes. */
export const LEGACY_LEDGER_DATABASE_NAME = "MepaLedger";

export function sanitizeScopeSegment(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function buildLedgerScopeKey(userId: string, workspaceId: string): string {
  return `${sanitizeScopeSegment(userId)}:${sanitizeScopeSegment(workspaceId)}`;
}

export function buildScopedLedgerDatabaseName(
  userId: string,
  workspaceId: string,
): string {
  const safeUserId = sanitizeScopeSegment(userId);
  const safeWorkspaceId = sanitizeScopeSegment(workspaceId);
  return `MepaLedger__user_${safeUserId}__workspace_${safeWorkspaceId}`;
}
