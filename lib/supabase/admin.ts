// Supabase service_role (admin) client. RLS をバイパスする。
// 必ず Edge Function / route handler / server action 内でのみ使う。
// 環境変数 SUPABASE_SERVICE_ROLE_KEY が無ければ throw する。

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  isSupabaseConfigured,
} from "./env";

// 生成された Database 型を後で入れる場合は SupabaseClient<Database> に置き換える。
// 現状は Database 型を生成していないので any キャストで table 名を自由に書ける状態にする。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

let cached: AdminClient | null = null;

export function getSupabaseAdmin(): AdminClient {
  if (!isSupabaseConfigured() || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase admin client is not configured (SUPABASE_SERVICE_ROLE_KEY required).");
  }
  if (!cached) {
    cached = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-application": "sai-callsystem" } },
    }) as AdminClient;
  }
  return cached;
}
