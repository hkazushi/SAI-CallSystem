// プロジェクト保存ストア API (Supabase 連携)
// GET  /api/projects-store        … 一覧
// POST /api/projects-store        … 新規保存
//
// 既存の /api/projects/* は別目的 (analyze-logs, deploy-dialogflow, deploy-vapi 等)
// のため、保存ストアは別パスにする。

import { NextResponse } from "next/server";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase 未設定" }, { status: 500 });
  }
  const sb = getSupabase();
  const { data, error } = await sb
    .from("projects")
    .select("id, name, template_id, dfcx_agent_id, dfcx_agent_name, dfcx_deploy_status, dfcx_deployed_at, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase 未設定" }, { status: 500 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    templateId?: string;
    chappieOutput?: unknown;
    chatMessages?: unknown;
    dfcxAgentId?: string;
    dfcxAgentName?: string;
    dfcxFlowId?: string;
    dfcxTrainOperationId?: string;
  };
  if (!body.name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const sb = getSupabase();
  const { data, error } = await sb
    .from("projects")
    .insert({
      name: body.name,
      template_id: body.templateId ?? null,
      chappie_output: body.chappieOutput ?? null,
      chat_messages: body.chatMessages ?? null,
      dfcx_agent_id: body.dfcxAgentId ?? null,
      dfcx_agent_name: body.dfcxAgentName ?? null,
      dfcx_flow_id: body.dfcxFlowId ?? null,
      dfcx_train_operation_id: body.dfcxTrainOperationId ?? null,
      dfcx_deploy_status: body.dfcxAgentName ? "ready" : "none",
      dfcx_deployed_at: body.dfcxAgentName ? new Date().toISOString() : null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data });
}
