// GET    /api/projects-store/[id]   … 1件取得 (ChappieOutput 含む)
// PATCH  /api/projects-store/[id]   … 部分更新
// DELETE /api/projects-store/[id]   … 削除

import { NextResponse } from "next/server";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase 未設定" }, { status: 500 });
  const { id } = await params;
  const sb = getSupabase();
  const { data, error } = await sb.from("projects").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ project: data });
}

export async function PATCH(req: Request, { params }: RouteContext) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase 未設定" }, { status: 500 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const sb = getSupabase();
  // snake_case マッピング
  const patch: Record<string, unknown> = {};
  if ("name" in body) patch.name = body.name;
  if ("templateId" in body) patch.template_id = body.templateId;
  if ("chappieOutput" in body) patch.chappie_output = body.chappieOutput;
  if ("chatMessages" in body) patch.chat_messages = body.chatMessages;
  if ("dfcxAgentId" in body) patch.dfcx_agent_id = body.dfcxAgentId;
  if ("dfcxAgentName" in body) patch.dfcx_agent_name = body.dfcxAgentName;
  if ("dfcxFlowId" in body) patch.dfcx_flow_id = body.dfcxFlowId;
  if ("dfcxDeployStatus" in body) patch.dfcx_deploy_status = body.dfcxDeployStatus;
  if ("dfcxTrainOperationId" in body) patch.dfcx_train_operation_id = body.dfcxTrainOperationId;
  const { data, error } = await sb.from("projects").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase 未設定" }, { status: 500 });
  const { id } = await params;
  const sb = getSupabase();
  const { error } = await sb.from("projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
