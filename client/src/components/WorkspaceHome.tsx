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
import type { ActiveWorkspaceMembership } from "@/types/workspace";

interface WorkspaceHomeProps {
  membership: ActiveWorkspaceMembership;
  hasMultipleMemberships: boolean;
}

function formatWorkspaceType(type: ActiveWorkspaceMembership["workspaceType"]) {
  return type === "individual" ? "Individual" : "Company";
}

function formatRole(role: ActiveWorkspaceMembership["role"]) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function WorkspaceHome({
  membership,
  hasMultipleMemberships,
}: WorkspaceHomeProps) {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 px-6 py-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            Mepa Ledger
          </p>
          <CardTitle>{membership.workspaceName}</CardTitle>
          <CardDescription>
            Your active server-backed workspace is ready. Ledger features will
            connect here in a later stage.
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
                {formatWorkspaceType(membership.workspaceType)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Your role</dt>
              <dd className="font-medium text-foreground">
                {formatRole(membership.role)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Currency</dt>
              <dd className="font-medium text-foreground">
                {membership.currencyCode}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Timezone</dt>
              <dd className="font-medium text-foreground">
                {membership.timezone}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Membership</dt>
              <dd className="font-medium capitalize text-foreground">
                {membership.status}
              </dd>
            </div>
          </dl>

          {hasMultipleMemberships && (
            <p className="text-sm text-muted-foreground">
              You belong to more than one workspace. Workspace switching will be
              added in a later stage; showing your first active membership.
            </p>
          )}

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
    </div>
  );
}
