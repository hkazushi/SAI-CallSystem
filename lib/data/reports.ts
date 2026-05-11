// レポート（週次/月次）リポジトリ
import type { UUID } from "@/lib/supabase/types";
import { useDb, nowIso, newId } from "./_helpers";

export type ReportPeriod = "daily" | "weekly" | "monthly" | "quarterly";
export type ReportStatus = "queued" | "generating" | "ready" | "failed";

export interface Report {
  id: UUID;
  organization_id: UUID;
  workspace_id: UUID | null;
  period: ReportPeriod;
  period_start: string;
  period_end: string;
  title: string;
  status: ReportStatus;
  /** AI生成サマリー (マークダウン) */
  summary_markdown: string | null;
  /** 集計済みKPIスナップショット */
  kpi_snapshot: Record<string, unknown> | null;
  /** AI生成にかかったコスト USD */
  generation_cost_usd: number | null;
  generated_by: UUID | null;
  generated_at: string | null;
  error_message: string | null;
  created_at: string;
}

const memoryStore: Report[] = [];

function ensureSeed(orgId: UUID) {
  if (memoryStore.some((r) => r.organization_id === orgId)) return;
  const now = new Date();
  const weekEnd = new Date(now);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  memoryStore.push({
    id: newId(),
    organization_id: orgId,
    workspace_id: null,
    period: "weekly",
    period_start: weekStart.toISOString(),
    period_end: weekEnd.toISOString(),
    title: `週次レポート（${weekStart.getMonth() + 1}/${weekStart.getDate()} 〜 ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}）`,
    status: "ready",
    summary_markdown: [
      "## エグゼクティブサマリー",
      "",
      "今週は **312件** の通話を実施し、接続率 **76%**・アポ獲得率 **18%** で先週比 +3pt の改善が見られた。",
      "特に **火曜・水曜の 13-15時** がコンバージョン最高水準で、運用シフトの集中投資が奏功している。",
      "",
      "## 主要 KPI",
      "",
      "- 通話数: 312件 (+8% w/w)",
      "- 接続率: 76% (+1.5pt)",
      "- アポ獲得率: 18% (+3pt)",
      "- 平均通話時間: 4分23秒",
      "- 平均スコア: 72点 (+2)",
      "",
      "## 注目トピック",
      "",
      "### 1. 反論パターンの変化",
      "「他社利用中」の反論が先週比 **+22%**。競合サービス導入企業が増えている兆候。",
      "対策: 比較訴求の切り返しトークを A/B テスト中（実験 #1 参照）。",
      "",
      "### 2. 失敗通話の傾向",
      "失敗 22件のうち **14件が録音同意の取得失敗**。冒頭文言の改善が急務。",
      "",
      "## 次週のアクション",
      "",
      "1. オペレーター向けに「他社利用中」反論への新スクリプトを共有",
      "2. 録音同意の冒頭文言を A/B テスト開始",
      "3. 火水 13-15時のシフトを 1名増員",
    ].join("\n"),
    kpi_snapshot: {
      totalCalls: 312,
      connectRate: 0.76,
      appointmentRate: 0.18,
      avgScore: 72,
    },
    generation_cost_usd: 0.045,
    generated_by: null,
    generated_at: nowIso(),
    error_message: null,
    created_at: nowIso(),
  });
}

export interface ReportListQuery {
  organizationId: UUID;
  period?: ReportPeriod;
  status?: ReportStatus;
  limit?: number;
}

export interface ReportCreateInput {
  organizationId: UUID;
  workspaceId?: UUID | null;
  period: ReportPeriod;
  periodStart: string;
  periodEnd: string;
  title: string;
  generatedBy?: UUID | null;
}

export const reportsRepo = {
  async list(q: ReportListQuery): Promise<Report[]> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const supabase = getSupabaseAdmin();
      let qb = supabase.from("reports").select("*").eq("organization_id", q.organizationId);
      if (q.period) qb = qb.eq("period", q.period);
      if (q.status) qb = qb.eq("status", q.status);
      const { data, error } = await qb.order("period_end", { ascending: false }).limit(q.limit ?? 50);
      if (error) throw error;
      return (data ?? []) as Report[];
    }
    ensureSeed(q.organizationId);
    let items = memoryStore.filter((r) => r.organization_id === q.organizationId);
    if (q.period) items = items.filter((r) => r.period === q.period);
    if (q.status) items = items.filter((r) => r.status === q.status);
    return items
      .sort((a, b) => b.period_end.localeCompare(a.period_end))
      .slice(0, q.limit ?? 50);
  },

  async get(id: UUID): Promise<Report | null> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data } = await getSupabaseAdmin().from("reports").select("*").eq("id", id).maybeSingle();
      return (data as Report) ?? null;
    }
    return memoryStore.find((r) => r.id === id) ?? null;
  },

  async create(input: ReportCreateInput): Promise<Report> {
    const row: Report = {
      id: newId(),
      organization_id: input.organizationId,
      workspace_id: input.workspaceId ?? null,
      period: input.period,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      title: input.title,
      status: "queued",
      summary_markdown: null,
      kpi_snapshot: null,
      generation_cost_usd: null,
      generated_by: input.generatedBy ?? null,
      generated_at: null,
      error_message: null,
      created_at: nowIso(),
    };
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin().from("reports").insert(row).select("*").single();
      if (error) throw error;
      return data as Report;
    }
    memoryStore.push(row);
    return row;
  },

  async update(id: UUID, patch: Partial<Pick<Report, "status" | "summary_markdown" | "kpi_snapshot" | "generation_cost_usd" | "generated_at" | "error_message">>): Promise<Report | null> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin().from("reports").update(patch).eq("id", id).select("*").single();
      if (error) throw error;
      return data as Report;
    }
    const idx = memoryStore.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    memoryStore[idx] = { ...memoryStore[idx], ...patch };
    return memoryStore[idx];
  },
};

/** 期間計算ヘルパー */
export function periodRange(period: ReportPeriod, anchor?: Date): { start: Date; end: Date; title: string } {
  const end = anchor ?? new Date();
  const start = new Date(end);
  let title = "";
  switch (period) {
    case "daily":
      start.setDate(start.getDate() - 1);
      title = `日次レポート（${end.getFullYear()}/${end.getMonth() + 1}/${end.getDate()}）`;
      break;
    case "weekly":
      start.setDate(start.getDate() - 7);
      title = `週次レポート（${start.getMonth() + 1}/${start.getDate()} 〜 ${end.getMonth() + 1}/${end.getDate()}）`;
      break;
    case "monthly":
      start.setMonth(start.getMonth() - 1);
      title = `月次レポート（${end.getFullYear()}/${end.getMonth() + 1}）`;
      break;
    case "quarterly":
      start.setMonth(start.getMonth() - 3);
      title = `四半期レポート（${end.getFullYear()} Q${Math.floor(end.getMonth() / 3) + 1}）`;
      break;
  }
  return { start, end, title };
}
