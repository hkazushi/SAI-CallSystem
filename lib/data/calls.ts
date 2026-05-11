// 通話 (calls) リポジトリ。mock 時は乱数で 60件サンプルを生成。
import type { Call, UUID } from "@/lib/supabase/types";
import { useDb, nowIso, newId } from "./_helpers";

const memory: Call[] = [];

function ensureSeed(orgId: UUID) {
  if (memory.some((c) => c.organization_id === orgId)) return;
  const outcomes = ["appointment", "rejected", "callback", "transfer", null] as const;
  const statuses: Call["status"][] = ["completed", "completed", "completed", "no_answer", "failed", "completed"];
  const sentiments = ["positive", "neutral", "negative"] as const;
  for (let i = 0; i < 60; i++) {
    const status = statuses[i % statuses.length];
    const started = new Date(Date.now() - i * 60 * 60 * 1000);
    const duration = status === "completed" ? 30 + Math.floor(Math.random() * 240) : null;
    memory.push({
      id: newId(),
      organization_id: orgId,
      workspace_id: null,
      project_id: null,
      campaign_id: null,
      contact_id: null,
      external_id: null,
      provider: i % 3 === 0 ? "dialogflow_cx" : "vapi",
      direction: i % 5 === 0 ? "inbound" : "outbound",
      from_number: "03-1234-5678",
      to_number: `090-1234-${String(1000 + i).slice(-4)}`,
      status,
      queued_at: started.toISOString(),
      started_at: started.toISOString(),
      answered_at: duration ? started.toISOString() : null,
      ended_at: duration ? new Date(started.getTime() + duration * 1000).toISOString() : null,
      duration_seconds: duration,
      ended_reason: status === "completed" ? "customer_hangup" : status,
      outcome: outcomes[i % outcomes.length],
      outcome_notes: null,
      appointment_at: outcomes[i % outcomes.length] === "appointment"
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : null,
      transfer_to: null,
      score_overall: status === "completed" ? 50 + Math.floor(Math.random() * 50) : null,
      score_components: null,
      summary: status === "completed" ? "顧客は前向き。次回フォロー予定。" : null,
      summary_short: status === "completed" ? "ポジティブ反応・要フォロー" : null,
      key_topics: status === "completed" ? ["価格", "導入時期", "競合比較"].slice(0, 1 + (i % 3)) : [],
      sentiment: sentiments[i % sentiments.length],
      recording_url: null,
      recording_provider: null,
      recording_duration_seconds: duration,
      cost_usd: duration ? duration * 0.0008 : null,
      cost_breakdown: null,
      metadata: {},
      raw_provider_payload: null,
      created_at: started.toISOString(),
      updated_at: started.toISOString(),
    });
  }
}

export interface CallListQuery {
  organizationId: UUID;
  projectId?: UUID;
  campaignId?: UUID;
  contactId?: UUID;
  status?: Call["status"];
  direction?: Call["direction"];
  outcome?: string;
  search?: string;             // summary / key_topics
  from?: string;               // ISO
  to?: string;
  limit?: number;
  cursor?: number;
}

export const callsRepo = {
  async list(q: CallListQuery) {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      let query = getSupabaseAdmin()
        .from("calls")
        .select("*", { count: "exact" })
        .eq("organization_id", q.organizationId)
        .order("started_at", { ascending: false, nullsFirst: false })
        .range(q.cursor ?? 0, (q.cursor ?? 0) + (q.limit ?? 50) - 1);
      if (q.projectId) query = query.eq("project_id", q.projectId);
      if (q.campaignId) query = query.eq("campaign_id", q.campaignId);
      if (q.contactId) query = query.eq("contact_id", q.contactId);
      if (q.status) query = query.eq("status", q.status);
      if (q.direction) query = query.eq("direction", q.direction);
      if (q.outcome) query = query.eq("outcome", q.outcome);
      if (q.from) query = query.gte("started_at", q.from);
      if (q.to) query = query.lte("started_at", q.to);
      const { data, error, count } = await query;
      if (error) throw error;
      return { items: (data ?? []) as Call[], total: count ?? 0 };
    }
    ensureSeed(q.organizationId);
    let items = memory.filter((c) => c.organization_id === q.organizationId);
    if (q.projectId) items = items.filter((c) => c.project_id === q.projectId);
    if (q.campaignId) items = items.filter((c) => c.campaign_id === q.campaignId);
    if (q.contactId) items = items.filter((c) => c.contact_id === q.contactId);
    if (q.status) items = items.filter((c) => c.status === q.status);
    if (q.direction) items = items.filter((c) => c.direction === q.direction);
    if (q.outcome) items = items.filter((c) => c.outcome === q.outcome);
    if (q.from) items = items.filter((c) => (c.started_at ?? "") >= q.from!);
    if (q.to) items = items.filter((c) => (c.started_at ?? "") <= q.to!);
    if (q.search) {
      const s = q.search.toLowerCase();
      items = items.filter((c) =>
        (c.summary ?? "").toLowerCase().includes(s) ||
        c.key_topics.some((t) => t.toLowerCase().includes(s)),
      );
    }
    items = items.sort((a, b) => (b.started_at ?? "").localeCompare(a.started_at ?? ""));
    const start = q.cursor ?? 0;
    const limit = q.limit ?? 50;
    return { items: items.slice(start, start + limit), total: items.length };
  },

  async get(organizationId: UUID, id: UUID): Promise<Call | null> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin()
        .from("calls")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as Call) ?? null;
    }
    ensureSeed(organizationId);
    return memory.find((c) => c.organization_id === organizationId && c.id === id) ?? null;
  },
};
