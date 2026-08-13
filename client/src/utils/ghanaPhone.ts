export class PhoneValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhoneValidationError";
  }
}

function assertBalancedParentheses(input: string): void {
  let depth = 0;
  for (const char of input) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (depth < 0) {
      throw new PhoneValidationError("Phone number contains malformed punctuation.");
    }
  }
  if (depth !== 0) {
    throw new PhoneValidationError("Phone number contains malformed punctuation.");
  }
}

function assertPermittedCharacters(input: string): void {
  const plusCount = (input.match(/\+/g) ?? []).length;
  if (plusCount > 1) {
    throw new PhoneValidationError(
      "Phone number must not contain multiple plus signs.",
    );
  }
  if (plusCount === 1 && !input.startsWith("+")) {
    throw new PhoneValidationError(
      "Plus sign is only permitted at the start of the number.",
    );
  }

  if (/[a-zA-Z]/.test(input)) {
    throw new PhoneValidationError("Phone number must not contain letters.");
  }

  if (/--|\(\)/.test(input)) {
    throw new PhoneValidationError("Phone number contains malformed punctuation.");
  }

  const permitted = /^\+?[\d\s\-()]+$/;
  if (!permitted.test(input)) {
    throw new PhoneValidationError("Phone number contains malformed punctuation.");
  }
}

function collapsePresentation(input: string): string {
  return input.replace(/[\s\-()]/g, "");
}

/**
 * Validates a Ghana phone number and returns the normalized E.164-style value
 * (+233 followed by 9 digits).
 */
export function validateAndNormalizeGhanaPhone(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new PhoneValidationError("Phone number is required.");
  }

  assertPermittedCharacters(trimmed);
  assertBalancedParentheses(trimmed);

  const collapsed = collapsePresentation(trimmed);

  if (collapsed.startsWith("+233")) {
    const subscriber = collapsed.slice(4);
    if (subscriber.length !== 9 || !/^\d{9}$/.test(subscriber)) {
      throw new PhoneValidationError(
        "International Ghana numbers must use +233 followed by exactly 9 digits.",
      );
    }
    return `+233${subscriber}`;
  }

  if (collapsed.startsWith("0")) {
    if (collapsed.length !== 10 || !/^0\d{9}$/.test(collapsed)) {
      throw new PhoneValidationError(
        "Local Ghana numbers must contain exactly 10 digits beginning with 0.",
      );
    }
    return `+233${collapsed.slice(1)}`;
  }

  if (/^\d{8,9}$/.test(collapsed)) {
    throw new PhoneValidationError(
      "Incomplete local number: Ghana mobile numbers require exactly 10 digits beginning with 0.",
    );
  }

  if (collapsed.startsWith("233")) {
    throw new PhoneValidationError(
      "International Ghana numbers must start with +233 followed by exactly 9 digits.",
    );
  }

  throw new PhoneValidationError(
    "Enter a valid Ghana phone number (10-digit local or +233 international).",
  );
}

export function isValidGhanaPhone(input: string): boolean {
  try {
    validateAndNormalizeGhanaPhone(input);
    return true;
  } catch {
    return false;
  }
}

/** Readable local display: 0XX XXX XXXX */
export function formatGhanaPhoneForDisplay(input: string): string {
  const normalized = validateAndNormalizeGhanaPhone(input);
  const local = `0${normalized.slice(4)}`;
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}
