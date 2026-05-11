// A/B 実験 — list / create
import { NextResponse } from "next/server";
import { experimentsRepo } from "@/lib/data/experiments";
import { requireCurrentSession, UnauthorizedError } from "@/lib/auth/session";
import { requireRole, PermissionDeniedError } from "@/lib/auth/permissions";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "experiment.read");
    const url = new URL(req.url);
    const status = url.searchParams.get("status") as
      | "draft" | "running" | "paused" | "completed" | "archived" | null;
    const items = await experimentsRepo.list({
      organizationId: session.organizationId,
      status: status ?? undefined,
    });
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "experiment.create");
    const body = await req.json().catch(() => ({}));
    if (!body.name || !body.primaryMetric) {
      return NextResponse.json({ ok: false, error: "name and primaryMetric required" }, { status: 400 });
    }
    const exp = await experimentsRepo.create({
      organizationId: session.organizationId,
      projectId: body.projectId ?? null,
      campaignId: body.campaignId ?? null,
      name: body.name,
      hypothesis: body.hypothesis ?? null,
      primaryMetric: body.primaryMetric,
      secondaryMetrics: Array.isArray(body.secondaryMetrics) ? body.secondaryMetrics : [],
      trafficAllocation: typeof body.trafficAllocation === "number" ? body.trafficAllocation : 1.0,
      createdBy: session.userId,
    });
    return NextResponse.json({ ok: true, experiment: exp }, { status: 201 });
  } catch (e) {
    return errorToResponse(e);
  }
}

function errorToResponse(e: unknown) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  if (e instanceof PermissionDeniedError) return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
  console.error("[api/experiments]", e);
  return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
}
