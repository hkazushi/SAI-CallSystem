// API キー — list / create
import { NextResponse } from "next/server";
import { apiKeysRepo, API_KEY_SCOPES, type ApiKeyScope } from "@/lib/data/api-keys";
import { requireCurrentSession, UnauthorizedError } from "@/lib/auth/session";
import { requireRole, PermissionDeniedError } from "@/lib/auth/permissions";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit/logger";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "api_key.read");
    const url = new URL(req.url);
    const includeRevoked = url.searchParams.get("includeRevoked") === "1";
    const items = await apiKeysRepo.list({
      organizationId: session.organizationId,
      includeRevoked,
    });
    // 秘密キーは返さない。表示用 prefix のみ。
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "api_key.create");
    const body = await req.json().catch(() => ({}));
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
    }
    const scopes: ApiKeyScope[] = Array.isArray(body.scopes)
      ? body.scopes.filter((s: unknown): s is ApiKeyScope =>
          typeof s === "string" && (API_KEY_SCOPES as readonly string[]).includes(s))
      : [];
    if (scopes.length === 0) {
      return NextResponse.json({ ok: false, error: "at least one scope required" }, { status: 400 });
    }
    const result = await apiKeysRepo.create({
      organizationId: session.organizationId,
      workspaceId: body.workspaceId ?? null,
      name: body.name,
      scopes,
      rateLimitRpm: typeof body.rateLimitRpm === "number" ? body.rateLimitRpm : null,
      expiresAt: body.expiresAt ?? null,
      createdBy: session.userId,
    });
    await recordAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: AUDIT_ACTIONS.API_KEY_CREATE,
      resourceType: "api_key",
      resourceId: result.apiKey.id,
      resourceLabel: result.apiKey.name,
      status: "success",
      metadata: { scopes: result.apiKey.scopes, prefix: result.apiKey.prefix },
    });
    // 平文secret は一度だけ返却（保存しない）
    return NextResponse.json({ ok: true, apiKey: result.apiKey, plainSecret: result.plainSecret }, { status: 201 });
  } catch (e) {
    return errorToResponse(e);
  }
}

function errorToResponse(e: unknown) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  if (e instanceof PermissionDeniedError) return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
  console.error("[api/api-keys]", e);
  return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
}
