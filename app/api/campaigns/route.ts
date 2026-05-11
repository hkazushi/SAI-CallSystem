// キャンペーン list/create API
import { NextResponse } from "next/server";
import { campaignsRepo } from "@/lib/data";
import { requireCurrentSession, UnauthorizedError } from "@/lib/auth/session";
import { requireRole, PermissionDeniedError } from "@/lib/auth/permissions";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit/logger";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireCurrentSession();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") as
      | "draft" | "scheduled" | "running" | "paused" | "completed" | "archived" | "failed" | null;
    const direction = url.searchParams.get("direction") as "outbound" | "inbound" | null;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);
    const cursor = Number(url.searchParams.get("cursor") ?? "0");
    const result = await campaignsRepo.list({
      organizationId: session.organizationId,
      status: status ?? undefined,
      direction: direction ?? undefined,
      limit,
      cursor,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "campaign.create");
    const body = await req.json().catch(() => ({}));
    if (!body.name) return NextResponse.json({ ok: false, error: "name required" }, { status: 400 });
    const campaign = await campaignsRepo.create({
      organizationId: session.organizationId,
      workspaceId: session.workspaceId,
      projectId: body.projectId ?? null,
      name: body.name,
      description: body.description ?? null,
      direction: body.direction ?? "outbound",
      contactListId: body.contactListId ?? null,
      startAt: body.startAt ?? null,
      endAt: body.endAt ?? null,
      concurrency: body.concurrency ?? 1,
      callerId: body.callerId ?? null,
      promptOverride: body.promptOverride ?? null,
      firstMessageOverride: body.firstMessageOverride ?? null,
      goalMetric: body.goalMetric ?? "appointment_rate",
      goalTarget: body.goalTarget ?? 0.2,
      createdBy: session.userId,
    });
    await recordAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: AUDIT_ACTIONS.CAMPAIGN_CREATE,
      resourceType: "campaign",
      resourceId: campaign.id,
      resourceLabel: campaign.name,
      status: "success",
    });
    return NextResponse.json({ ok: true, campaign }, { status: 201 });
  } catch (e) {
    return errorToResponse(e);
  }
}

function errorToResponse(e: unknown) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  if (e instanceof PermissionDeniedError) return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
  console.error("[api/campaigns]", e);
  return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
}
