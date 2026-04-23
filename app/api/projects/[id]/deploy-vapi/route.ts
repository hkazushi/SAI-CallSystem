/**
 * POST /api/projects/[id]/deploy-vapi
 *
 * Chappie 壁打ちが完了した ChappieOutput を受け取り、
 * compileVapiAssistant() で Vapi 設定に変換 → Vapi に Assistant を作成する。
 *
 * Phase A では Supabase 保存はまだ繋がないので、作成結果 (assistantId) を返すだけ。
 * 後続フェーズで projects テーブルの vapi_assistant_id カラムに保存する。
 */
import { NextResponse } from "next/server";
import { getVapiClient } from "@/lib/vapi-client";
import { compileVapiAssistant } from "@/lib/vapi-compiler";
import type { ChappieOutput } from "@/lib/vapi-compiler/types";

export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

interface DeployBody {
  output: ChappieOutput;
  tenantId?: string;
}

export async function POST(req: Request, { params }: RouteContext) {
  const { id: projectId } = await params;
  const body = (await req.json()) as DeployBody;

  if (!body?.output) {
    return NextResponse.json({ error: "output is required" }, { status: 400 });
  }

  const tenantId = body.tenantId ?? projectId;
  const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL;

  const assistantConfig = compileVapiAssistant(body.output, {
    tenantId,
    webhookBaseUrl,
  });

  const vapi = getVapiClient();

  try {
    const created = await vapi.assistants.create(
      // VapiAssistantConfig は構造的に CreateAssistantDto と一致するが、SDK側が strict union (provider: "openai" 等) を要求するため明示キャスト
      assistantConfig as unknown as Parameters<typeof vapi.assistants.create>[0],
    );
    return NextResponse.json({
      ok: true,
      projectId,
      assistantId: created.id,
      name: created.name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown vapi error";
    console.error("[deploy-vapi] failed", { projectId, error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
