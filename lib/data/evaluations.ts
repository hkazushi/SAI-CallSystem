// AI 通話評価 リポジトリ
import type { AIEvaluation, UUID } from "@/lib/supabase/types";
import { useDb, nowIso, newId } from "./_helpers";

const memory: AIEvaluation[] = [];

export interface EvaluationListQuery {
  organizationId: UUID;
  callId?: UUID;
  status?: AIEvaluation["status"];
  limit?: number;
}

export interface EvaluationCreateInput {
  organizationId: UUID;
  callId: UUID;
  rubricId?: UUID | null;
  rubricVersion?: number | null;
  model?: string | null;
}

export interface EvaluationCompleteInput {
  scoreOverall: number;
  scores: Record<string, number>;
  summary: string;
  summaryShort?: string;
  highlights?: Array<{ type: string; quote: string; reason: string }>;
  issues?: Array<{ type: string; quote: string; reason: string; severity?: string }>;
  nextActions?: string[];
  customerIntent?: string | null;
  classification?: string | null;
  promptTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  latencyMs?: number;
  rawResponse?: Record<string, unknown>;
}

export const evaluationsRepo = {
  async list(q: EvaluationListQuery): Promise<AIEvaluation[]> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      let query = getSupabaseAdmin()
        .from("ai_evaluations")
        .select("*")
        .eq("organization_id", q.organizationId)
        .order("created_at", { ascending: false })
        .limit(q.limit ?? 100);
      if (q.callId) query = query.eq("call_id", q.callId);
      if (q.status) query = query.eq("status", q.status);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as AIEvaluation[];
    }
    let items = memory.filter((e) => e.organization_id === q.organizationId);
    if (q.callId) items = items.filter((e) => e.call_id === q.callId);
    if (q.status) items = items.filter((e) => e.status === q.status);
    return items.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, q.limit ?? 100);
  },

  async getByCall(organizationId: UUID, callId: UUID): Promise<AIEvaluation | null> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin()
        .from("ai_evaluations")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("call_id", callId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as AIEvaluation) ?? null;
    }
    const found = memory
      .filter((e) => e.organization_id === organizationId && e.call_id === callId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return found[0] ?? null;
  },

  async create(input: EvaluationCreateInput): Promise<AIEvaluation> {
    const row: AIEvaluation = {
      id: newId(),
      organization_id: input.organizationId,
      call_id: input.callId,
      rubric_id: input.rubricId ?? null,
      rubric_version: input.rubricVersion ?? null,
      model: input.model ?? "claude-sonnet-4-6",
      status: "pending",
      score_overall: null,
      scores: {},
      summary: null,
      summary_short: null,
      highlights: null,
      issues: null,
      next_actions: [],
      customer_intent: null,
      classification: null,
      prompt_tokens: null,
      output_tokens: null,
      cost_usd: null,
      latency_ms: null,
      raw_response: null,
      error_message: null,
      created_at: nowIso(),
      completed_at: null,
    };
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin().from("ai_evaluations").insert(row).select("*").single();
      if (error) throw error;
      return data as AIEvaluation;
    }
    memory.push(row);
    return row;
  },

  async markRunning(organizationId: UUID, id: UUID): Promise<void> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      await getSupabaseAdmin()
        .from("ai_evaluations")
        .update({ status: "running" })
        .eq("organization_id", organizationId)
        .eq("id", id);
      return;
    }
    const idx = memory.findIndex((e) => e.id === id && e.organization_id === organizationId);
    if (idx >= 0) memory[idx] = { ...memory[idx], status: "running" };
  },

  async complete(organizationId: UUID, id: UUID, payload: EvaluationCompleteInput): Promise<AIEvaluation | null> {
    const patch: Partial<AIEvaluation> = {
      status: "completed",
      score_overall: payload.scoreOverall,
      scores: payload.scores,
      summary: payload.summary,
      summary_short: payload.summaryShort ?? null,
      highlights: payload.highlights ?? null,
      issues: payload.issues ?? null,
      next_actions: payload.nextActions ?? [],
      customer_intent: payload.customerIntent ?? null,
      classification: payload.classification ?? null,
      prompt_tokens: payload.promptTokens ?? null,
      output_tokens: payload.outputTokens ?? null,
      cost_usd: payload.costUsd ?? null,
      latency_ms: payload.latencyMs ?? null,
      raw_response: payload.rawResponse ?? null,
      completed_at: nowIso(),
    };
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin()
        .from("ai_evaluations")
        .update(patch)
        .eq("organization_id", organizationId)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data as AIEvaluation) ?? null;
    }
    const idx = memory.findIndex((e) => e.id === id && e.organization_id === organizationId);
    if (idx < 0) return null;
    memory[idx] = { ...memory[idx], ...patch } as AIEvaluation;
    return memory[idx];
  },

  async fail(organizationId: UUID, id: UUID, error: string): Promise<void> {
    const patch = { status: "failed" as const, error_message: error, completed_at: nowIso() };
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      await getSupabaseAdmin()
        .from("ai_evaluations")
        .update(patch)
        .eq("organization_id", organizationId)
        .eq("id", id);
      return;
    }
    const idx = memory.findIndex((e) => e.id === id && e.organization_id === organizationId);
    if (idx >= 0) memory[idx] = { ...memory[idx], ...patch };
  },
};
