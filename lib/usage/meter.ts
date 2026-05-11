// 使用量メーター: 1イベント1呼び出しで記録 → usage_events に INSERT。
// Supabase 未接続時はメモリに蓄積する。

import type { UsageDaily, UsageEvent, UUID } from "@/lib/supabase/types";
import { shouldUseSupabase } from "@/lib/supabase/env";

export type UsageMetric =
  | "call.minutes"
  | "llm.input_tokens"
  | "llm.output_tokens"
  | "stt.seconds"
  | "tts.characters"
  | "storage.bytes_hour";

export interface UsageEventInput {
  organizationId: UUID;
  workspaceId?: UUID | null;
  projectId?: UUID | null;
  callId?: UUID | null;
  metric: UsageMetric;
  provider?: string;
  quantity: number;
  unitCostUsd?: number;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

const memoryEvents: UsageEvent[] = [];
const memoryDaily: UsageDaily[] = [];

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function rollupInMemory(ev: UsageEvent) {
  const day = dayKey(ev.occurred_at);
  const provider = ev.provider ?? "";
  const idx = memoryDaily.findIndex(
    (r) =>
      r.organization_id === ev.organization_id &&
      r.workspace_id === ev.workspace_id &&
      r.project_id === ev.project_id &&
      r.day === day &&
      r.metric === ev.metric &&
      r.provider === provider,
  );
  if (idx >= 0) {
    memoryDaily[idx].quantity += ev.quantity;
    memoryDaily[idx].cost_usd += ev.cost_usd ?? 0;
  } else {
    memoryDaily.push({
      organization_id: ev.organization_id,
      workspace_id: ev.workspace_id,
      project_id: ev.project_id,
      day,
      metric: ev.metric,
      provider,
      quantity: ev.quantity,
      cost_usd: ev.cost_usd ?? 0,
    });
  }
}

export async function recordUsage(input: UsageEventInput): Promise<void> {
  const cost = input.unitCostUsd != null ? input.unitCostUsd * input.quantity : undefined;
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const ev: UsageEvent = {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    workspace_id: input.workspaceId ?? null,
    project_id: input.projectId ?? null,
    call_id: input.callId ?? null,
    metric: input.metric,
    provider: input.provider ?? null,
    quantity: input.quantity,
    unit_cost_usd: input.unitCostUsd ?? null,
    cost_usd: cost ?? null,
    metadata: input.metadata ?? {},
    occurred_at: occurredAt,
  };

  if (shouldUseSupabase()) {
    try {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const admin = getSupabaseAdmin();
      const { error } = await admin.from("usage_events").insert(ev);
      if (error) throw error;
      return;
    } catch (e) {
      console.error("[usage] supabase insert failed, falling back to memory:", e);
    }
  }

  memoryEvents.push(ev);
  rollupInMemory(ev);
  // 過大な肥大化を防ぐ
  if (memoryEvents.length > 5000) memoryEvents.splice(0, memoryEvents.length - 5000);
}

// バルク (n通の events を一気に書く)
export async function recordUsageBatch(events: UsageEventInput[]): Promise<void> {
  for (const e of events) {
    await recordUsage(e);
  }
}

// 今月の合計 (organization)
export interface CurrentMonthUsage {
  callMinutes: number;
  llmInputTokens: number;
  llmOutputTokens: number;
  sttSeconds: number;
  ttsCharacters: number;
  totalCostUsd: number;
  byProvider: Record<string, number>;
}

export async function getCurrentMonthUsage(organizationId: UUID): Promise<CurrentMonthUsage> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthIso = monthStart.toISOString().slice(0, 10);

  let rows: UsageDaily[] = [];

  if (shouldUseSupabase()) {
    try {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const admin = getSupabaseAdmin();
      const { data, error } = await admin
        .from("usage_daily")
        .select("*")
        .eq("organization_id", organizationId)
        .gte("day", monthIso);
      if (error) throw error;
      rows = (data ?? []) as UsageDaily[];
    } catch (e) {
      console.error("[usage] supabase month read failed:", e);
      rows = memoryDaily.filter((r) => r.organization_id === organizationId && r.day >= monthIso);
    }
  } else {
    rows = memoryDaily.filter((r) => r.organization_id === organizationId && r.day >= monthIso);
  }

  const acc: CurrentMonthUsage = {
    callMinutes: 0,
    llmInputTokens: 0,
    llmOutputTokens: 0,
    sttSeconds: 0,
    ttsCharacters: 0,
    totalCostUsd: 0,
    byProvider: {},
  };
  for (const r of rows) {
    switch (r.metric) {
      case "call.minutes": acc.callMinutes += r.quantity; break;
      case "llm.input_tokens": acc.llmInputTokens += r.quantity; break;
      case "llm.output_tokens": acc.llmOutputTokens += r.quantity; break;
      case "stt.seconds": acc.sttSeconds += r.quantity; break;
      case "tts.characters": acc.ttsCharacters += r.quantity; break;
    }
    acc.totalCostUsd += Number(r.cost_usd ?? 0);
    const p = r.provider || "unknown";
    acc.byProvider[p] = (acc.byProvider[p] ?? 0) + Number(r.cost_usd ?? 0);
  }
  return acc;
}

// クォータ判定: 上限を超えていないか
export interface QuotaCheckResult {
  ok: boolean;
  metric: UsageMetric;
  used: number;
  limit: number;
  percentage: number;
}

export async function checkQuota(
  organizationId: UUID,
  metric: UsageMetric,
  limit: number,
): Promise<QuotaCheckResult> {
  const month = await getCurrentMonthUsage(organizationId);
  const used = (
    metric === "call.minutes" ? month.callMinutes :
    metric === "llm.input_tokens" ? month.llmInputTokens :
    metric === "llm.output_tokens" ? month.llmOutputTokens :
    metric === "stt.seconds" ? month.sttSeconds :
    metric === "tts.characters" ? month.ttsCharacters :
    0
  );
  return {
    ok: used < limit,
    metric,
    used,
    limit,
    percentage: limit > 0 ? (used / limit) * 100 : 0,
  };
}

// LLM コスト単価 (USD/1M token) — 概算。本番では設定ファイル化推奨
export const LLM_PRICING_USD_PER_M_TOKENS: Record<string, { input: number; output: number }> = {
  "claude-opus-4-7":   { input: 15,  output: 75 },
  "claude-sonnet-4-6": { input: 3,   output: 15 },
  "claude-haiku-4-5":  { input: 0.8, output: 4 },
  "gpt-4o":            { input: 5,   output: 15 },
  "gpt-4o-mini":       { input: 0.15, output: 0.6 },
};

export function estimateLlmCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = LLM_PRICING_USD_PER_M_TOKENS[model];
  if (!p) return 0;
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}
