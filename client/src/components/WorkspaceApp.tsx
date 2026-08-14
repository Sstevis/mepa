import AuthLoadingScreen from "@/components/AuthLoadingScreen";
import AuthenticatedLedgerShell from "@/components/AuthenticatedLedgerShell";
import WorkspaceOnboarding from "@/components/WorkspaceOnboarding";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { useWorkspaceMemberships } from "@/hooks/useWorkspaceMemberships";

export default function WorkspaceApp() {
  const {
    memberships,
    loading,
    creating,
    error,
    refresh,
    createWorkspace,
  } = useWorkspaceMemberships();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (memberships.length === 0) {
    return (
      <WorkspaceOnboarding
        creating={creating}
        initialLoadError={error}
        onCreateWorkspace={createWorkspace}
      />
    );
  }

  return (
    <WorkspaceProvider memberships={memberships} refreshMemberships={refresh}>
      <AuthenticatedLedgerShell />
    </WorkspaceProvider>
  );
}
