// 監査ログ閲覧 API
import { NextResponse } from "next/server";
import { listAuditLogs } from "@/lib/audit/logger";
import { requireCurrentSession, UnauthorizedError } from "@/lib/auth/session";
import { requireRole, PermissionDeniedError } from "@/lib/auth/permissions";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "audit.read");
    const url = new URL(req.url);
    const items = await listAuditLogs({
      organizationId: session.organizationId,
      action: url.searchParams.get("action") ?? undefined,
      actorId: url.searchParams.get("actorId") ?? undefined,
      resourceType: url.searchParams.get("resourceType") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      limit: Math.min(Number(url.searchParams.get("limit") ?? "100"), 500),
    });
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
    if (e instanceof PermissionDeniedError) return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
    console.error("[api/audit-logs]", e);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
