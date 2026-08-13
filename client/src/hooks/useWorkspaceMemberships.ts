import { useCallback, useEffect, useMemo, useState } from "react";

import { getSupabaseClient } from "@/lib/supabase";
import {
  createWorkspaceViaRpc,
  fetchActiveWorkspaceMemberships,
} from "@/lib/workspaceApi";
import type { ActiveWorkspaceMembership, WorkspaceType } from "@/types/workspace";

interface UseWorkspaceMembershipsResult {
  memberships: ActiveWorkspaceMembership[];
  loading: boolean;
  creating: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createWorkspace: (
    workspaceName: string,
    requestedType: WorkspaceType,
  ) => Promise<{ error: string | null }>;
}

export function useWorkspaceMemberships(): UseWorkspaceMembershipsResult {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [memberships, setMemberships] = useState<ActiveWorkspaceMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await fetchActiveWorkspaceMemberships(supabase);
    setMemberships(result.memberships);
    setError(result.error);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createWorkspace = useCallback(
    async (workspaceName: string, requestedType: WorkspaceType) => {
      setCreating(true);
      setError(null);

      const rpcResult = await createWorkspaceViaRpc(
        supabase,
        workspaceName,
        requestedType,
      );

      if (rpcResult.error) {
        setCreating(false);
        return { error: rpcResult.error };
      }

      await refresh();
      setCreating(false);
      return { error: null };
    },
    [refresh, supabase],
  );

  return {
    memberships,
    loading,
    creating,
    error,
    refresh,
    createWorkspace,
  };
}
