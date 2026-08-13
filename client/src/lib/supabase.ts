import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readSupabasePublicConfig } from "@/lib/supabaseConfig";

let browserClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!browserClient) {
    const { url, publishableKey } = readSupabasePublicConfig();

    browserClient = createClient(url, publishableKey, {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return browserClient;
}

export function resetSupabaseClientForTests(): void {
  browserClient = null;
}
