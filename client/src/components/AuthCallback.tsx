import { useEffect, useState } from "react";
import { Link, Redirect } from "wouter";

import AuthLoadingScreen from "@/components/AuthLoadingScreen";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthCallback() {
  const { session, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (loading || session) {
      return;
    }

    const timer = window.setTimeout(() => {
      setTimedOut(true);
    }, 4000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loading, session]);

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (session) {
    return <Redirect to="/" />;
  }

  if (!timedOut) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 px-6"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-medium text-teal-800">
          Confirming your email…
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 px-6 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Confirmation link invalid or expired</CardTitle>
          <CardDescription>
            We could not establish a session from this link. Request a new
            confirmation email or sign in if you have already confirmed your
            account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/auth">
            <Button type="button" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
