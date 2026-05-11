// 顧客リスト (Contacts) — list / create
import { NextResponse } from "next/server";
import { contactsRepo } from "@/lib/data";
import { requireCurrentSession, UnauthorizedError } from "@/lib/auth/session";
import { requireRole, PermissionDeniedError } from "@/lib/auth/permissions";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit/logger";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "contact.read");
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);
    const cursor = Number(url.searchParams.get("cursor") ?? "0");
    const search = url.searchParams.get("q") ?? undefined;
    const doNotCall = url.searchParams.get("dnc");
    const consent = url.searchParams.get("consent") as "opted_in" | "opted_out" | "unknown" | "revoked" | null;
    const tagsParam = url.searchParams.get("tags");

    const result = await contactsRepo.list({
      organizationId: session.organizationId,
      workspaceId: session.workspaceId,
      search,
      doNotCall: doNotCall === null ? undefined : doNotCall === "true",
      consent: consent ?? undefined,
      tags: tagsParam ? tagsParam.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      limit,
      cursor,
    });

    return NextResponse.json({
      ok: true,
      items: result.items,
      total: result.total,
      nextCursor: cursor + result.items.length < result.total ? cursor + limit : null,
    });
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "contact.write");
    const body = await req.json().catch(() => ({}));
    if (!body.phoneNumber && !body.email) {
      return NextResponse.json({ ok: false, error: "phoneNumber or email required" }, { status: 400 });
    }
    const contact = await contactsRepo.create({
      organizationId: session.organizationId,
      workspaceId: session.workspaceId,
      phoneNumber: body.phoneNumber,
      email: body.email,
      fullName: body.fullName,
      furigana: body.furigana,
      company: body.company,
      position: body.position,
      address: body.address,
      tags: Array.isArray(body.tags) ? body.tags : [],
      attributes: typeof body.attributes === "object" ? body.attributes : {},
      source: body.source ?? "manual",
      createdBy: session.userId,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: AUDIT_ACTIONS.CONTACT_CREATE,
      resourceType: "contact",
      resourceId: contact.id,
      resourceLabel: contact.full_name ?? contact.phone_number ?? contact.email ?? contact.id,
      status: "success",
    });

    return NextResponse.json({ ok: true, contact }, { status: 201 });
  } catch (e) {
    return errorToResponse(e);
  }
}

function errorToResponse(e: unknown) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  if (e instanceof PermissionDeniedError) return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
  console.error("[api/contacts]", e);
  return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
}
