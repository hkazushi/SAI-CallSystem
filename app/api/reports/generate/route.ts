// レポート自動生成 — KPIを集計し Claude にナラティブ要約を作らせる
import { NextResponse } from "next/server";
import { reportsRepo, dashboardRepo, periodRange } from "@/lib/data";
import { requireCurrentSession, UnauthorizedError } from "@/lib/auth/session";
import { requireRole, PermissionDeniedError } from "@/lib/auth/permissions";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit/logger";
import { recordUsage, estimateLlmCostUsd } from "@/lib/usage/meter";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ReportPeriod } from "@/lib/data/reports";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const startMs = Date.now();
  try {
    const session = await requireCurrentSession();
    requireRole(session.role, "report.create");
    const body = await req.json().catch(() => ({}));
    const period: ReportPeriod = body.period ?? "weekly";
    if (!["daily", "weekly", "monthly", "quarterly"].includes(period)) {
      return NextResponse.json({ ok: false, error: "Invalid period" }, { status: 400 });
    }
    const modelId: string = body.model ?? "claude-sonnet-4-6";

    const { start, end, title } = periodRange(period);

    const report = await reportsRepo.create({
      organizationId: session.organizationId,
      workspaceId: session.workspaceId,
      period,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      title,
      generatedBy: session.userId,
    });

    await reportsRepo.update(report.id, { status: "generating" });

    const kpi = await dashboardRepo.getKpi({
      organizationId: session.organizationId,
      fromIso: start.toISOString(),
      toIso: end.toISOString(),
    });

    const periodLabel = { daily: "日次", weekly: "週次", monthly: "月次", quarterly: "四半期" }[period];
    const prompt = `あなたはコールセンター運用のシニアアナリストです。以下のKPIスナップショットをもとに、経営層・運用責任者・現場マネージャーが意思決定に使えるナラティブレポートをマークダウンで生成してください。

# 期間
${periodLabel}レポート: ${start.toISOString().slice(0, 10)} 〜 ${end.toISOString().slice(0, 10)}

# 数値スナップショット
- 総通話数: ${kpi.totalCalls}件
- 完了通話: ${kpi.completedCalls}件
- 接続率: ${kpi.connectRate !== null ? (kpi.connectRate * 100).toFixed(1) + "%" : "—"}
- アポ獲得: ${kpi.appointments}件 (獲得率 ${kpi.appointmentRate !== null ? (kpi.appointmentRate * 100).toFixed(1) + "%" : "—"})
- 平均通話時間: ${kpi.avgDurationSec !== null ? Math.round(kpi.avgDurationSec) + "秒" : "—"}
- 平均品質スコア: ${kpi.avgScore !== null ? Math.round(kpi.avgScore) + "点" : "—"}
- LLM/通話コスト合計: $${kpi.costUsd.toFixed(4)}

# 結果別内訳
${kpi.byOutcome.map((o) => `- ${o.label}: ${o.count}件`).join("\n") || "(データなし)"}

# 感情分析内訳
${kpi.bySentiment.map((s) => `- ${s.label}: ${s.count}件`).join("\n") || "(データなし)"}

# 時間帯別 (24時間)
${kpi.byHour.filter((h) => h.count > 0).map((h) => `- ${h.hour}: ${h.count}件`).join("\n") || "(データなし)"}

# 出力要件
マークダウンで以下のセクションを必ず含める:

## エグゼクティブサマリー
3-5文で全体総括。前期比較は数値が無いので「前期との比較情報は未取得」と書く。

## 主要 KPI ハイライト
箇条書きで主要数値と所感を併記。

## 注目トピック
データから読み取れるパターン (時間帯の偏り、結果内訳の特徴、感情分析の傾向など) を2-3点。

## 次期のアクション
具体的・実行可能なアクションを3項目まで。

トーンは日本語ビジネスフォーマル、簡潔・データドリブン。マークダウンのみ、前置きや「了解しました」は不要。`;

    let summaryText = "";
    let usage = { promptTokens: 0, outputTokens: 0 };
    try {
      const result = await generateText({ model: anthropic(modelId), prompt });
      summaryText = result.text;
      usage = {
        promptTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
      };
    } catch (err) {
      await reportsRepo.update(report.id, {
        status: "failed",
        error_message: String(err),
      });
      return NextResponse.json({ ok: false, error: "Generation failed", detail: String(err) }, { status: 502 });
    }

    const costUsd = estimateLlmCostUsd(modelId, usage.promptTokens, usage.outputTokens);
    const latencyMs = Date.now() - startMs;

    const finalized = await reportsRepo.update(report.id, {
      status: "ready",
      summary_markdown: summaryText,
      kpi_snapshot: kpi as unknown as Record<string, unknown>,
      generation_cost_usd: costUsd,
      generated_at: new Date().toISOString(),
    });

    await Promise.all([
      recordUsage({
        organizationId: session.organizationId,
        metric: "llm.input_tokens",
        provider: "anthropic",
        quantity: usage.promptTokens,
        unitCostUsd: estimateLlmCostUsd(modelId, 1, 0),
      }),
      recordUsage({
        organizationId: session.organizationId,
        metric: "llm.output_tokens",
        provider: "anthropic",
        quantity: usage.outputTokens,
        unitCostUsd: estimateLlmCostUsd(modelId, 0, 1),
      }),
    ]);

    await recordAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: AUDIT_ACTIONS.REPORT_GENERATE,
      resourceType: "report",
      resourceId: report.id,
      resourceLabel: title,
      status: "success",
      metadata: { period, costUsd, latencyMs },
    });

    return NextResponse.json({ ok: true, report: finalized });
  } catch (e) {
    return errorToResponse(e);
  }
}

function errorToResponse(e: unknown) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
  if (e instanceof PermissionDeniedError) return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
  console.error("[api/reports/generate]", e);
  return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
}
