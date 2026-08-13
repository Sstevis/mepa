import { describe, expect, it } from "vitest";

import {
  formatGhanaPhoneForDisplay,
  PhoneValidationError,
  validateAndNormalizeGhanaPhone,
} from "./ghanaPhone";

describe("ghanaPhone", () => {
  it("accepts valid 10-digit local numbers", () => {
    expect(validateAndNormalizeGhanaPhone("0244123456")).toBe("+233244123456");
  });

  it("accepts spaced local numbers", () => {
    expect(validateAndNormalizeGhanaPhone("024 412 3456")).toBe("+233244123456");
  });

  it("accepts hyphenated local numbers", () => {
    expect(validateAndNormalizeGhanaPhone("024-412-3456")).toBe("+233244123456");
  });

  it("accepts local numbers with permitted parentheses", () => {
    expect(validateAndNormalizeGhanaPhone("(024) 412-3456")).toBe(
      "+233244123456",
    );
  });

  it("accepts international +233 numbers", () => {
    expect(validateAndNormalizeGhanaPhone("+233244123456")).toBe(
      "+233244123456",
    );
  });

  it("accepts spaced international numbers", () => {
    expect(validateAndNormalizeGhanaPhone("+233 24 412 3456")).toBe(
      "+233244123456",
    );
  });

  it("normalizes accepted values to +233XXXXXXXXX", () => {
    expect(validateAndNormalizeGhanaPhone("055 123 7890")).toBe(
      "+233551237890",
    );
    expect(validateAndNormalizeGhanaPhone("020 987 6543")).toBe(
      "+233209876543",
    );
    expect(validateAndNormalizeGhanaPhone("0244555666")).toBe("+233244555666");
  });

  it("formats normalized numbers for readable display", () => {
    expect(formatGhanaPhoneForDisplay("+233244123456")).toBe("024 412 3456");
    expect(formatGhanaPhoneForDisplay("024-412-3456")).toBe("024 412 3456");
  });

  it("formats normalized stored values for readable display", () => {
    expect(formatGhanaPhoneForDisplay("+233244555666")).toBe("024 455 5666");
  });

  it("does not silently repair incomplete numbers for display", () => {
    expect(() => formatGhanaPhoneForDisplay("024412345")).toThrow(
      PhoneValidationError,
    );
  });

  it("rejects 8-digit local inputs", () => {
    expect(() => validateAndNormalizeGhanaPhone("24412345")).toThrow(
      PhoneValidationError,
    );
  });

  it("rejects 9-digit local inputs", () => {
    expect(() => validateAndNormalizeGhanaPhone("024412345")).toThrow(
      PhoneValidationError,
    );
    expect(() => validateAndNormalizeGhanaPhone("244123456")).toThrow(
      PhoneValidationError,
    );
  });

  it("rejects incomplete international numbers", () => {
    expect(() => validateAndNormalizeGhanaPhone("+23324412345")).toThrow(
      PhoneValidationError,
    );
    expect(() => validateAndNormalizeGhanaPhone("+2332441234567")).toThrow(
      PhoneValidationError,
    );
  });

  it("rejects letters", () => {
    expect(() => validateAndNormalizeGhanaPhone("024ABC3456")).toThrow(
      "Phone number must not contain letters.",
    );
  });

  it("rejects multiple plus signs", () => {
    expect(() => validateAndNormalizeGhanaPhone("+233+244123456")).toThrow(
      "Phone number must not contain multiple plus signs.",
    );
  });

  it("rejects malformed punctuation", () => {
    expect(() => validateAndNormalizeGhanaPhone("(024 412 3456")).toThrow(
      PhoneValidationError,
    );
    expect(() => validateAndNormalizeGhanaPhone("024--412-3456")).toThrow(
      PhoneValidationError,
    );
  });

  it("rejects international numbers missing the leading plus", () => {
    expect(() => validateAndNormalizeGhanaPhone("233244123456")).toThrow(
      PhoneValidationError,
    );
  });

  it("accepts all existing seed-record phone formats", () => {
    const seedPhones = [
      "024 412 3456",
      "055 123 7890",
      "020 987 6543",
      "0244555666",
    ];

    for (const phone of seedPhones) {
      expect(validateAndNormalizeGhanaPhone(phone)).toMatch(/^\+233\d{9}$/);
    }
  });
});
