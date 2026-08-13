import { useState } from "react";
import { Redirect } from "wouter";

import AuthLoadingScreen from "@/components/AuthLoadingScreen";
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
import {
  validateAuthEmail,
  validateAuthPassword,
} from "@/lib/authValidation";

type AuthMode = "sign-in" | "sign-up";

export default function AuthPage() {
  const { session, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (session) {
    return <Redirect to="/" />;
  }

  const resetMessages = () => {
    setFormError(null);
    setSuccessMessage(null);
    setFieldErrors({});
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    resetMessages();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    const emailError = validateAuthEmail(email);
    const passwordError = validateAuthPassword(password, {
      forSignUp: mode === "sign-up",
    });

    if (emailError || passwordError) {
      setFieldErrors({
        email: emailError ?? undefined,
        password: passwordError ?? undefined,
      });
      return;
    }

    setSubmitting(true);

    try {
      if (mode === "sign-in") {
        const result = await signIn(email, password);

        if (result.error) {
          setFormError(result.error);
        }
      } else {
        const result = await signUp(email, password);

        if (result.error) {
          setFormError(result.error);
          return;
        }

        if (result.confirmationRequired) {
          setSuccessMessage(
            "Account created. Check your email and confirm your address before signing in.",
          );
          setPassword("");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 px-6 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            Mepa Ledger
          </p>
          <CardTitle>{mode === "sign-in" ? "Sign in" : "Create account"}</CardTitle>
          <CardDescription>
            {mode === "sign-in"
              ? "Use your email and password to access your account."
              : "Create an account with email and password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "auth-email-error" : undefined}
                disabled={submitting}
              />
              {fieldErrors.email && (
                <p id="auth-email-error" className="text-sm text-red-600">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="auth-password">Password</Label>
              <Input
                id="auth-password"
                type="password"
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password ? "auth-password-error" : undefined
                }
                disabled={submitting}
              />
              {fieldErrors.password && (
                <p id="auth-password-error" className="text-sm text-red-600">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {formError && (
              <div className="space-y-2">
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {formError}
                </p>
                {import.meta.env.DEV &&
                  formError === "Something went wrong. Please try again." && (
                    <p className="text-xs text-muted-foreground">
                      Open DevTools → Console and look for{" "}
                      <code className="rounded bg-muted px-1">[Mepa Auth] signUp</code>{" "}
                      to see the safe error code, status, and message.
                    </p>
                  )}
              </div>
            )}

            {successMessage && (
              <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
                {successMessage}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? "Please wait…"
                : mode === "sign-in"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "sign-in" ? (
              <>
                Need an account?{" "}
                <button
                  type="button"
                  className="font-medium text-teal-700 underline-offset-4 hover:underline"
                  onClick={() => switchMode("sign-up")}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-teal-700 underline-offset-4 hover:underline"
                  onClick={() => switchMode("sign-in")}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
