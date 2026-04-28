// Supabase クライアント (browser & server 共通)
// 認証はまだ未導入なので anon キーで RLS を信用する設計。
// 後でAuth導入したら createServerClient + cookies に切替。

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です。");
  }
  cached = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return !!url && !!anonKey;
}
