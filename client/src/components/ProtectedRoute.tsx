import { Redirect } from "wouter";

import AuthLoadingScreen from "@/components/AuthLoadingScreen";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return <Redirect to="/auth" />;
  }

  return <>{children}</>;
}
