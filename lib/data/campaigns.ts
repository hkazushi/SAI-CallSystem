// キャンペーン リポジトリ
import type { Campaign, UUID } from "@/lib/supabase/types";
import { useDb, nowIso, newId } from "./_helpers";

const memory: Campaign[] = [];

function ensureSeed(orgId: UUID) {
  if (memory.some((c) => c.organization_id === orgId)) return;
  const sample: Array<Partial<Campaign> & { name: string; status: Campaign["status"]; direction: Campaign["direction"] }> = [
    { name: "4月新規開拓キャンペーン", status: "running", direction: "outbound" },
    { name: "既存顧客アップセル", status: "scheduled", direction: "outbound" },
    { name: "サポート窓口（インバウンド）", status: "running", direction: "inbound" },
    { name: "解約防止リコール", status: "completed", direction: "outbound" },
    { name: "アンケート（ドラフト）", status: "draft", direction: "outbound" },
  ];
  for (const s of sample) {
    memory.push({
      id: newId(),
      organization_id: orgId,
      workspace_id: null,
      project_id: null,
      name: s.name,
      description: null,
      direction: s.direction,
      status: s.status,
      contact_list_id: null,
      target_filter: null,
      start_at: nowIso(),
      end_at: null,
      timezone: "Asia/Tokyo",
      daily_window: { start: "09:00", end: "19:00" },
      allowed_weekdays: [1, 2, 3, 4, 5],
      concurrency: 1,
      retry_max: 2,
      retry_interval_min: 60,
      caller_id: null,
      prompt_override: null,
      first_message_override: null,
      goal_metric: "appointment_rate",
      goal_target: 0.2,
      total_targets: Math.floor(Math.random() * 500),
      total_dialed: Math.floor(Math.random() * 400),
      total_connected: Math.floor(Math.random() * 200),
      total_success: Math.floor(Math.random() * 80),
      total_failed: Math.floor(Math.random() * 50),
      created_by: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    });
  }
}

export interface CampaignListQuery {
  organizationId: UUID;
  status?: Campaign["status"];
  direction?: Campaign["direction"];
  limit?: number;
  cursor?: number;
}

export interface CampaignCreateInput {
  organizationId: UUID;
  workspaceId?: UUID | null;
  projectId?: UUID | null;
  name: string;
  description?: string | null;
  direction?: Campaign["direction"];
  contactListId?: UUID | null;
  startAt?: string | null;
  endAt?: string | null;
  concurrency?: number;
  callerId?: string | null;
  promptOverride?: string | null;
  firstMessageOverride?: string | null;
  goalMetric?: string;
  goalTarget?: number;
  createdBy?: UUID | null;
}

export const campaignsRepo = {
  async list(q: CampaignListQuery) {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      let query = getSupabaseAdmin()
        .from("campaigns")
        .select("*", { count: "exact" })
        .eq("organization_id", q.organizationId)
        .order("updated_at", { ascending: false })
        .range(q.cursor ?? 0, (q.cursor ?? 0) + (q.limit ?? 50) - 1);
      if (q.status) query = query.eq("status", q.status);
      if (q.direction) query = query.eq("direction", q.direction);
      const { data, error, count } = await query;
      if (error) throw error;
      return { items: (data ?? []) as Campaign[], total: count ?? 0 };
    }
    ensureSeed(q.organizationId);
    let items = memory.filter((c) => c.organization_id === q.organizationId);
    if (q.status) items = items.filter((c) => c.status === q.status);
    if (q.direction) items = items.filter((c) => c.direction === q.direction);
    items = items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const start = q.cursor ?? 0;
    const limit = q.limit ?? 50;
    return { items: items.slice(start, start + limit), total: items.length };
  },

  async get(organizationId: UUID, id: UUID): Promise<Campaign | null> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin()
        .from("campaigns")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as Campaign) ?? null;
    }
    ensureSeed(organizationId);
    return memory.find((c) => c.organization_id === organizationId && c.id === id) ?? null;
  },

  async create(input: CampaignCreateInput): Promise<Campaign> {
    const row: Campaign = {
      id: newId(),
      organization_id: input.organizationId,
      workspace_id: input.workspaceId ?? null,
      project_id: input.projectId ?? null,
      name: input.name,
      description: input.description ?? null,
      direction: input.direction ?? "outbound",
      status: "draft",
      contact_list_id: input.contactListId ?? null,
      target_filter: null,
      start_at: input.startAt ?? null,
      end_at: input.endAt ?? null,
      timezone: "Asia/Tokyo",
      daily_window: { start: "09:00", end: "19:00" },
      allowed_weekdays: [1, 2, 3, 4, 5],
      concurrency: input.concurrency ?? 1,
      retry_max: 2,
      retry_interval_min: 60,
      caller_id: input.callerId ?? null,
      prompt_override: input.promptOverride ?? null,
      first_message_override: input.firstMessageOverride ?? null,
      goal_metric: input.goalMetric ?? "appointment_rate",
      goal_target: input.goalTarget ?? null,
      total_targets: 0,
      total_dialed: 0,
      total_connected: 0,
      total_success: 0,
      total_failed: 0,
      created_by: input.createdBy ?? null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin().from("campaigns").insert(row).select("*").single();
      if (error) throw error;
      return data as Campaign;
    }
    memory.push(row);
    return row;
  },

  async updateStatus(organizationId: UUID, id: UUID, status: Campaign["status"]): Promise<Campaign | null> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin()
        .from("campaigns")
        .update({ status, updated_at: nowIso() })
        .eq("organization_id", organizationId)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data as Campaign) ?? null;
    }
    const idx = memory.findIndex((c) => c.organization_id === organizationId && c.id === id);
    if (idx < 0) return null;
    memory[idx] = { ...memory[idx], status, updated_at: nowIso() };
    return memory[idx];
  },
};
