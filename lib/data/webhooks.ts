// Webhook 購読
import type { UUID } from "@/lib/supabase/types";
import { useDb, nowIso, newId } from "./_helpers";

export const WEBHOOK_EVENTS = [
  "call.started",
  "call.completed",
  "call.failed",
  "call.transferred",
  "appointment.booked",
  "appointment.canceled",
  "contact.opted_out",
  "campaign.completed",
  "ai_eval.completed",
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface Webhook {
  id: UUID;
  organization_id: UUID;
  name: string;
  url: string;
  events: WebhookEvent[];
  signing_secret_prefix: string;     // 表示用 (full secret は一度だけ)
  is_active: boolean;
  total_delivered: number;
  total_failed: number;
  last_delivered_at: string | null;
  last_error: string | null;
  created_by: UUID | null;
  created_at: string;
}

const memoryStore: Webhook[] = [];

function ensureSeed(orgId: UUID) {
  if (memoryStore.some((w) => w.organization_id === orgId)) return;
  memoryStore.push({
    id: newId(),
    organization_id: orgId,
    name: "Slack 通知（営業チーム）",
    url: "https://hooks.slack.com/services/T0XXX/B0XXX/sample",
    events: ["appointment.booked", "call.failed"],
    signing_secret_prefix: "whsec_sai_a3f1",
    is_active: true,
    total_delivered: 142,
    total_failed: 2,
    last_delivered_at: nowIso(),
    last_error: null,
    created_by: null,
    created_at: nowIso(),
  });
}

export interface WebhookCreateInput {
  organizationId: UUID;
  name: string;
  url: string;
  events: WebhookEvent[];
  createdBy?: UUID | null;
}

export const webhooksRepo = {
  async list(orgId: UUID): Promise<Webhook[]> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin().from("webhooks").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Webhook[];
    }
    ensureSeed(orgId);
    return memoryStore.filter((w) => w.organization_id === orgId);
  },

  async create(input: WebhookCreateInput): Promise<{ webhook: Webhook; signingSecret: string }> {
    const secretRaw = crypto.randomUUID().replace(/-/g, "");
    const prefix = `whsec_sai_${secretRaw.slice(0, 4)}`;
    const secret = `${prefix}_${secretRaw.slice(4)}`;
    const row: Webhook = {
      id: newId(),
      organization_id: input.organizationId,
      name: input.name,
      url: input.url,
      events: input.events,
      signing_secret_prefix: prefix,
      is_active: true,
      total_delivered: 0,
      total_failed: 0,
      last_delivered_at: null,
      last_error: null,
      created_by: input.createdBy ?? null,
      created_at: nowIso(),
    };
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin().from("webhooks").insert(row).select("*").single();
      if (error) throw error;
      return { webhook: data as Webhook, signingSecret: secret };
    }
    memoryStore.push(row);
    return { webhook: row, signingSecret: secret };
  },

  async toggle(orgId: UUID, id: UUID, active: boolean): Promise<boolean> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { error } = await getSupabaseAdmin().from("webhooks").update({ is_active: active }).eq("id", id).eq("organization_id", orgId);
      if (error) throw error;
      return true;
    }
    const idx = memoryStore.findIndex((w) => w.id === id && w.organization_id === orgId);
    if (idx === -1) return false;
    memoryStore[idx] = { ...memoryStore[idx], is_active: active };
    return true;
  },

  async delete(orgId: UUID, id: UUID): Promise<boolean> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { error } = await getSupabaseAdmin().from("webhooks").delete().eq("id", id).eq("organization_id", orgId);
      if (error) throw error;
      return true;
    }
    const idx = memoryStore.findIndex((w) => w.id === id && w.organization_id === orgId);
    if (idx === -1) return false;
    memoryStore.splice(idx, 1);
    return true;
  },
};
