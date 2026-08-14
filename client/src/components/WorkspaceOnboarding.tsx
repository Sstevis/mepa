import { LogOut } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { validateWorkspaceName } from "@/lib/workspaceValidation";
import type { WorkspaceType } from "@/types/workspace";
import { cn } from "@/lib/utils";

interface WorkspaceOnboardingProps {
  creating: boolean;
  initialLoadError?: string | null;
  onCreateWorkspace: (
    workspaceName: string,
    requestedType: WorkspaceType,
  ) => Promise<{ error: string | null }>;
}

export default function WorkspaceOnboarding({
  creating,
  initialLoadError = null,
  onCreateWorkspace,
}: WorkspaceOnboardingProps) {
  const { user, signOut } = useAuth();
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>("individual");
  const [workspaceName, setWorkspaceName] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldError(null);
    setFormError(null);

    const nameError = validateWorkspaceName(workspaceName);
    if (nameError) {
      setFieldError(nameError);
      return;
    }

    const result = await onCreateWorkspace(workspaceName, workspaceType);
    if (result.error) {
      setFormError(result.error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 px-6 py-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            Mepa Ledger
          </p>
          <CardTitle>Set up your workspace</CardTitle>
          <CardDescription>
            Create the server-backed workspace that will hold your ledger. The
            first signed-in user becomes the Owner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {user?.email && (
            <p className="text-sm text-muted-foreground">
              Signed in as{" "}
              <span className="font-medium text-foreground">{user.email}</span>
            </p>
          )}

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Workspace type</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["individual", "Individual", "For a sole trader or personal ledger."],
                    ["company", "Company", "For a business that will invite members later."],
                  ] as const
                ).map(([value, label, description]) => {
                  const selected = workspaceType === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      disabled={creating}
                      onClick={() => setWorkspaceType(value)}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-colors",
                        selected
                          ? "border-teal-600 bg-teal-50"
                          : "border-gray-200 bg-white hover:border-teal-200",
                      )}
                    >
                      <p className="font-medium text-gray-900">{label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input
                id="workspace-name"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                disabled={creating}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? "workspace-name-error" : undefined}
                placeholder="e.g. Kwame Provisions"
              />
              {fieldError && (
                <p id="workspace-name-error" className="text-sm text-red-600">
                  {fieldError}
                </p>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              You will be the Owner of this workspace. Team invitations are
              deferred.
            </p>

            {initialLoadError && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {initialLoadError}
              </p>
            )}

            {formError && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {formError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={creating}>
              {creating ? "Creating workspace…" : "Create workspace"}
            </Button>
          </form>

          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={creating}
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
