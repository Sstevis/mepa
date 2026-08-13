import type { ReactNode } from "react";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { WorkspaceRole } from "@/types/workspace";

interface RoleGateProps {
  allow: (role: WorkspaceRole) => boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function RoleGate({
  allow,
  children,
  fallback = null,
}: RoleGateProps) {
  const { selectedMembership } = useWorkspace();

  if (!selectedMembership || !allow(selectedMembership.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
