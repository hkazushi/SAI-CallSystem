// 通話一覧 API
import { NextResponse } from "next/server";
import { callsRepo } from "@/lib/data";
import { requireCurrentSession, UnauthorizedError } from "@/lib/auth/session";
import { requireRole, PermissionDeniedError } from "@/lib/auth/permissions";
import type { Call } from "@/lib/supabase/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "call.read");
    const url = new URL(req.url);
    const result = await callsRepo.list({
      organizationId: session.organizationId,
      projectId: url.searchParams.get("projectId") ?? undefined,
      campaignId: url.searchParams.get("campaignId") ?? undefined,
      contactId: url.searchParams.get("contactId") ?? undefined,
      status: (url.searchParams.get("status") as Call["status"]) ?? undefined,
      direction: (url.searchParams.get("direction") as Call["direction"]) ?? undefined,
      outcome: url.searchParams.get("outcome") ?? undefined,
      search: url.searchParams.get("q") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      limit: Math.min(Number(url.searchParams.get("limit") ?? "50"), 200),
      cursor: Number(url.searchParams.get("cursor") ?? "0"),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return errorToResponse(e);
  }
}

function errorToResponse(e: unknown) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  if (e instanceof PermissionDeniedError) return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
  console.error("[api/calls]", e);
  return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
}
