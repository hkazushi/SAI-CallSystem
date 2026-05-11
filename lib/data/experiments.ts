// A/B 実験 リポジトリ
import type { UUID } from "@/lib/supabase/types";
import { useDb, nowIso, newId } from "./_helpers";

export interface Experiment {
  id: UUID;
  organization_id: UUID;
  project_id: UUID | null;
  campaign_id: UUID | null;
  name: string;
  hypothesis: string | null;
  status: "draft" | "running" | "paused" | "completed" | "archived";
  primary_metric: string;
  secondary_metrics: string[];
  traffic_allocation: number;
  guardrails: Record<string, unknown>;
  start_at: string | null;
  end_at: string | null;
  winner_arm_id: UUID | null;
  created_by: UUID | null;
  created_at: string;
  updated_at: string;
}

export interface ExperimentArm {
  id: UUID;
  experiment_id: UUID;
  organization_id: UUID;
  name: string;
  description: string | null;
  is_control: boolean;
  allocation_weight: number;
  prompt_override: string | null;
  first_message_override: string | null;
  voice_override: string | null;
  config: Record<string, unknown>;
  total_assigned: number;
  total_completed: number;
  total_success: number;
  metric_sum: number;
  metric_count: number;
  created_at: string;
}

const experiments: Experiment[] = [];
const arms: ExperimentArm[] = [];

function ensureSeed(orgId: UUID) {
  if (experiments.some((e) => e.organization_id === orgId)) return;
  const expId = newId();
  experiments.push({
    id: expId,
    organization_id: orgId,
    project_id: null,
    campaign_id: null,
    name: "オープニング文言 A/B テスト",
    hypothesis: "明示的に社名を名乗らないほうがアポ率が上がる",
    status: "running",
    primary_metric: "appointment_rate",
    secondary_metrics: ["avg_duration_seconds", "completion_rate"],
    traffic_allocation: 1.0,
    guardrails: { max_negative_rate: 0.3 },
    start_at: nowIso(),
    end_at: null,
    winner_arm_id: null,
    created_by: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  const armA = newId();
  const armB = newId();
  arms.push(
    {
      id: armA,
      experiment_id: expId,
      organization_id: orgId,
      name: "Aパターン（社名あり）",
      description: "「SAIの田中と申します」と社名を名乗る",
      is_control: true,
      allocation_weight: 0.5,
      prompt_override: null,
      first_message_override: "お世話になっております。SAIの田中と申します。少々お時間よろしいでしょうか？",
      voice_override: null,
      config: {},
      total_assigned: 120,
      total_completed: 95,
      total_success: 18,
      metric_sum: 18,
      metric_count: 95,
      created_at: nowIso(),
    },
    {
      id: armB,
      experiment_id: expId,
      organization_id: orgId,
      name: "Bパターン（社名なし）",
      description: "「田中と申します」のみで社名は質問されたら答える",
      is_control: false,
      allocation_weight: 0.5,
      prompt_override: null,
      first_message_override: "お世話になっております。田中と申します。少々お時間よろしいでしょうか？",
      voice_override: null,
      config: {},
      total_assigned: 118,
      total_completed: 100,
      total_success: 27,
      metric_sum: 27,
      metric_count: 100,
      created_at: nowIso(),
    },
  );
}

export interface ExperimentListQuery {
  organizationId: UUID;
  status?: Experiment["status"];
}

export interface ExperimentCreateInput {
  organizationId: UUID;
  projectId?: UUID | null;
  campaignId?: UUID | null;
  name: string;
  hypothesis?: string | null;
  primaryMetric: string;
  secondaryMetrics?: string[];
  trafficAllocation?: number;
  createdBy?: UUID | null;
}

export const experimentsRepo = {
  async list(q: ExperimentListQuery): Promise<Array<Experiment & { arms: ExperimentArm[] }>> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const supabase = getSupabaseAdmin();
      let expQuery = supabase.from("experiments").select("*").eq("organization_id", q.organizationId);
      if (q.status) expQuery = expQuery.eq("status", q.status);
      const { data: expData, error } = await expQuery.order("created_at", { ascending: false });
      if (error) throw error;
      const expList = (expData ?? []) as Experiment[];
      const ids = expList.map((e) => e.id);
      if (!ids.length) return [];
      const { data: armData } = await supabase.from("experiment_arms").select("*").in("experiment_id", ids);
      const armsByExp = new Map<UUID, ExperimentArm[]>();
      for (const a of (armData ?? []) as ExperimentArm[]) {
        if (!armsByExp.has(a.experiment_id)) armsByExp.set(a.experiment_id, []);
        armsByExp.get(a.experiment_id)!.push(a);
      }
      return expList.map((e) => ({ ...e, arms: armsByExp.get(e.id) ?? [] }));
    }
    ensureSeed(q.organizationId);
    let items = experiments.filter((e) => e.organization_id === q.organizationId);
    if (q.status) items = items.filter((e) => e.status === q.status);
    return items.map((e) => ({ ...e, arms: arms.filter((a) => a.experiment_id === e.id) }));
  },

  async create(input: ExperimentCreateInput): Promise<Experiment> {
    const row: Experiment = {
      id: newId(),
      organization_id: input.organizationId,
      project_id: input.projectId ?? null,
      campaign_id: input.campaignId ?? null,
      name: input.name,
      hypothesis: input.hypothesis ?? null,
      status: "draft",
      primary_metric: input.primaryMetric,
      secondary_metrics: input.secondaryMetrics ?? [],
      traffic_allocation: input.trafficAllocation ?? 1.0,
      guardrails: {},
      start_at: null,
      end_at: null,
      winner_arm_id: null,
      created_by: input.createdBy ?? null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin().from("experiments").insert(row).select("*").single();
      if (error) throw error;
      return data as Experiment;
    }
    experiments.push(row);
    return row;
  },

  /**
   * Hash-based decisive assignment.
   * Given a key (e.g. contact_id), deterministically chooses an arm by weight.
   */
  pickArm(armsForExp: ExperimentArm[], key: string): ExperimentArm | null {
    if (!armsForExp.length) return null;
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const r = (h >>> 0) / 0xffffffff;
    const total = armsForExp.reduce((s, a) => s + a.allocation_weight, 0);
    let cur = 0;
    for (const a of armsForExp) {
      cur += a.allocation_weight / total;
      if (r < cur) return a;
    }
    return armsForExp[armsForExp.length - 1];
  },
};
