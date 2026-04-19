import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  const { url, key } = getSupabasePublicConfig();

  if (!url || !key) {
    throw new Error(
      "Отсутствуют переменные Supabase в серверной среде (NEXT_PUBLIC_SUPABASE_URL и публичный ключ)."
    );
  }

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: Record<string, unknown>) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });
}
