// Supabase 接続用の環境変数アクセサ。
// 未設定の場合は `isSupabaseConfigured()` が false になり、データ層は mock にフォールバックする。

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

export const DATA_SOURCE = (process.env.DATA_SOURCE ?? "mock").toLowerCase() as "mock" | "supabase";

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function shouldUseSupabase(): boolean {
  return DATA_SOURCE === "supabase" && isSupabaseConfigured();
}
