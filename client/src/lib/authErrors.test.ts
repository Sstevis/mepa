import { afterEach, describe, expect, it, vi } from "vitest";

import {
  extractAuthErrorDetails,
  getAuthEmailRedirectUrl,
  logAuthErrorInDev,
  mapAuthErrorMessage,
} from "@/lib/authErrors";

describe("authErrors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds the email callback URL from the current origin", () => {
    expect(getAuthEmailRedirectUrl("http://localhost:5174")).toBe(
      "http://localhost:5174/auth/callback",
    );
    expect(getAuthEmailRedirectUrl("https://mepa-wheat.vercel.app")).toBe(
      "https://mepa-wheat.vercel.app/auth/callback",
    );
  });

  it("maps sign-up redirect errors to a safe actionable message", () => {
    expect(
      mapAuthErrorMessage({
        code: "validation_failed",
        status: 400,
        message: "redirect_to url is not allowed",
      }),
    ).toBe(
      "Email confirmation redirect URL is not allowed for this project. Add this app's /auth/callback URL in Supabase Auth redirect settings.",
    );
  });

  it("maps validation_failed sign-up errors to a safe actionable message", () => {
    expect(
      mapAuthErrorMessage({
        code: "validation_failed",
        status: 400,
        message: "Unable to validate request",
      }),
    ).toContain("Sign-up validation failed");
  });

  it("maps signup_disabled to a safe user-facing message", () => {
    expect(
      mapAuthErrorMessage({
        code: "signup_disabled",
        status: 403,
        message: "Signups not allowed for this instance",
      }),
    ).toBe("Sign-ups are disabled for this project.");
  });

  it("extracts only safe diagnostic fields from auth errors", () => {
    expect(
      extractAuthErrorDetails({
        code: "weak_password",
        status: 422,
        message: "Password should be at least 6 characters.",
      }),
    ).toEqual({
      code: "weak_password",
      status: 422,
      message: "Password should be at least 6 characters.",
    });
  });

  it("logs only code, status, and message in development", () => {
    vi.stubEnv("DEV", true);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logAuthErrorInDev("signUp", {
      code: "validation_failed",
      status: 400,
      message: "redirect_to url is not allowed",
    });

    expect(errorSpy).toHaveBeenCalledWith("[Mepa Auth] signUp", {
      code: "validation_failed",
      status: 400,
      message: "redirect_to url is not allowed",
    });

    const loggedPayload = JSON.stringify(errorSpy.mock.calls[0]);
    expect(loggedPayload).not.toMatch(/password|token|secret|VITE_/i);
  });

  it("does not log auth diagnostics outside development", () => {
    vi.stubEnv("DEV", false);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logAuthErrorInDev("signUp", {
      code: "signup_disabled",
      status: 403,
      message: "Signups not allowed",
    });

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
