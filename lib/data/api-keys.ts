// API キー（PAT 風の長期トークン）リポジトリ
import type { ApiKey, UUID } from "@/lib/supabase/types";
import { useDb, nowIso, newId } from "./_helpers";

export const API_KEY_SCOPES = [
  "calls.read",
  "calls.write",
  "contacts.read",
  "contacts.write",
  "campaigns.read",
  "campaigns.write",
  "transcripts.read",
  "webhooks.manage",
] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

const memoryKeys: ApiKey[] = [];
const memorySecrets = new Map<UUID, string>(); // 平文は一度だけ表示

function ensureSeed(orgId: UUID) {
  if (memoryKeys.some((k) => k.organization_id === orgId)) return;
  memoryKeys.push({
    id: newId(),
    organization_id: orgId,
    workspace_id: null,
    name: "外部ダッシュボード連携",
    prefix: "sai_live_4f8a",
    scopes: ["calls.read", "contacts.read"],
    rate_limit_rpm: 60,
    is_active: true,
    last_used_at: nowIso(),
    last_used_ip: "203.0.113.42",
    expires_at: null,
    created_by: null,
    revoked_at: null,
    revoked_by: null,
    created_at: nowIso(),
  });
}

export interface ApiKeyListQuery {
  organizationId: UUID;
  includeRevoked?: boolean;
}

export interface ApiKeyCreateInput {
  organizationId: UUID;
  workspaceId?: UUID | null;
  name: string;
  scopes: ApiKeyScope[];
  rateLimitRpm?: number | null;
  expiresAt?: string | null;
  createdBy?: UUID | null;
}

function generateSecret(): { prefix: string; secret: string; hash: string } {
  // sai_live_<random16hex> 形式（本番はSHA-256でDB保存）
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  const prefix = `sai_live_${random.slice(0, 4)}`;
  const secret = `${prefix}_${random.slice(4)}`;
  // 簡易ハッシュ（本番は crypto.subtle で SHA-256）
  const hash = `sha256:${random}`;
  return { prefix, secret, hash };
}

export const apiKeysRepo = {
  async list(q: ApiKeyListQuery): Promise<ApiKey[]> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      let qb = getSupabaseAdmin().from("api_keys").select("*").eq("organization_id", q.organizationId);
      if (!q.includeRevoked) qb = qb.is("revoked_at", null);
      const { data, error } = await qb.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ApiKey[];
    }
    ensureSeed(q.organizationId);
    let items = memoryKeys.filter((k) => k.organization_id === q.organizationId);
    if (!q.includeRevoked) items = items.filter((k) => !k.revoked_at);
    return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  /** 作成。一度だけ secret を返す（再表示不能）。 */
  async create(input: ApiKeyCreateInput): Promise<{ apiKey: ApiKey; plainSecret: string }> {
    const { prefix, secret } = generateSecret();
    const row: ApiKey = {
      id: newId(),
      organization_id: input.organizationId,
      workspace_id: input.workspaceId ?? null,
      name: input.name,
      prefix,
      scopes: input.scopes,
      rate_limit_rpm: input.rateLimitRpm ?? 60,
      is_active: true,
      last_used_at: null,
      last_used_ip: null,
      expires_at: input.expiresAt ?? null,
      created_by: input.createdBy ?? null,
      revoked_at: null,
      revoked_by: null,
      created_at: nowIso(),
    };
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin().from("api_keys").insert(row).select("*").single();
      if (error) throw error;
      return { apiKey: data as ApiKey, plainSecret: secret };
    }
    memoryKeys.push(row);
    memorySecrets.set(row.id, secret);
    return { apiKey: row, plainSecret: secret };
  },

  async revoke(organizationId: UUID, id: UUID, revokedBy?: UUID | null): Promise<boolean> {
    const patch = { revoked_at: nowIso(), revoked_by: revokedBy ?? null, is_active: false };
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { error } = await getSupabaseAdmin().from("api_keys").update(patch).eq("id", id).eq("organization_id", organizationId);
      if (error) throw error;
      return true;
    }
    const idx = memoryKeys.findIndex((k) => k.id === id && k.organization_id === organizationId);
    if (idx === -1) return false;
    memoryKeys[idx] = { ...memoryKeys[idx], ...patch };
    return true;
  },
};
