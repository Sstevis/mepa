export interface AuthErrorDetails {
  code?: string;
  status?: number;
  message: string;
}

export function getAuthEmailRedirectUrl(
  origin: string = typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost",
): string {
  return `${origin}/auth/callback`;
}

export function extractAuthErrorDetails(error: {
  message?: string;
  code?: string;
  status?: number;
}): AuthErrorDetails {
  return {
    code: error.code,
    status: error.status,
    message: error.message ?? "Unknown auth error",
  };
}

export function logAuthErrorInDev(
  context: string,
  details: AuthErrorDetails,
): void {
  if (!import.meta.env.DEV) {
    return;
  }

  console.error(`[Mepa Auth] ${context}`, {
    code: details.code,
    status: details.status,
    message: details.message,
  });
}

export function mapAuthErrorMessage(details: AuthErrorDetails): string {
  const { code, message } = details;
  const normalized = message.toLowerCase();

  if (code === "signup_disabled") {
    return "Sign-ups are disabled for this project.";
  }

  if (code === "email_provider_disabled") {
    return "Email sign-up is disabled for this project.";
  }

  if (code === "weak_password") {
    return "Choose a stronger password and try again.";
  }

  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit"
  ) {
    return "Too many attempts. Wait a few minutes and try again.";
  }

  if (code === "email_address_invalid") {
    return "Enter a valid email address.";
  }

  if (code === "user_already_exists" || code === "email_exists") {
    return "An account with this email may already exist. Try signing in or confirm your email.";
  }

  if (code === "captcha_failed") {
    return "Verification failed. Refresh the page and try again.";
  }

  if (
    normalized.includes("redirect") &&
    (normalized.includes("not allowed") ||
      normalized.includes("invalid") ||
      normalized.includes("url"))
  ) {
    return "Email confirmation redirect URL is not allowed for this project. Add this app's /auth/callback URL in Supabase Auth redirect settings.";
  }

  if (code === "validation_failed") {
    return "Sign-up validation failed. In Supabase Auth settings, confirm email sign-up is enabled and add this app's /auth/callback URL to Redirect URLs.";
  }

  if (
    normalized.includes("confirmation email") ||
    normalized.includes("error sending") ||
    normalized.includes("unable to send email")
  ) {
    return "Could not send the confirmation email. Check Supabase Auth email or SMTP settings.";
  }

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("network request failed")
  ) {
    return "Could not reach the authentication service. Check your connection and Supabase project URL.";
  }

  if (normalized.includes("database error")) {
    return "The account could not be saved. Check Supabase project logs for database errors.";
  }

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid email or password") ||
    code === "invalid_credentials"
  ) {
    return "Invalid email or password.";
  }

  if (normalized.includes("email not confirmed") || code === "email_not_confirmed") {
    return "Confirm your email address before signing in.";
  }

  if (normalized.includes("user already registered")) {
    return "An account with this email may already exist. Try signing in or confirm your email.";
  }

  if (
    normalized.includes("invalid api key") ||
    code === "no_authorization"
  ) {
    return "Authentication service configuration is invalid. Check Supabase project settings.";
  }

  if (normalized.includes("password")) {
    return "Choose a stronger password and try again.";
  }

  return "Something went wrong. Please try again.";
}
