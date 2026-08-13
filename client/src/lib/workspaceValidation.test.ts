import { describe, expect, it } from "vitest";

import {
  MAX_WORKSPACE_NAME_LENGTH,
  validateWorkspaceName,
} from "@/lib/workspaceValidation";

describe("validateWorkspaceName", () => {
  it("rejects blank names", () => {
    expect(validateWorkspaceName("")).toBe("Workspace name is required.");
    expect(validateWorkspaceName("   ")).toBe("Workspace name is required.");
  });

  it("rejects names longer than the database limit", () => {
    expect(validateWorkspaceName("a".repeat(MAX_WORKSPACE_NAME_LENGTH + 1))).toBe(
      `Workspace name must be ${MAX_WORKSPACE_NAME_LENGTH} characters or fewer.`,
    );
  });

  it("accepts trimmed names within limits", () => {
    expect(validateWorkspaceName("  Kwame Provisions  ")).toBeNull();
  });
});
