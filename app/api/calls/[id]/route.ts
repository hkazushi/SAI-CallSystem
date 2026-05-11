// 通話詳細 API（通話 + 書き起こし + AI評価）
import { NextResponse } from "next/server";
import { callsRepo, transcriptsRepo, evaluationsRepo } from "@/lib/data";
import { requireCurrentSession, UnauthorizedError } from "@/lib/auth/session";
import { requireRole, PermissionDeniedError } from "@/lib/auth/permissions";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "call.read");
    const { id } = await ctx.params;

    const [call, transcript, evaluation] = await Promise.all([
      callsRepo.get(session.organizationId, id),
      transcriptsRepo.listByCall({ organizationId: session.organizationId, callId: id }),
      evaluationsRepo.getByCall(session.organizationId, id),
    ]);

    if (!call) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, call, transcript, evaluation });
  } catch (e) {
    return errorToResponse(e);
  }
}

function errorToResponse(e: unknown) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  if (e instanceof PermissionDeniedError) return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
  console.error("[api/calls/:id]", e);
  return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
}
