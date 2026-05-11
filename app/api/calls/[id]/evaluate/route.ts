// 通話 AI 評価実行 API
// Claude Sonnet 4.6 に書き起こしを渡して採点・要約・改善案を生成。
import { NextResponse } from "next/server";
import { callsRepo, transcriptsRepo, evaluationsRepo } from "@/lib/data";
import { requireCurrentSession, UnauthorizedError } from "@/lib/auth/session";
import { requireRole, PermissionDeniedError } from "@/lib/auth/permissions";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit/logger";
import { recordUsage, estimateLlmCostUsd } from "@/lib/usage/meter";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const evalSchema = z.object({
  scoreOverall: z.number().min(0).max(100),
  scores: z.record(z.string(), z.number()),
  summary: z.string(),
  summaryShort: z.string(),
  customerIntent: z.string().nullable(),
  classification: z.string().nullable(),
  highlights: z.array(z.object({ type: z.string(), quote: z.string(), reason: z.string() })),
  issues: z.array(z.object({ type: z.string(), quote: z.string(), reason: z.string(), severity: z.string().optional() })),
  nextActions: z.array(z.string()),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const startMs = Date.now();
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "ai_eval.run");
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    // Anthropic 直叩き (state-extractor / analyze-logs と同じパターン)
    const modelId: string = body.model ?? "claude-sonnet-4-6";

    const call = await callsRepo.get(session.organizationId, id);
    if (!call) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    const transcript = await transcriptsRepo.listByCall({ organizationId: session.organizationId, callId: id });
    if (!transcript.length) return NextResponse.json({ ok: false, error: "No transcript" }, { status: 422 });

    const evaluation = await evaluationsRepo.create({
      organizationId: session.organizationId,
      callId: id,
      model: modelId,
    });
    await evaluationsRepo.markRunning(session.organizationId, evaluation.id);

    const dialog = transcript
      .map((t) => `${t.role === "agent" ? "オペレーター" : t.role === "customer" ? "顧客" : t.role}: ${t.text}`)
      .join("\n");

    const prompt = `あなたは経験豊富なコール品質マネージャーです。以下の通話書き起こしを採点・要約してください。

# 通話情報
- 方向: ${call.direction}
- ステータス: ${call.status}
- アウトカム: ${call.outcome ?? "未確定"}
- 通話時間: ${call.duration_seconds ?? 0}秒

# 書き起こし
${dialog}

# 出力要件
JSON 一つのオブジェクトのみを返す。マークダウンで囲まない。
{
  "scoreOverall": 0-100,
  "scores": { "オープニング": 0-100, "ヒアリング": 0-100, "クロージング": 0-100, "対応マナー": 0-100 },
  "summary": "200字以内の要約",
  "summaryShort": "30字以内の超短縮要約",
  "customerIntent": "顧客の意図 (例: 価格比較中・即決希望・情報収集) または null",
  "classification": "appointment/rejected/callback/transfer/other のいずれか",
  "highlights": [{"type":"good_practice","quote":"...","reason":"..."}],
  "issues": [{"type":"missed_opportunity","quote":"...","reason":"...","severity":"low|medium|high"}],
  "nextActions": ["次に取るべきアクション..."]
}`;

    let parsed: z.infer<typeof evalSchema>;
    let usage = { promptTokens: 0, outputTokens: 0 };
    try {
      const result = await generateText({ model: anthropic(modelId), prompt });
      const json = JSON.parse(result.text.replace(/^```json\n?/, "").replace(/\n?```$/, ""));
      parsed = evalSchema.parse(json);
      usage = {
        promptTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
      };
    } catch (err) {
      await evaluationsRepo.fail(session.organizationId, evaluation.id, String(err));
      return NextResponse.json({ ok: false, error: "AI evaluation failed", detail: String(err) }, { status: 502 });
    }

    const latencyMs = Date.now() - startMs;
    const costUsd = estimateLlmCostUsd(modelId, usage.promptTokens, usage.outputTokens);
    const completed = await evaluationsRepo.complete(session.organizationId, evaluation.id, {
      scoreOverall: parsed.scoreOverall,
      scores: parsed.scores,
      summary: parsed.summary,
      summaryShort: parsed.summaryShort,
      customerIntent: parsed.customerIntent,
      classification: parsed.classification,
      highlights: parsed.highlights,
      issues: parsed.issues,
      nextActions: parsed.nextActions,
      promptTokens: usage.promptTokens,
      outputTokens: usage.outputTokens,
      costUsd,
      latencyMs,
    });

    // 使用量メトリクス
    await Promise.all([
      recordUsage({
        organizationId: session.organizationId,
        metric: "llm.input_tokens",
        provider: modelId.split("/")[0] ?? "anthropic",
        quantity: usage.promptTokens,
        unitCostUsd: estimateLlmCostUsd(modelId, 1, 0),
        callId: id,
      }),
      recordUsage({
        organizationId: session.organizationId,
        metric: "llm.output_tokens",
        provider: modelId.split("/")[0] ?? "anthropic",
        quantity: usage.outputTokens,
        unitCostUsd: estimateLlmCostUsd(modelId, 0, 1),
        callId: id,
      }),
    ]);

    await recordAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: AUDIT_ACTIONS.AI_EVAL_RUN,
      resourceType: "call",
      resourceId: id,
      resourceLabel: `通話 ${id.slice(0, 8)}`,
      status: "success",
      metadata: { model: modelId, score: parsed.scoreOverall, costUsd, latencyMs },
    });

    return NextResponse.json({ ok: true, evaluation: completed });
  } catch (e) {
    return errorToResponse(e);
  }
}

function errorToResponse(e: unknown) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  if (e instanceof PermissionDeniedError) return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
  console.error("[api/calls/:id/evaluate]", e);
  return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
}
