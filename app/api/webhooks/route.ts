// Webhook — list / create
import { NextResponse } from "next/server";
import { webhooksRepo, WEBHOOK_EVENTS, type WebhookEvent } from "@/lib/data/webhooks";
import { requireCurrentSession, UnauthorizedError } from "@/lib/auth/session";
import { requireRole, PermissionDeniedError } from "@/lib/auth/permissions";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit/logger";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "webhook.read");
    const items = await webhooksRepo.list(session.organizationId);
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "webhook.create");
    const body = await req.json().catch(() => ({}));
    if (!body.name || !body.url) {
      return NextResponse.json({ ok: false, error: "name and url required" }, { status: 400 });
    }
    if (!/^https:\/\//.test(body.url)) {
      return NextResponse.json({ ok: false, error: "url must be https" }, { status: 400 });
    }
    const events: WebhookEvent[] = Array.isArray(body.events)
      ? body.events.filter((e: unknown): e is WebhookEvent =>
          typeof e === "string" && (WEBHOOK_EVENTS as readonly string[]).includes(e))
      : [];
    if (events.length === 0) {
      return NextResponse.json({ ok: false, error: "at least one event required" }, { status: 400 });
    }
    const result = await webhooksRepo.create({
      organizationId: session.organizationId,
      name: body.name,
      url: body.url,
      events,
      createdBy: session.userId,
    });
    await recordAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: AUDIT_ACTIONS.WEBHOOK_CREATE,
      resourceType: "webhook",
      resourceId: result.webhook.id,
      resourceLabel: result.webhook.name,
      status: "success",
      metadata: { url: result.webhook.url, events: result.webhook.events },
    });
    return NextResponse.json({ ok: true, webhook: result.webhook, signingSecret: result.signingSecret }, { status: 201 });
  } catch (e) {
    return errorToResponse(e);
  }
}

function errorToResponse(e: unknown) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  if (e instanceof PermissionDeniedError) return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
  console.error("[api/webhooks]", e);
  return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
}
