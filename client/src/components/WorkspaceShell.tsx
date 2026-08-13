import type { ReactNode } from "react";

import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface WorkspaceShellProps {
  children: ReactNode;
}

export default function WorkspaceShell({ children }: WorkspaceShellProps) {
  const { workspaceScopeKey, resolvingSelection } = useWorkspace();

  if (resolvingSelection) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 px-6"
        role="status"
        aria-live="polite"
        aria-label="Loading workspace"
      >
        <p className="text-sm font-medium text-teal-800">Loading workspace…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 px-6 py-10">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <WorkspaceSwitcher />
        <div key={workspaceScopeKey}>{children}</div>
      </div>
    </div>
  );
}
