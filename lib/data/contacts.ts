// 顧客リスト (contacts) リポジトリ
// Supabase 未接続時はメモリ。検索/フィルタは小規模前提で全件走査。

import type { Contact, UUID } from "@/lib/supabase/types";
import { useDb, nowIso, newId } from "./_helpers";

const memory: Contact[] = [];

function ensureSeed(orgId: UUID) {
  if (memory.some((c) => c.organization_id === orgId)) return;
  const names = ["田中 太郎", "鈴木 花子", "佐藤 一郎", "山本 二郎", "高橋 三郎", "伊藤 美咲", "渡辺 健太", "中村 真理", "小林 大輔", "加藤 由紀"];
  const companies = ["株式会社サンプル", "デモ商事", "テスト工業", "実証テック", "山田製作所"];
  const tags = ["新規", "既存", "VIP", "見込み", "保留"];
  for (let i = 0; i < 25; i++) {
    memory.push({
      id: newId(),
      organization_id: orgId,
      workspace_id: null,
      phone_number: `0901234${String(1000 + i).slice(-4)}`,
      email: `customer${i + 1}@example.com`,
      full_name: names[i % names.length],
      furigana: null,
      company: companies[i % companies.length],
      position: i % 3 === 0 ? "代表取締役" : "担当者",
      address: "東京都港区",
      tags: [tags[i % tags.length]],
      attributes: { industry: i % 2 === 0 ? "IT" : "製造" },
      do_not_call: i === 7,                                       // 1件だけ DNC
      do_not_call_reason: i === 7 ? "本人申し出による" : null,
      consent_status: i % 4 === 0 ? "opted_in" : "unknown",
      consent_recorded_at: null,
      source: "manual",
      external_id: null,
      last_called_at: null,
      last_call_outcome: null,
      total_calls: 0,
      created_by: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    });
  }
}

export interface ContactListQuery {
  organizationId: UUID;
  workspaceId?: UUID | null;
  search?: string;            // 名前 / 会社名 / 電話番号
  tags?: string[];
  doNotCall?: boolean;
  consent?: Contact["consent_status"];
  limit?: number;
  cursor?: number;
}

export interface ContactCreateInput {
  organizationId: UUID;
  workspaceId?: UUID | null;
  phoneNumber?: string | null;
  email?: string | null;
  fullName?: string | null;
  furigana?: string | null;
  company?: string | null;
  position?: string | null;
  address?: string | null;
  tags?: string[];
  attributes?: Record<string, unknown>;
  source?: string;
  externalId?: string;
  createdBy?: UUID | null;
}

export const contactsRepo = {
  async list(q: ContactListQuery) {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      let query = getSupabaseAdmin()
        .from("contacts")
        .select("*", { count: "exact" })
        .eq("organization_id", q.organizationId)
        .order("updated_at", { ascending: false })
        .range(q.cursor ?? 0, (q.cursor ?? 0) + (q.limit ?? 50) - 1);
      if (q.workspaceId) query = query.eq("workspace_id", q.workspaceId);
      if (q.doNotCall !== undefined) query = query.eq("do_not_call", q.doNotCall);
      if (q.consent) query = query.eq("consent_status", q.consent);
      if (q.tags && q.tags.length) query = query.contains("tags", q.tags);
      if (q.search) {
        query = query.or(`full_name.ilike.%${q.search}%,company.ilike.%${q.search}%,phone_number.ilike.%${q.search}%`);
      }
      const { data, error, count } = await query;
      if (error) throw error;
      return { items: (data ?? []) as Contact[], total: count ?? 0 };
    }

    ensureSeed(q.organizationId);
    let items = memory.filter((c) => c.organization_id === q.organizationId);
    if (q.workspaceId) items = items.filter((c) => c.workspace_id === q.workspaceId);
    if (q.doNotCall !== undefined) items = items.filter((c) => c.do_not_call === q.doNotCall);
    if (q.consent) items = items.filter((c) => c.consent_status === q.consent);
    if (q.tags && q.tags.length) items = items.filter((c) => q.tags!.every((t) => c.tags.includes(t)));
    if (q.search) {
      const s = q.search.toLowerCase();
      items = items.filter((c) =>
        (c.full_name ?? "").toLowerCase().includes(s) ||
        (c.company ?? "").toLowerCase().includes(s) ||
        (c.phone_number ?? "").includes(s),
      );
    }
    items = items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const start = q.cursor ?? 0;
    const limit = q.limit ?? 50;
    return { items: items.slice(start, start + limit), total: items.length };
  },

  async get(organizationId: UUID, id: UUID): Promise<Contact | null> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin()
        .from("contacts")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as Contact) ?? null;
    }
    ensureSeed(organizationId);
    return memory.find((c) => c.id === id && c.organization_id === organizationId) ?? null;
  },

  async create(input: ContactCreateInput): Promise<Contact> {
    const row: Contact = {
      id: newId(),
      organization_id: input.organizationId,
      workspace_id: input.workspaceId ?? null,
      phone_number: input.phoneNumber ?? null,
      email: input.email ?? null,
      full_name: input.fullName ?? null,
      furigana: input.furigana ?? null,
      company: input.company ?? null,
      position: input.position ?? null,
      address: input.address ?? null,
      tags: input.tags ?? [],
      attributes: input.attributes ?? {},
      do_not_call: false,
      do_not_call_reason: null,
      consent_status: "unknown",
      consent_recorded_at: null,
      source: input.source ?? "api",
      external_id: input.externalId ?? null,
      last_called_at: null,
      last_call_outcome: null,
      total_calls: 0,
      created_by: input.createdBy ?? null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };

    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin().from("contacts").insert(row).select("*").single();
      if (error) throw error;
      return data as Contact;
    }
    memory.push(row);
    return row;
  },

  async update(organizationId: UUID, id: UUID, patch: Partial<Contact>): Promise<Contact | null> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin()
        .from("contacts")
        .update({ ...patch, updated_at: nowIso() })
        .eq("organization_id", organizationId)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data as Contact) ?? null;
    }
    const idx = memory.findIndex((c) => c.id === id && c.organization_id === organizationId);
    if (idx < 0) return null;
    memory[idx] = { ...memory[idx], ...patch, updated_at: nowIso() } as Contact;
    return memory[idx];
  },

  async markDoNotCall(organizationId: UUID, id: UUID, reason: string): Promise<Contact | null> {
    return this.update(organizationId, id, { do_not_call: true, do_not_call_reason: reason } as Partial<Contact>);
  },

  async bulkImport(organizationId: UUID, rows: ContactCreateInput[]): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;
    for (const r of rows) {
      // 簡易重複排除 (memory のみ; DB側は UNIQUE 制約に任せる)
      if (!useDb()) {
        const existing = memory.find(
          (c) => c.organization_id === organizationId && c.phone_number === (r.phoneNumber ?? null),
        );
        if (existing) { skipped++; continue; }
      }
      try {
        await this.create({ ...r, organizationId });
        created++;
      } catch {
        skipped++;
      }
    }
    return { created, skipped };
  },
};
