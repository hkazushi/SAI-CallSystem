// Webhook 個別 — toggle (PATCH) / delete
import { NextResponse } from "next/server";
import { webhooksRepo } from "@/lib/data/webhooks";
import { requireCurrentSession, UnauthorizedError } from "@/lib/auth/session";
import { requireRole, PermissionDeniedError } from "@/lib/auth/permissions";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit/logger";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "webhook.create"); // toggle相当は同じ権限
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    if (typeof body.is_active !== "boolean") {
      return NextResponse.json({ ok: false, error: "is_active boolean required" }, { status: 400 });
    }
    const ok = await webhooksRepo.toggle(session.organizationId, id, body.is_active);
    if (!ok) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "webhook.create");
    const { id } = await ctx.params;
    const ok = await webhooksRepo.delete(session.organizationId, id);
    if (!ok) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    await recordAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: AUDIT_ACTIONS.WEBHOOK_DELETE,
      resourceType: "webhook",
      resourceId: id,
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
  console.error("[api/webhooks/:id]", e);
  return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
}
