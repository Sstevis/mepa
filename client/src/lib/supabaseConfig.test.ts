import { describe, expect, it, vi } from "vitest";

import {
  isSupabaseConfigured,
  readSupabasePublicConfig,
  SUPABASE_CONFIG_ERROR,
} from "@/lib/supabaseConfig";

describe("supabaseConfig", () => {
  it("reports missing public Supabase configuration", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");

    expect(isSupabaseConfigured()).toBe(false);
    expect(() => readSupabasePublicConfig()).toThrow(SUPABASE_CONFIG_ERROR);
  });

  it("reads trimmed public Supabase configuration", () => {
    vi.stubEnv("VITE_SUPABASE_URL", " https://example.supabase.co ");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", " public-key ");

    expect(isSupabaseConfigured()).toBe(true);
    expect(readSupabasePublicConfig()).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "public-key",
    });
  });
});
