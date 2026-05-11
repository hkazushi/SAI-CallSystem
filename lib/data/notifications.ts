// 通知 リポジトリ
import type { Notification, UUID } from "@/lib/supabase/types";
import { useDb, nowIso, newId } from "./_helpers";

const memory: Notification[] = [];

function ensureSeed(orgId: UUID) {
  if (memory.some((n) => n.organization_id === orgId)) return;
  const seeds: Array<Partial<Notification> & { title: string; severity: Notification["severity"] }> = [
    { title: "新しいアポイントが獲得されました", severity: "success", body: "顧客「株式会社サンプル」とのアポイントが確定しました。", type: "appointment.created" },
    { title: "通話エラーが発生しました", severity: "error", body: "Vapi API でタイムアウトが発生し、通話 5件が失敗しました。", type: "call.failed" },
    { title: "月次利用量が80%に達しました", severity: "warning", body: "今月の通話分数があと20%で上限に達します。", type: "quota.warning" },
    { title: "AI 評価が完了しました", severity: "info", body: "本日 25 件の通話評価が完了しました。", type: "evaluation.completed" },
    { title: "コーチング提案があります", severity: "info", body: "下位3名のオペレーターに改善提案を生成しました。", type: "coaching.suggestion" },
  ];
  seeds.forEach((s, i) => {
    memory.push({
      id: newId(),
      organization_id: orgId,
      recipient_id: null,
      type: s.type ?? "system.info",
      severity: s.severity,
      title: s.title,
      body: s.body ?? null,
      action_url: null,
      metadata: {},
      read_at: i < 2 ? null : nowIso(),
      delivered_email: false,
      delivered_slack: false,
      created_at: new Date(Date.now() - i * 30 * 60 * 1000).toISOString(),
    });
  });
}

export interface NotificationListQuery {
  organizationId: UUID;
  recipientId?: UUID | null;
  unreadOnly?: boolean;
  limit?: number;
}

export const notificationsRepo = {
  async list(q: NotificationListQuery): Promise<{ items: Notification[]; unreadCount: number }> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      let query = getSupabaseAdmin()
        .from("notifications")
        .select("*")
        .eq("organization_id", q.organizationId)
        .order("created_at", { ascending: false })
        .limit(q.limit ?? 30);
      if (q.recipientId !== undefined) {
        if (q.recipientId === null) query = query.is("recipient_id", null);
        else query = query.eq("recipient_id", q.recipientId);
      }
      if (q.unreadOnly) query = query.is("read_at", null);
      const { data, error } = await query;
      if (error) throw error;
      const items = (data ?? []) as Notification[];
      const unreadCount = items.filter((n) => !n.read_at).length;
      return { items, unreadCount };
    }
    ensureSeed(q.organizationId);
    let items = memory.filter((n) => n.organization_id === q.organizationId);
    if (q.recipientId !== undefined) items = items.filter((n) => n.recipient_id === q.recipientId);
    if (q.unreadOnly) items = items.filter((n) => !n.read_at);
    items = items.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, q.limit ?? 30);
    const unreadCount = items.filter((n) => !n.read_at).length;
    return { items, unreadCount };
  },

  async create(input: Omit<Notification, "id" | "created_at" | "read_at" | "delivered_email" | "delivered_slack">): Promise<Notification> {
    const row: Notification = {
      ...input,
      id: newId(),
      read_at: null,
      delivered_email: false,
      delivered_slack: false,
      created_at: nowIso(),
    };
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin().from("notifications").insert(row).select("*").single();
      if (error) throw error;
      return data as Notification;
    }
    memory.push(row);
    return row;
  },

  async markRead(organizationId: UUID, id: UUID): Promise<void> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      await getSupabaseAdmin()
        .from("notifications")
        .update({ read_at: nowIso() })
        .eq("organization_id", organizationId)
        .eq("id", id);
      return;
    }
    const idx = memory.findIndex((n) => n.id === id && n.organization_id === organizationId);
    if (idx >= 0) memory[idx] = { ...memory[idx], read_at: nowIso() };
  },

  async markAllRead(organizationId: UUID, recipientId: UUID | null): Promise<number> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      let query = getSupabaseAdmin()
        .from("notifications")
        .update({ read_at: nowIso() })
        .eq("organization_id", organizationId)
        .is("read_at", null);
      if (recipientId === null) query = query.is("recipient_id", null);
      else query = query.eq("recipient_id", recipientId);
      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    }
    let n = 0;
    memory.forEach((row, i) => {
      if (row.organization_id === organizationId && !row.read_at && row.recipient_id === recipientId) {
        memory[i] = { ...row, read_at: nowIso() };
        n++;
      }
    });
    return n;
  },
};
