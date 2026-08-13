import type { SupabaseClient } from "@supabase/supabase-js";

import { extractAuthErrorDetails } from "@/lib/authErrors";
import { mapWorkspaceRpcErrorMessage } from "@/lib/workspaceRpcErrors";
import type {
  ActiveWorkspaceMembership,
  CreateWorkspaceRpcArgs,
  MembershipStatus,
  WorkspaceRole,
  WorkspaceType,
} from "@/types/workspace";
import { CREATE_WORKSPACE_RPC } from "@/types/workspace";

interface MembershipRow {
  role: WorkspaceRole;
  status: MembershipStatus;
  workspace_id: string;
  joined_at: string | null;
  workspaces: {
    id: string;
    name: string;
    workspace_type: WorkspaceType;
    currency_code: string;
    timezone: string;
  } | null;
}

export async function fetchActiveWorkspaceMemberships(
  supabase: SupabaseClient,
): Promise<{ memberships: ActiveWorkspaceMembership[]; error: string | null }> {
  const { data, error } = await supabase
    .from("workspace_memberships")
    .select(
      `
        role,
        status,
        workspace_id,
        joined_at,
        workspaces (
          id,
          name,
          workspace_type,
          currency_code,
          timezone
        )
      `,
    )
    .eq("status", "active")
    .order("joined_at", { ascending: true });

  if (error) {
    return {
      memberships: [],
      error: "Could not load workspace memberships. Please try again.",
    };
  }

  const memberships = ((data ?? []) as unknown as MembershipRow[])
    .filter((row) => row.workspaces)
    .map((row) => ({
      workspaceId: row.workspaces!.id,
      workspaceName: row.workspaces!.name,
      workspaceType: row.workspaces!.workspace_type,
      role: row.role,
      currencyCode: row.workspaces!.currency_code,
      timezone: row.workspaces!.timezone,
      status: row.status,
    }));

  return { memberships, error: null };
}

export async function createWorkspaceViaRpc(
  supabase: SupabaseClient,
  workspaceName: string,
  requestedType: WorkspaceType,
): Promise<{ error: string | null }> {
  const args: CreateWorkspaceRpcArgs = {
    workspace_name: workspaceName.trim(),
    requested_type: requestedType,
  };

  const { error } = await supabase.rpc(CREATE_WORKSPACE_RPC, args);

  if (error) {
    const details = extractAuthErrorDetails(error);
    return { error: mapWorkspaceRpcErrorMessage(details) };
  }

  return { error: null };
}
