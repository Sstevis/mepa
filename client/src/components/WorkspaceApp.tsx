import AuthLoadingScreen from "@/components/AuthLoadingScreen";
import WorkspaceHome from "@/components/WorkspaceHome";
import WorkspaceOnboarding from "@/components/WorkspaceOnboarding";
import { useWorkspaceMemberships } from "@/hooks/useWorkspaceMemberships";

export default function WorkspaceApp() {
  const {
    memberships,
    activeMembership,
    loading,
    creating,
    error,
    createWorkspace,
  } = useWorkspaceMemberships();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (activeMembership) {
    return (
      <WorkspaceHome
        membership={activeMembership}
        hasMultipleMemberships={memberships.length > 1}
      />
    );
  }

  return (
    <WorkspaceOnboarding
      creating={creating}
      initialLoadError={error}
      onCreateWorkspace={createWorkspace}
    />
  );
}
