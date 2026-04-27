/**
 * POST /api/projects/[id]/analyze-logs
 *
 * 既存の通話/チャットログ → AI 分析 → Partial<ChappieOutput> ドラフト生成。
 *
 * Chappie 壁打ちの初期値として注入することで、
 * ゼロからのトークツリー作成を避け、業界実態に即した DFCX/Vapi Agent を生成する。
 *
 * Request body:
 *   {
 *     logText: string,                                // 生ログ (会話・チャット・文字起こし)
 *     logType: "call" | "chat" | "transcript",
 *     templateId?: string                              // 業界テンプレ id (推定文脈用)
 *   }
 *
 * 100KB 超は 30KB チャンクに分割 → 各チャンクで抽出 → 集約。
 *
 * モデル: anthropic/claude-sonnet-4.6 via Vercel AI Gateway (state-extractor と同パターン)
 */
import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getTemplate } from "@/lib/templates";

export const maxDuration = 120;

const CHUNK_SIZE = 30_000;
const SPLIT_THRESHOLD = 100_000;

const logTypeSchema = z.enum(["call", "chat", "transcript"]);

/**
 * チャンクごとの抽出結果。
 * - topScenarios: 出現した「用件」「シナリオ」 (頻度付き)
 * - objectionCandidates: お客さん側の反論・断り文句 (DFCX Intent化候補)
 * - trainingPhraseCandidates: 同じ意図の言い回しグルーピング
 * - hearingOrderObserved: 実際にヒアリングしている順番
 * - personaSignals: トーンの観察 (テキパキ・丁寧・サポート系)
 */
const chunkAnalysisSchema = z.object({
  topScenarios: z.array(
    z.object({
      name: z.string(),
      trigger: z.string(),
      steps: z.array(z.string()),
      frequency: z.number().int().min(1),
    }),
  ),
  objectionCandidates: z.array(
    z.object({
      trigger: z.string().describe("反論・断り文句 (お客さん発話)"),
      suggestedResponses: z.array(z.string()).max(3),
      frequency: z.number().int().min(1),
    }),
  ),
  trainingPhraseCandidates: z.array(
    z.object({
      intentName: z.string().describe("snake_case 推奨"),
      phrases: z.array(z.string()).min(2).max(8),
    }),
  ),
  hearingOrderObserved: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(["string", "number", "boolean", "enum"]),
      required: z.boolean(),
      orderIndex: z.number().int().min(0),
    }),
  ),
  personaSignals: z.object({
    tone: z.string(),
    doNots: z.array(z.string()),
    transferTriggers: z.array(z.string()),
  }),
});

type ChunkAnalysis = z.infer<typeof chunkAnalysisSchema>;

const ANALYSIS_PROMPT = `あなたは音声AIエージェント設計のために、既存の通話/チャットログから
DFCX/Vapi Agent の初期値となる構造を抽出するアシスタントです。

抽出対象:
1. topScenarios: 何の用件で電話/チャットが来ているか。trigger と steps を具体的に書く。
2. objectionCandidates: お客さん側の反論・断り・不安。DFCX の custom Intent 候補。
3. trainingPhraseCandidates: 同じ意図の言い回しを 2-8 個でグルーピング。intentName は snake_case。
4. hearingOrderObserved: オペレーターが実際に聞いている項目を観察された順序で列挙。
5. personaSignals: 全体のトーン (丁寧/テキパキ/サポート系) と、避けている発話、人間転送のタイミング。

ルール:
- 個人情報 (氏名・電話番号・住所の具体値) は抽出結果に含めず、汎化する (例: 「お名前を確認」)。
- frequency は出現回数の概算 (1, 2, 3...)。
- ログから読み取れない項目は空配列で構わない。
- intentName は半角英数とアンダースコア (例: "objection_already_using")。
`.trim();

interface AnalyzeLogsBody {
  logText?: string;
  logType?: "call" | "chat" | "transcript";
  templateId?: string;
}

export async function POST(req: Request) {
  let body: AnalyzeLogsBody;
  try {
    body = (await req.json()) as AnalyzeLogsBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!body.logText || typeof body.logText !== "string") {
    return NextResponse.json({ error: "logText is required" }, { status: 400 });
  }

  const parsedType = logTypeSchema.safeParse(body.logType ?? "call");
  if (!parsedType.success) {
    return NextResponse.json({ error: "logType must be call|chat|transcript" }, { status: 400 });
  }
  const logType = parsedType.data;

  // 業界文脈ヒント (テンプレ指定があれば)
  let templateContext = "";
  if (body.templateId) {
    const t = getTemplate(body.templateId);
    if (t) {
      templateContext = `\n\n# 業界文脈ヒント\nindustry: ${t.industry}\ndirection: ${t.direction}\ndisplayName: ${t.displayName}\nindustryKnowledge: ${t.industryKnowledgeBrief}`;
    }
  }

  // チャンク分割 (大きいログだけ)
  const chunks =
    body.logText.length > SPLIT_THRESHOLD ? splitIntoChunks(body.logText, CHUNK_SIZE) : [body.logText];

  const chunkResults: ChunkAnalysis[] = [];
  for (const [i, chunk] of chunks.entries()) {
    try {
      const result = await generateText({
        model: "anthropic/claude-sonnet-4.6",
        output: Output.object({ schema: chunkAnalysisSchema }),
        system: ANALYSIS_PROMPT,
        messages: [
          {
            role: "user",
            content: `# ログタイプ: ${logType}\n# チャンク ${i + 1} / ${chunks.length}${templateContext}\n\n# ログ本文\n${chunk}`,
          },
        ],
      });
      chunkResults.push(result.output);
    } catch (err) {
      console.error("[analyze-logs] chunk failed", { index: i, error: err });
      // 1チャンク失敗しても残りで集計する
    }
  }

  if (chunkResults.length === 0) {
    return NextResponse.json(
      { error: "all chunks failed to analyze" },
      { status: 502 },
    );
  }

  const merged = mergeChunkResults(chunkResults);
  const draft = buildDraftChappieOutput(merged, body.templateId);

  return NextResponse.json({
    ok: true,
    chunkCount: chunks.length,
    analyzedChunks: chunkResults.length,
    rawAnalysis: merged,
    draft,
  });
}

/* ---------- helpers ---------- */

function splitIntoChunks(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

function mergeChunkResults(results: ChunkAnalysis[]): ChunkAnalysis {
  const scenarioMap = new Map<string, ChunkAnalysis["topScenarios"][number]>();
  const objectionMap = new Map<string, ChunkAnalysis["objectionCandidates"][number]>();
  const trainingMap = new Map<string, ChunkAnalysis["trainingPhraseCandidates"][number]>();
  const hearingMap = new Map<string, ChunkAnalysis["hearingOrderObserved"][number]>();
  const allDoNots = new Set<string>();
  const allTransferTriggers = new Set<string>();
  const tones: string[] = [];

  for (const r of results) {
    for (const s of r.topScenarios) {
      const ex = scenarioMap.get(s.name);
      if (ex) {
        ex.frequency += s.frequency;
        ex.steps = mergeUnique(ex.steps, s.steps);
      } else {
        scenarioMap.set(s.name, { ...s });
      }
    }
    for (const o of r.objectionCandidates) {
      const ex = objectionMap.get(o.trigger);
      if (ex) {
        ex.frequency += o.frequency;
        ex.suggestedResponses = mergeUnique(ex.suggestedResponses, o.suggestedResponses).slice(0, 3);
      } else {
        objectionMap.set(o.trigger, { ...o });
      }
    }
    for (const t of r.trainingPhraseCandidates) {
      const ex = trainingMap.get(t.intentName);
      if (ex) {
        ex.phrases = mergeUnique(ex.phrases, t.phrases).slice(0, 8);
      } else {
        trainingMap.set(t.intentName, { ...t });
      }
    }
    for (const h of r.hearingOrderObserved) {
      if (!hearingMap.has(h.key)) hearingMap.set(h.key, h);
    }
    r.personaSignals.doNots.forEach((d) => allDoNots.add(d));
    r.personaSignals.transferTriggers.forEach((t) => allTransferTriggers.add(t));
    if (r.personaSignals.tone) tones.push(r.personaSignals.tone);
  }

  return {
    topScenarios: Array.from(scenarioMap.values()).sort((a, b) => b.frequency - a.frequency),
    objectionCandidates: Array.from(objectionMap.values()).sort(
      (a, b) => b.frequency - a.frequency,
    ),
    trainingPhraseCandidates: Array.from(trainingMap.values()),
    hearingOrderObserved: Array.from(hearingMap.values()).sort(
      (a, b) => a.orderIndex - b.orderIndex,
    ),
    personaSignals: {
      tone: tones[0] ?? "",
      doNots: Array.from(allDoNots),
      transferTriggers: Array.from(allTransferTriggers),
    },
  };
}

function mergeUnique<T>(a: T[], b: T[]): T[] {
  return Array.from(new Set([...a, ...b]));
}

/**
 * 集約結果を Partial<ChappieOutput> + 拡張情報に変換。
 * Chappie chat の system に注入しやすい形にする。
 */
function buildDraftChappieOutput(merged: ChunkAnalysis, templateId?: string) {
  return {
    templateId,
    suggestedTasks: merged.topScenarios.slice(0, 6).map((s) => ({
      name: s.name,
      trigger: s.trigger,
      steps: s.steps,
      intentTrainingPhrases:
        merged.trainingPhraseCandidates.find((t) => t.intentName.includes(slugify(s.name)))
          ?.phrases ?? [],
    })),
    suggestedHearingFields: merged.hearingOrderObserved.map((h) => ({
      key: h.key,
      label: h.label,
      type: h.type,
      required: h.required,
    })),
    suggestedObjections: merged.objectionCandidates.slice(0, 8).map((o) => ({
      trigger: o.trigger,
      suggestedResponses: o.suggestedResponses,
    })),
    suggestedPersona: {
      tone: merged.personaSignals.tone,
      doNots: merged.personaSignals.doNots,
    },
    suggestedTransferConditions: merged.personaSignals.transferTriggers,
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w]+/g, "_")
    .replace(/^_|_$/g, "");
}
