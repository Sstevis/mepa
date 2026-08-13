const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 8;

export function validateAuthEmail(email: string): string | null {
  const trimmed = email.trim();

  if (!trimmed) {
    return "Email is required.";
  }

  if (!EMAIL_PATTERN.test(trimmed)) {
    return "Enter a valid email address.";
  }

  return null;
}

export function validateAuthPassword(
  password: string,
  { forSignUp = false }: { forSignUp?: boolean } = {},
): string | null {
  if (!password) {
    return "Password is required.";
  }

  if (forSignUp && password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  return null;
}
