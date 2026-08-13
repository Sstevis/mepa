import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { ActiveWorkspaceMembership } from "@/types/workspace";

function formatOptionLabel(membership: ActiveWorkspaceMembership): string {
  const typeLabel =
    membership.workspaceType === "individual" ? "Individual" : "Company";
  const roleLabel =
    membership.role.charAt(0).toUpperCase() + membership.role.slice(1);

  return `${membership.workspaceName} (${typeLabel}, ${roleLabel})`;
}

export default function WorkspaceSwitcher() {
  const { memberships, selectedWorkspaceId, selectWorkspace } = useWorkspace();

  if (memberships.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="workspace-switcher">Switch workspace</Label>
      <select
        id="workspace-switcher"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        value={selectedWorkspaceId ?? ""}
        onChange={(event) => {
          selectWorkspace(event.target.value);
        }}
      >
        {memberships.map((membership) => (
          <option key={membership.workspaceId} value={membership.workspaceId}>
            {formatOptionLabel(membership)}
          </option>
        ))}
      </select>
    </div>
  );
}
