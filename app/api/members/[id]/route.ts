// メンバー個別: ロール変更 / 無効化
import { NextResponse } from "next/server";
import { membershipsRepo } from "@/lib/data";
import { requireCurrentSession, UnauthorizedError } from "@/lib/auth/session";
import { requireRole, PermissionDeniedError } from "@/lib/auth/permissions";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit/logger";
import type { OrgRole } from "@/lib/supabase/types";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "member.update_role");
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const newRole = body.role as OrgRole;
    if (!newRole) return NextResponse.json({ ok: false, error: "role required" }, { status: 400 });
    const updated = await membershipsRepo.updateRole(session.organizationId, id, newRole);
    if (!updated) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    await recordAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: AUDIT_ACTIONS.MEMBER_UPDATE_ROLE,
      resourceType: "membership",
      resourceId: id,
      resourceLabel: updated.user_id,
      status: "success",
      metadata: { newRole },
    });
    return NextResponse.json({ ok: true, membership: updated });
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "member.remove");
    const { id } = await ctx.params;
    await membershipsRepo.deactivate(session.organizationId, id);
    await recordAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: AUDIT_ACTIONS.MEMBER_REMOVE,
      resourceType: "membership",
      resourceId: id,
      resourceLabel: id,
      status: "success",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorToResponse(e);
  }
}

function errorToResponse(e: unknown) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  if (e instanceof PermissionDeniedError) return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
  console.error("[api/members/:id]", e);
  return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
}
