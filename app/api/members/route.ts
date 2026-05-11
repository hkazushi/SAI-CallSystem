// メンバー一覧・招待
import { NextResponse } from "next/server";
import { membershipsRepo } from "@/lib/data";
import { requireCurrentSession, UnauthorizedError } from "@/lib/auth/session";
import { requireRole, PermissionDeniedError } from "@/lib/auth/permissions";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit/logger";
import type { OrgRole } from "@/lib/supabase/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "org.view");
    const url = new URL(req.url);
    const [members, invitations] = await Promise.all([
      membershipsRepo.list({ organizationId: session.organizationId }),
      membershipsRepo.listInvitations(session.organizationId),
    ]);
    return NextResponse.json({ ok: true, members, invitations });
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "member.invite");
    const body = await req.json().catch(() => ({}));
    if (!body.email) return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });
    const role = (body.role ?? "operator") as OrgRole;
    if (!["owner", "admin", "manager", "operator", "auditor", "viewer", "billing"].includes(role)) {
      return NextResponse.json({ ok: false, error: "invalid role" }, { status: 400 });
    }
    const inv = await membershipsRepo.createInvitation({
      organizationId: session.organizationId,
      email: body.email,
      role,
      invitedBy: session.userId,
      ttlHours: body.ttlHours ?? 72,
    });
    await recordAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: AUDIT_ACTIONS.MEMBER_INVITE,
      resourceType: "invitation",
      resourceId: inv.id,
      resourceLabel: body.email,
      status: "success",
      metadata: { role },
    });
    return NextResponse.json({ ok: true, invitation: inv }, { status: 201 });
  } catch (e) {
    return errorToResponse(e);
  }
}

function errorToResponse(e: unknown) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  if (e instanceof PermissionDeniedError) return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
  console.error("[api/members]", e);
  return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
}
