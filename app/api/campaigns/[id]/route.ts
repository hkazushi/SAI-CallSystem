// キャンペーン個別 — get / status 更新
import { NextResponse } from "next/server";
import { campaignsRepo } from "@/lib/data";
import { requireCurrentSession, UnauthorizedError } from "@/lib/auth/session";
import { requireRole, PermissionDeniedError } from "@/lib/auth/permissions";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit/logger";
import type { Campaign } from "@/lib/supabase/types";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCurrentSession();
    const { id } = await ctx.params;
    const campaign = await campaignsRepo.get(session.organizationId, id);
    if (!campaign) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, campaign });
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCurrentSession();
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const nextStatus = body.status as Campaign["status"];
    if (!nextStatus) return NextResponse.json({ ok: false, error: "status required" }, { status: 400 });

    // status 遷移は権限分岐
    if (nextStatus === "running") requireRole(session.role, "campaign.run");
    else if (nextStatus === "paused") requireRole(session.role, "campaign.pause");
    else if (nextStatus === "archived") requireRole(session.role, "campaign.delete");
    else requireRole(session.role, "campaign.create");

    const updated = await campaignsRepo.updateStatus(session.organizationId, id, nextStatus);
    if (!updated) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const actionKey =
      nextStatus === "running" ? AUDIT_ACTIONS.CAMPAIGN_START :
      nextStatus === "paused" ? AUDIT_ACTIONS.CAMPAIGN_PAUSE :
      nextStatus === "completed" ? AUDIT_ACTIONS.CAMPAIGN_COMPLETE :
      AUDIT_ACTIONS.CAMPAIGN_CREATE;
    await recordAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: actionKey,
      resourceType: "campaign",
      resourceId: id,
      resourceLabel: updated.name,
      status: "success",
      metadata: { newStatus: nextStatus },
    });
    return NextResponse.json({ ok: true, campaign: updated });
  } catch (e) {
    return errorToResponse(e);
  }
}

function errorToResponse(e: unknown) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  if (e instanceof PermissionDeniedError) return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
  console.error("[api/campaigns/:id]", e);
  return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
}
