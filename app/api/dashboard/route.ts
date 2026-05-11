// ダッシュボード KPI 集計 API
import { NextResponse } from "next/server";
import { dashboardRepo } from "@/lib/data";
import { requireCurrentSession, UnauthorizedError } from "@/lib/auth/session";
import { requireRole, PermissionDeniedError } from "@/lib/auth/permissions";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "call.read");
    const url = new URL(req.url);
    const range = url.searchParams.get("range") ?? "7d";
    const now = Date.now();
    const days = range === "1d" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 7;
    const fromIso = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
    const toIso = new Date(now).toISOString();
    const kpi = await dashboardRepo.getKpi({ organizationId: session.organizationId, fromIso, toIso });
    return NextResponse.json({ ok: true, range, fromIso, toIso, kpi });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
    if (e instanceof PermissionDeniedError) return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
    console.error("[api/dashboard]", e);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
