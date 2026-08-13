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

export default function WorkspacePending() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 px-6 py-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            Mepa Ledger
          </p>
          <CardTitle>Workspace setup pending</CardTitle>
          <CardDescription>
            Your account is signed in, but server-backed workspaces and ledger
            migration are not available yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {user?.email && (
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{user.email}</span>
            </p>
          )}
          <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-950">
            Local browser ledger data from the prototype is not linked to your
            account. The next stage will create workspaces, Supabase tables, and
            row-level security before your records sync to the server.
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
