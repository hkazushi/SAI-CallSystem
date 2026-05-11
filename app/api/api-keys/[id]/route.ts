// API キー — revoke
import { NextResponse } from "next/server";
import { apiKeysRepo } from "@/lib/data/api-keys";
import { requireCurrentSession, UnauthorizedError } from "@/lib/auth/session";
import { requireRole, PermissionDeniedError } from "@/lib/auth/permissions";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit/logger";

export const runtime = "nodejs";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "api_key.revoke");
    const { id } = await ctx.params;
    const ok = await apiKeysRepo.revoke(session.organizationId, id, session.userId);
    if (!ok) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    await recordAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: AUDIT_ACTIONS.API_KEY_REVOKE,
      resourceType: "api_key",
      resourceId: id,
      status: "success",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
    if (e instanceof PermissionDeniedError) return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
    console.error("[api/api-keys/:id]", e);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
