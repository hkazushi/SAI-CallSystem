// ダッシュボード集計
import type { UUID } from "@/lib/supabase/types";
import { useDb } from "./_helpers";
import { callsRepo } from "./calls";

export interface DashboardKpi {
  totalCalls: number;
  completedCalls: number;
  appointments: number;
  totalDurationSec: number;
  avgScore: number | null;
  avgDurationSec: number | null;
  connectRate: number | null;          // 接続率 = completed / total
  appointmentRate: number | null;       // アポ獲得率 = appointment / completed
  costUsd: number;
  byHour: Array<{ hour: string; count: number }>;        // 24時間
  byOutcome: Array<{ label: string; count: number }>;
  bySentiment: Array<{ label: string; count: number }>;
}

export interface DashboardQuery {
  organizationId: UUID;
  fromIso?: string;
  toIso?: string;
}

export const dashboardRepo = {
  async getKpi(q: DashboardQuery): Promise<DashboardKpi> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const supabase = getSupabaseAdmin();
      let query = supabase.from("calls").select("status,outcome,duration_seconds,score_overall,sentiment,cost_usd,started_at").eq("organization_id", q.organizationId);
      if (q.fromIso) query = query.gte("started_at", q.fromIso);
      if (q.toIso) query = query.lte("started_at", q.toIso);
      const { data, error } = await query;
      if (error) throw error;
      return aggregate(data ?? []);
    }
    const { items } = await callsRepo.list({ organizationId: q.organizationId, from: q.fromIso, to: q.toIso, limit: 1000 });
    return aggregate(items.map((c) => ({
      status: c.status,
      outcome: c.outcome,
      duration_seconds: c.duration_seconds,
      score_overall: c.score_overall,
      sentiment: c.sentiment,
      cost_usd: c.cost_usd,
      started_at: c.started_at,
    })));
  },
};

interface CallSlim {
  status: string;
  outcome: string | null;
  duration_seconds: number | null;
  score_overall: number | null;
  sentiment: string | null;
  cost_usd: number | null;
  started_at: string | null;
}

function aggregate(rows: CallSlim[]): DashboardKpi {
  const total = rows.length;
  const completed = rows.filter((r) => r.status === "completed").length;
  const appointments = rows.filter((r) => r.outcome === "appointment").length;
  const durationSec = rows.reduce((s, r) => s + (r.duration_seconds ?? 0), 0);
  const scores = rows.filter((r) => typeof r.score_overall === "number").map((r) => r.score_overall as number);
  const avgScore = scores.length ? scores.reduce((s, n) => s + n, 0) / scores.length : null;
  const avgDuration = completed ? durationSec / completed : null;
  const cost = rows.reduce((s, r) => s + (r.cost_usd ?? 0), 0);

  const hourBuckets = new Array(24).fill(0);
  for (const r of rows) {
    if (!r.started_at) continue;
    const h = new Date(r.started_at).getHours();
    hourBuckets[h]++;
  }
  const byHour = hourBuckets.map((c, i) => ({ hour: `${String(i).padStart(2, "0")}:00`, count: c }));

  const outcomeMap = new Map<string, number>();
  for (const r of rows) {
    const k = r.outcome ?? "未分類";
    outcomeMap.set(k, (outcomeMap.get(k) ?? 0) + 1);
  }
  const byOutcome = Array.from(outcomeMap.entries()).map(([label, count]) => ({ label, count }));

  const sentimentMap = new Map<string, number>();
  for (const r of rows) {
    const k = r.sentiment ?? "未分類";
    sentimentMap.set(k, (sentimentMap.get(k) ?? 0) + 1);
  }
  const bySentiment = Array.from(sentimentMap.entries()).map(([label, count]) => ({ label, count }));

  return {
    totalCalls: total,
    completedCalls: completed,
    appointments,
    totalDurationSec: durationSec,
    avgScore,
    avgDurationSec: avgDuration,
    connectRate: total ? completed / total : null,
    appointmentRate: completed ? appointments / completed : null,
    costUsd: cost,
    byHour,
    byOutcome,
    bySentiment,
  };
}
