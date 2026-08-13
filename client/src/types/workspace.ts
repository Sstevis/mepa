export type WorkspaceType = "individual" | "company";

export type WorkspaceRole = "owner" | "admin" | "member";

export type MembershipStatus = "active" | "invited" | "suspended";

export interface ActiveWorkspaceMembership {
  workspaceId: string;
  workspaceName: string;
  workspaceType: WorkspaceType;
  role: WorkspaceRole;
  currencyCode: string;
  timezone: string;
  status: MembershipStatus;
}

export const WORKSPACE_TYPE_VALUES = ["individual", "company"] as const;

export const CREATE_WORKSPACE_RPC = "create_workspace" as const;

export interface CreateWorkspaceRpcArgs {
  workspace_name: string;
  requested_type: WorkspaceType;
}
