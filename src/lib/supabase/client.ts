"use client";

import { createBrowserClient } from "@supabase/ssr";

function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return { url, key };
}

export function isSupabasePublicEnvConfigured() {
  const { url, key } = getSupabasePublicConfig();
  return Boolean(url && key);
}

export function createSupabaseBrowserClient() {
  const { url, key } = getSupabasePublicConfig();
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
