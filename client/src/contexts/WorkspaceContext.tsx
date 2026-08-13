import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  isActiveWorkspaceMember,
  resolveSelectedWorkspaceId,
  SELECTED_WORKSPACE_STORAGE_KEY,
} from "@/lib/workspaceSelection";
import type { ActiveWorkspaceMembership } from "@/types/workspace";

interface WorkspaceContextValue {
  memberships: ActiveWorkspaceMembership[];
  selectedMembership: ActiveWorkspaceMembership | null;
  selectedWorkspaceId: string | null;
  workspaceScopeKey: number;
  resolvingSelection: boolean;
  selectWorkspace: (workspaceId: string) => void;
  refreshMemberships: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

interface WorkspaceProviderProps {
  memberships: ActiveWorkspaceMembership[];
  refreshMemberships: () => Promise<void>;
  children: ReactNode;
}

export function WorkspaceProvider({
  memberships,
  refreshMemberships,
  children,
}: WorkspaceProviderProps) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [workspaceScopeKey, setWorkspaceScopeKey] = useState(0);
  const [resolvingSelection, setResolvingSelection] = useState(true);

  useEffect(() => {
    setResolvingSelection(true);

    const storedWorkspaceId = sessionStorage.getItem(SELECTED_WORKSPACE_STORAGE_KEY);
    const resolvedWorkspaceId = resolveSelectedWorkspaceId(
      storedWorkspaceId,
      memberships,
    );

    setSelectedWorkspaceId(resolvedWorkspaceId);

    if (resolvedWorkspaceId) {
      sessionStorage.setItem(SELECTED_WORKSPACE_STORAGE_KEY, resolvedWorkspaceId);
    } else {
      sessionStorage.removeItem(SELECTED_WORKSPACE_STORAGE_KEY);
    }

    setResolvingSelection(false);
  }, [memberships]);

  const selectWorkspace = useCallback(
    (workspaceId: string) => {
      if (!isActiveWorkspaceMember(workspaceId, memberships)) {
        return;
      }

      sessionStorage.setItem(SELECTED_WORKSPACE_STORAGE_KEY, workspaceId);
      setWorkspaceScopeKey((current) => current + 1);
      setSelectedWorkspaceId(workspaceId);
    },
    [memberships],
  );

  const selectedMembership = useMemo(() => {
    if (!selectedWorkspaceId) {
      return null;
    }

    return (
      memberships.find(
        (membership) => membership.workspaceId === selectedWorkspaceId,
      ) ?? null
    );
  }, [memberships, selectedWorkspaceId]);

  const value = useMemo(
    () => ({
      memberships,
      selectedMembership,
      selectedWorkspaceId,
      workspaceScopeKey,
      resolvingSelection,
      selectWorkspace,
      refreshMemberships,
    }),
    [
      memberships,
      selectedMembership,
      selectedWorkspaceId,
      workspaceScopeKey,
      resolvingSelection,
      selectWorkspace,
      refreshMemberships,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider.");
  }

  return context;
}
