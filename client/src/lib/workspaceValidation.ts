export const MIN_WORKSPACE_NAME_LENGTH = 1;
export const MAX_WORKSPACE_NAME_LENGTH = 120;

export function validateWorkspaceName(name: string): string | null {
  const trimmed = name.trim();

  if (trimmed.length < MIN_WORKSPACE_NAME_LENGTH) {
    return "Workspace name is required.";
  }

  if (trimmed.length > MAX_WORKSPACE_NAME_LENGTH) {
    return `Workspace name must be ${MAX_WORKSPACE_NAME_LENGTH} characters or fewer.`;
  }

  return null;
}
