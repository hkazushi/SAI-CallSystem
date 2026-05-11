// データ層共通: in-memory ストア + Supabase 切り替え用のヘルパー

import { shouldUseSupabase } from "@/lib/supabase/env";

export function useDb(): boolean {
  return shouldUseSupabase();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}

export function paginate<T>(items: T[], cursor: number | undefined, limit = 50): { items: T[]; nextCursor: number | null } {
  const start = cursor ?? 0;
  const slice = items.slice(start, start + limit);
  const next = start + limit < items.length ? start + limit : null;
  return { items: slice, nextCursor: next };
}
