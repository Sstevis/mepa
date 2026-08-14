import { useAuth } from "@/contexts/AuthContext";
import { LedgerProvider } from "@/contexts/LedgerContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import LocalLedgerApp from "@/components/LocalLedgerApp";
import ScopedLedgerNotice from "@/components/ScopedLedgerNotice";

export default function AuthenticatedLedgerShell() {
  const { user } = useAuth();
  const { workspaceScopeKey, resolvingSelection, selectedMembership } = useWorkspace();

  if (resolvingSelection || !selectedMembership || !user?.id) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 px-6"
        role="status"
        aria-live="polite"
        aria-label="Loading workspace"
      >
        <p className="text-sm font-medium text-teal-800">Loading workspace…</p>
      </div>
    );
  }

  return (
    <LedgerProvider
      userId={user.id}
      workspaceId={selectedMembership.workspaceId}
      scopeRevision={workspaceScopeKey}
    >
      <div key={workspaceScopeKey}>
        <ScopedLedgerNotice />
        <LocalLedgerApp />
      </div>
    </LedgerProvider>
  );
}
