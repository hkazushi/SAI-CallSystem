// メンバーシップ / 招待 リポジトリ
import type { Membership, Invitation, OrgRole, UUID } from "@/lib/supabase/types";
import { useDb, nowIso, newId } from "./_helpers";

const memberships: Membership[] = [];
const invitations: Invitation[] = [];

function ensureSeed(orgId: UUID) {
  if (memberships.some((m) => m.organization_id === orgId)) return;
  const sample: Array<{ user: string; role: OrgRole }> = [
    { user: "00000000-0000-0000-0000-000000000001", role: "owner" },
    { user: "00000000-0000-0000-0000-000000000002", role: "manager" },
    { user: "00000000-0000-0000-0000-000000000003", role: "operator" },
    { user: "00000000-0000-0000-0000-000000000004", role: "operator" },
    { user: "00000000-0000-0000-0000-000000000005", role: "viewer" },
  ];
  for (const s of sample) {
    memberships.push({
      id: newId(),
      organization_id: orgId,
      user_id: s.user,
      role: s.role,
      workspace_ids: [],
      invited_by: null,
      invited_at: null,
      accepted_at: nowIso(),
      last_active_at: nowIso(),
      is_active: true,
      metadata: {},
      created_at: nowIso(),
    });
  }
}

export interface MembershipListQuery {
  organizationId: UUID;
  workspaceId?: UUID;
  role?: OrgRole;
  isActive?: boolean;
}

export interface InvitationCreateInput {
  organizationId: UUID;
  email: string;
  role: OrgRole;
  invitedBy?: UUID | null;
  ttlHours?: number;
}

export const membershipsRepo = {
  async list(q: MembershipListQuery): Promise<Membership[]> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      let query = getSupabaseAdmin().from("memberships").select("*").eq("organization_id", q.organizationId);
      if (q.role) query = query.eq("role", q.role);
      if (q.isActive !== undefined) query = query.eq("is_active", q.isActive);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Membership[];
    }
    ensureSeed(q.organizationId);
    let items = memberships.filter((m) => m.organization_id === q.organizationId);
    if (q.role) items = items.filter((m) => m.role === q.role);
    if (q.isActive !== undefined) items = items.filter((m) => m.is_active === q.isActive);
    return items;
  },

  async getByUser(organizationId: UUID, userId: UUID): Promise<Membership | null> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin()
        .from("memberships")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data as Membership) ?? null;
    }
    ensureSeed(organizationId);
    return memberships.find((m) => m.organization_id === organizationId && m.user_id === userId) ?? null;
  },

  async updateRole(organizationId: UUID, membershipId: UUID, role: OrgRole): Promise<Membership | null> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin()
        .from("memberships")
        .update({ role })
        .eq("organization_id", organizationId)
        .eq("id", membershipId)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data as Membership) ?? null;
    }
    const idx = memberships.findIndex((m) => m.organization_id === organizationId && m.id === membershipId);
    if (idx < 0) return null;
    memberships[idx] = { ...memberships[idx], role };
    return memberships[idx];
  },

  async deactivate(organizationId: UUID, membershipId: UUID): Promise<void> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      await getSupabaseAdmin()
        .from("memberships")
        .update({ is_active: false })
        .eq("organization_id", organizationId)
        .eq("id", membershipId);
      return;
    }
    const idx = memberships.findIndex((m) => m.organization_id === organizationId && m.id === membershipId);
    if (idx >= 0) memberships[idx] = { ...memberships[idx], is_active: false };
  },

  async createInvitation(input: InvitationCreateInput): Promise<Invitation> {
    const ttlHours = input.ttlHours ?? 72;
    const row: Invitation = {
      id: newId(),
      organization_id: input.organizationId,
      email: input.email.toLowerCase(),
      role: input.role,
      token: crypto.randomUUID().replace(/-/g, ""),
      invited_by: input.invitedBy ?? null,
      expires_at: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString(),
      accepted_at: null,
      created_at: nowIso(),
    };
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin().from("invitations").insert(row).select("*").single();
      if (error) throw error;
      return data as Invitation;
    }
    invitations.push(row);
    return row;
  },

  async listInvitations(organizationId: UUID): Promise<Invitation[]> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin()
        .from("invitations")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invitation[];
    }
    return invitations.filter((i) => i.organization_id === organizationId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async revokeInvitation(organizationId: UUID, id: UUID): Promise<void> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      await getSupabaseAdmin().from("invitations").delete().eq("organization_id", organizationId).eq("id", id);
      return;
    }
    const idx = invitations.findIndex((i) => i.id === id && i.organization_id === organizationId);
    if (idx >= 0) invitations.splice(idx, 1);
  },
};
