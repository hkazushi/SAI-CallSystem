// Supabase browser client ("use client" コンポーネント用)
"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./env";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowser() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured in the browser bundle.");
  }
  if (!cached) {
    cached = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return cached;
}
