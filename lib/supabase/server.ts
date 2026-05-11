// Supabase server client (RSC / route handler / server action 用)
// Cookie ベースのセッションを使用。ユーザー権限 (RLS) で動く。

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./env";

export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            store.set(name, value, options);
          }
        } catch {
          // Server Component から書き込み不可なケースは無視
        }
      },
    },
  });
}
