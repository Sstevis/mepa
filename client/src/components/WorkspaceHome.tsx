import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

function formatWorkspaceType(type: "individual" | "company") {
  return type === "individual" ? "Individual" : "Company";
}

function formatRole(role: "owner" | "admin" | "member") {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function WorkspaceHome() {
  const { user, signOut } = useAuth();
  const { selectedMembership } = useWorkspace();

  if (!selectedMembership) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
          Mepa Ledger
        </p>
        <CardTitle>{selectedMembership.workspaceName}</CardTitle>
        <CardDescription>
          Your active server-backed workspace is ready. Ledger data will appear
          here after migration in a later stage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {user?.email && (
          <p className="text-sm text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">{user.email}</span>
          </p>
        )}

        <dl className="grid gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Workspace type</dt>
            <dd className="font-medium text-foreground">
              {formatWorkspaceType(selectedMembership.workspaceType)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Your role</dt>
            <dd className="font-medium text-foreground">
              {formatRole(selectedMembership.role)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Currency</dt>
            <dd className="font-medium text-foreground">
              {selectedMembership.currencyCode}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Timezone</dt>
            <dd className="font-medium text-foreground">
              {selectedMembership.timezone}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Membership</dt>
            <dd className="font-medium capitalize text-foreground">
              {selectedMembership.status}
            </dd>
          </div>
        </dl>

        <div className="rounded-xl border border-dashed border-gray-200 bg-white/70 p-4 text-sm text-muted-foreground">
          No contacts, obligations, or payments yet. This workspace is empty
          until ledger migration arrives in a later stage.
        </div>

        <div className="rounded-xl border border-teal-100 bg-teal-50/80 p-4 text-sm text-teal-950">
          Local browser ledger data from the prototype stays unlinked. Server
          contacts, obligations, and payments will arrive after migration.
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => {
            void signOut();
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </CardContent>
    </Card>
  );
}
