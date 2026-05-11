// 監査ログ書き込みヘルパー
// Supabase 未接続時はメモリに溜める (開発用)。本番は service_role 経由で audit_logs に INSERT。

import type { AuditLog, OrgRole, UUID } from "@/lib/supabase/types";
import { shouldUseSupabase } from "@/lib/supabase/env";

export interface AuditEntryInput {
  organizationId: UUID;
  workspaceId?: UUID | null;
  actorId?: UUID | null;
  actorEmail?: string | null;
  actorRole?: OrgRole | null;
  action: string;                    // 'project.create' 等
  resourceType?: string | null;
  resourceId?: UUID | null;
  resourceLabel?: string | null;
  status?: "success" | "failure" | "denied";
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
  errorMessage?: string | null;
}

const MEMORY_LIMIT = 500;
const memoryStore: AuditLog[] = [];

export async function recordAudit(entry: AuditEntryInput): Promise<void> {
  const row: AuditLog = {
    id: crypto.randomUUID(),
    organization_id: entry.organizationId,
    workspace_id: entry.workspaceId ?? null,
    actor_id: entry.actorId ?? null,
    actor_email: entry.actorEmail ?? null,
    actor_role: entry.actorRole ?? null,
    action: entry.action,
    resource_type: entry.resourceType ?? null,
    resource_id: entry.resourceId ?? null,
    resource_label: entry.resourceLabel ?? null,
    status: entry.status ?? "success",
    ip_address: entry.ipAddress ?? null,
    user_agent: entry.userAgent ?? null,
    request_id: entry.requestId ?? null,
    metadata: entry.metadata ?? {},
    error_message: entry.errorMessage ?? null,
    recorded_at: new Date().toISOString(),
  };

  if (shouldUseSupabase()) {
    try {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const admin = getSupabaseAdmin();
      const { error } = await admin.from("audit_logs").insert(row);
      if (error) throw error;
      return;
    } catch (e) {
      console.error("[audit] failed to write to supabase, falling back to memory:", e);
    }
  }

  memoryStore.push(row);
  if (memoryStore.length > MEMORY_LIMIT) memoryStore.shift();
}

export interface AuditListQuery {
  organizationId: UUID;
  limit?: number;
  cursor?: string | null;
  action?: string;
  actorId?: UUID;
  resourceType?: string;
  status?: "success" | "failure" | "denied";
  from?: string;          // ISO date
  to?: string;            // ISO date
}

export async function listAuditLogs(query: AuditListQuery): Promise<{ items: AuditLog[]; nextCursor: string | null }> {
  const limit = Math.min(query.limit ?? 50, 200);

  if (shouldUseSupabase()) {
    try {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const admin = getSupabaseAdmin();
      let q = admin
        .from("audit_logs")
        .select("*")
        .eq("organization_id", query.organizationId)
        .order("recorded_at", { ascending: false })
        .limit(limit + 1);

      if (query.action) q = q.eq("action", query.action);
      if (query.actorId) q = q.eq("actor_id", query.actorId);
      if (query.resourceType) q = q.eq("resource_type", query.resourceType);
      if (query.status) q = q.eq("status", query.status);
      if (query.from) q = q.gte("recorded_at", query.from);
      if (query.to) q = q.lte("recorded_at", query.to);
      if (query.cursor) q = q.lt("recorded_at", query.cursor);

      const { data, error } = await q;
      if (error) throw error;
      const items = (data ?? []) as AuditLog[];
      const hasMore = items.length > limit;
      const sliced = hasMore ? items.slice(0, limit) : items;
      const nextCursor = hasMore ? sliced[sliced.length - 1].recorded_at : null;
      return { items: sliced, nextCursor };
    } catch (e) {
      console.error("[audit] supabase list failed:", e);
    }
  }

  // メモリフォールバック
  let filtered = memoryStore.filter((r) => r.organization_id === query.organizationId);
  if (query.action) filtered = filtered.filter((r) => r.action === query.action);
  if (query.actorId) filtered = filtered.filter((r) => r.actor_id === query.actorId);
  if (query.resourceType) filtered = filtered.filter((r) => r.resource_type === query.resourceType);
  if (query.status) filtered = filtered.filter((r) => r.status === query.status);
  if (query.from) filtered = filtered.filter((r) => r.recorded_at >= query.from!);
  if (query.to) filtered = filtered.filter((r) => r.recorded_at <= query.to!);
  filtered = filtered.sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));
  if (query.cursor) filtered = filtered.filter((r) => r.recorded_at < query.cursor!);
  const sliced = filtered.slice(0, limit);
  const nextCursor = filtered.length > limit ? sliced[sliced.length - 1].recorded_at : null;
  return { items: sliced, nextCursor };
}

// 共通アクションキー (typo 防止)
export const AUDIT_ACTIONS = {
  PROJECT_CREATE: "project.create",
  PROJECT_UPDATE: "project.update",
  PROJECT_DELETE: "project.delete",
  PROJECT_DEPLOY_VAPI: "project.deploy.vapi",
  PROJECT_DEPLOY_DFCX: "project.deploy.dfcx",
  CALL_START: "call.start",
  CALL_TRANSFER: "call.transfer",
  CALL_END: "call.end",
  CONTACT_CREATE: "contact.create",
  CONTACT_UPDATE: "contact.update",
  CONTACT_IMPORT: "contact.import",
  CONTACT_DELETE: "contact.delete",
  CONTACT_DO_NOT_CALL: "contact.do_not_call",
  CONTACT_UPDATE_DNC: "contact.update_dnc",
  CAMPAIGN_CREATE: "campaign.create",
  CAMPAIGN_START: "campaign.start",
  CAMPAIGN_PAUSE: "campaign.pause",
  CAMPAIGN_COMPLETE: "campaign.complete",
  MEMBER_INVITE: "member.invite",
  MEMBER_ACCEPT: "member.accept",
  MEMBER_REMOVE: "member.remove",
  MEMBER_UPDATE_ROLE: "member.update_role",
  API_KEY_CREATE: "api_key.create",
  API_KEY_REVOKE: "api_key.revoke",
  WEBHOOK_CREATE: "webhook.create",
  WEBHOOK_DELETE: "webhook.delete",
  AI_EVAL_RUN: "ai_eval.run",
  EXPERIMENT_START: "experiment.start",
  EXPERIMENT_COMPLETE: "experiment.complete",
  REPORT_GENERATE: "report.generate",
  QUOTA_UPDATE: "quota.update",
  BILLING_UPDATE: "billing.update",
} as const;

export type AuditActionKey = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
