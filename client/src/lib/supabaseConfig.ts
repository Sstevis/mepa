export const SUPABASE_CONFIG_ERROR =
  "Missing Supabase configuration. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local (see .env.example).";

export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const publishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  return Boolean(url && publishableKey);
}

export function readSupabasePublicConfig(): SupabasePublicConfig {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const publishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }

  return { url, publishableKey };
}
