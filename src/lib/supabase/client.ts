"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig, isSupabasePublicEnvConfigured } from "@/lib/supabase/config";

export function createSupabaseBrowserClient() {
  const { url, key } = getSupabasePublicConfig();
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

export { isSupabasePublicEnvConfigured };
