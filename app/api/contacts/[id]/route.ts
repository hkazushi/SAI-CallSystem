// 顧客リスト個別 — get / patch / DNC
import { NextResponse } from "next/server";
import { contactsRepo } from "@/lib/data";
import { requireCurrentSession, UnauthorizedError } from "@/lib/auth/session";
import { requireRole, PermissionDeniedError } from "@/lib/auth/permissions";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit/logger";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "contact.read");
    const { id } = await ctx.params;
    const contact = await contactsRepo.get(session.organizationId, id);
    if (!contact) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, contact });
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "contact.write");
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    // DNCマーク特別処理
    if (body.do_not_call === true && typeof body.do_not_call_reason === "string") {
      const updated = await contactsRepo.markDoNotCall(session.organizationId, id, body.do_not_call_reason);
      if (!updated) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
      await recordAudit({
        organizationId: session.organizationId,
        actorId: session.userId,
        actorEmail: session.email,
        actorRole: session.role,
        action: AUDIT_ACTIONS.CONTACT_DO_NOT_CALL,
        resourceType: "contact",
        resourceId: id,
        resourceLabel: updated.full_name ?? updated.phone_number ?? id,
        status: "success",
        metadata: { reason: body.do_not_call_reason },
      });
      return NextResponse.json({ ok: true, contact: updated });
    }

    const updated = await contactsRepo.update(session.organizationId, id, body);
    if (!updated) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    await recordAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: AUDIT_ACTIONS.CONTACT_UPDATE,
      resourceType: "contact",
      resourceId: id,
      resourceLabel: updated.full_name ?? updated.phone_number ?? id,
      status: "success",
    });
    return NextResponse.json({ ok: true, contact: updated });
  } catch (e) {
    return errorToResponse(e);
  }
}

function errorToResponse(e: unknown) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  if (e instanceof PermissionDeniedError) return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
  console.error("[api/contacts/:id]", e);
  return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
}
