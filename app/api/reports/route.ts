// レポート一覧 / 詳細取得
import { NextResponse } from "next/server";
import { reportsRepo } from "@/lib/data";
import { requireCurrentSession, UnauthorizedError } from "@/lib/auth/session";
import { requireRole, PermissionDeniedError } from "@/lib/auth/permissions";
import type { ReportPeriod, ReportStatus } from "@/lib/data/reports";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "report.read");
    const url = new URL(req.url);
    const period = url.searchParams.get("period") as ReportPeriod | null;
    const status = url.searchParams.get("status") as ReportStatus | null;
    const items = await reportsRepo.list({
      organizationId: session.organizationId,
      period: period ?? undefined,
      status: status ?? undefined,
    });
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return errorToResponse(e);
  }
}

function errorToResponse(e: unknown) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  if (e instanceof PermissionDeniedError) return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
  console.error("[api/reports]", e);
  return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
}
