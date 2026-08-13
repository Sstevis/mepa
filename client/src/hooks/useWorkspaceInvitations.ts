import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createWorkspaceInvitationViaEdgeFunction,
  listWorkspaceInvitations,
  revokeWorkspaceInvitation,
} from "@/lib/invitationApi";
import {
  DELIVERY_PENDING_SUCCESS_MESSAGE,
  type InvitableRole,
  type WorkspaceInvitation,
} from "@/lib/invitationTypes";
import { getSupabaseClient } from "@/lib/supabase";

interface UseWorkspaceInvitationsResult {
  invitations: WorkspaceInvitation[];
  loading: boolean;
  creating: boolean;
  revokingInvitationId: string | null;
  error: string | null;
  successMessage: string | null;
  refresh: () => Promise<void>;
  createInvitation: (
    inviteeEmail: string,
    requestedRole: InvitableRole,
  ) => Promise<{ error: string | null }>;
  revokeInvitation: (invitationId: string) => Promise<{ error: string | null }>;
  clearMessages: () => void;
}

export function useWorkspaceInvitations(
  workspaceId: string | null,
): UseWorkspaceInvitationsResult {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revokingInvitationId, setRevokingInvitationId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!workspaceId) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await listWorkspaceInvitations(supabase, workspaceId);
    setInvitations(result.invitations);
    setError(result.error);
    setLoading(false);
  }, [supabase, workspaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createInvitation = useCallback(
    async (inviteeEmail: string, requestedRole: InvitableRole) => {
      if (!workspaceId) {
        return { error: "No active workspace selected." };
      }

      setCreating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await createWorkspaceInvitationViaEdgeFunction(supabase, {
        workspaceId,
        inviteeEmail,
        requestedRole,
      });

      if (result.error) {
        setCreating(false);
        setError(result.error);
        return { error: result.error };
      }

      await refresh();
      setCreating(false);
      setSuccessMessage(DELIVERY_PENDING_SUCCESS_MESSAGE);
      return { error: null };
    },
    [refresh, supabase, workspaceId],
  );

  const revokeInvitation = useCallback(
    async (invitationId: string) => {
      if (!workspaceId) {
        return { error: "No active workspace selected." };
      }

      setRevokingInvitationId(invitationId);
      setError(null);
      setSuccessMessage(null);

      const result = await revokeWorkspaceInvitation(
        supabase,
        workspaceId,
        invitationId,
      );

      if (result.error) {
        setRevokingInvitationId(null);
        setError(result.error);
        return { error: result.error };
      }

      await refresh();
      setRevokingInvitationId(null);
      return { error: null };
    },
    [refresh, supabase, workspaceId],
  );

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  return {
    invitations,
    loading,
    creating,
    revokingInvitationId,
    error,
    successMessage,
    refresh,
    createInvitation,
    revokeInvitation,
    clearMessages,
  };
}
