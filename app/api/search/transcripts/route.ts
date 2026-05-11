// 通話書き起こし全文検索 API
import { NextResponse } from "next/server";
import { transcriptsRepo } from "@/lib/data";
import { requireCurrentSession, UnauthorizedError } from "@/lib/auth/session";
import { requireRole, PermissionDeniedError } from "@/lib/auth/permissions";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "transcript.read");
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    if (!q) return NextResponse.json({ ok: false, error: "q required" }, { status: 400 });
    const items = await transcriptsRepo.search({
      organizationId: session.organizationId,
      query: q,
      limit: Math.min(Number(url.searchParams.get("limit") ?? "50"), 200),
    });
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
    if (e instanceof PermissionDeniedError) return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
    console.error("[api/search/transcripts]", e);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
