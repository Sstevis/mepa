import type { AuthErrorDetails } from "@/lib/authErrors";

export function mapWorkspaceRpcErrorMessage(details: AuthErrorDetails): string {
  const { code, message } = details;
  const normalized = message.toLowerCase();

  if (
    code === "42501" ||
    normalized.includes("authentication required")
  ) {
    return "You must be signed in to create a workspace.";
  }

  if (
    code === "22023" ||
    normalized.includes("workspace name must be")
  ) {
    return "Enter a workspace name between 1 and 120 characters.";
  }

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network")
  ) {
    return "Could not reach the server. Check your connection and try again.";
  }

  return "Could not create the workspace. Please try again.";
}
