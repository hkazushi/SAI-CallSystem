/**
 * 会話履歴 → ChappieOutput への構造化抽出。
 *
 * AI SDK v6: generateObject は非推奨 → generateText + Output.object({ schema }) を使う。
 * モデルは @ai-sdk/anthropic 直叩きで claude-sonnet-4-6 を呼ぶ。抽出は境界が明確なので Opus 相当は不要。
 */
import { generateText, Output } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
import { z } from "zod";
import type { ChappieOutput } from "../vapi-compiler/types";
import type { Template } from "@/lib/templates/types";
import type { AttachmentContext } from "./meta-prompt";

const dfcxEntityTypeSchema = z.enum([
  "@sys.person",
  "@sys.phone-number",
  "@sys.address",
  "@sys.date-time",
  "@sys.number",
  "@sys.email",
  "@sys.any",
]);

const repromptStrategySchema = z.enum(["gentle", "assertive", "offer_transfer"]);

const hearingFieldSchema = z.object({
  key: z.string().describe("snake_case のプロパティ名"),
  label: z.string().describe("人向け表示名"),
  type: z.enum(["string", "number", "boolean", "enum"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  description: z.string().optional(),
  // DFCX 用 optional 拡張: スロット埋めの エンティティ型 / reprompt戦略 / 最大再質問回数
  dfcxEntityType: dfcxEntityTypeSchema
    .optional()
    .describe("DFCX で使うエンティティ型 (label/key から推定可。明示するときだけ埋める)"),
  repromptStrategy: repromptStrategySchema
    .optional()
    .describe("DFCX no-match 時のトーン: gentle / assertive / offer_transfer"),
  maxReprompts: z.number()
    .optional()
    .describe("DFCX reprompt の最大回数 (整数 1-5、default 3)"),
});

const taskFlowSchema = z.object({
  name: z.string(),
  trigger: z.string(),
  steps: z.array(z.string()),
  // DFCX 用 optional 拡張: trigger 発話のバリエーション (Intent.trainingPhrases)
  intentTrainingPhrases: z.array(z.string())
    .optional()
    .describe("DFCX 用: trigger と同義の発話バリエーション (3-5個推奨)"),
});

const chappieOutputSchema = z.object({
  industry: z.string(),
  assistantName: z.string(),
  firstMessage: z.string(),
  persona: z.object({
    tone: z.string(),
    language: z.enum(["ja", "en"]),
    doNots: z.array(z.string()),
  }),
  tasks: z.array(taskFlowSchema),
  hearingFields: z.array(hearingFieldSchema),
  guardrails: z.object({
    transferConditions: z.array(z.string()),
    prohibitedBehaviors: z.array(z.string()),
    // DFCX 用 optional: エスカレーション専用 Intent の displayName
    escalationIntent: z.string()
      .optional()
      .describe("DFCX 用: エスカレーション専用 Intent の displayName (任意)"),
  }),
});

const EXTRACTION_PROMPT = `あなたは会話ログを読み込んで、音声AI エージェント設定 (Vapi & Dialogflow CX 両対応) に必要な情報を
JSON に構造化して抜き出すアシスタントです。

- 必ずすべてのフィールドを埋めること。
- 情報が不十分な場合は、テンプレートと添付資料から推定できる妥当なデフォルトを入れること。
- 言語は日本語で書かれていれば "ja"。
- firstMessage は電話の第一声として自然な1文にする。
- tasks は最低 3 つ以上。trigger（どの場面で発火するか）と steps（ステップ配列）を具体的に書く。
- hearingFields には業界標準の項目を会話からもテンプレからも拾って必ず含める。
- doNots / transferConditions / prohibitedBehaviors はテンプレの既定値＋会話で追加された禁止事項をマージする。

# DFCX 用 optional フィールドの埋め方 (任意・推測でOK):
- hearingFields[].dfcxEntityType: label/key から推定。「お名前」→ @sys.person、「電話番号」→ @sys.phone-number、
  「住所」→ @sys.address、「希望日時」→ @sys.date-time、「料金/月額」→ @sys.number、それ以外は @sys.any
- hearingFields[].repromptStrategy: ペルソナのトーンから推定。「丁寧」→ gentle、「テキパキ/ハキハキ」→ assertive、
  「サポート系/解約阻止系」→ offer_transfer
- hearingFields[].maxReprompts: 通常は 3。重要度の高い項目で会話で「絶対聞きたい」と話されていれば 2 (早期エスカレーション)
- tasks[].intentTrainingPhrases: trigger を 3-5 個の発話バリエーションに展開。
  例: trigger="解約したい" → ["解約したい", "やめたい", "契約終了したい", "もう使わない"]
- guardrails.escalationIntent: 会話で明確にエスカレーション専用の発話が定義されていれば "intent.escalation.<slug>" 形式で。
`.trim();

export async function extractChappieOutput(
  messages: { role: "user" | "assistant"; content: string }[],
  context?: {
    template?: Template;
    attachments?: AttachmentContext[];
  },
): Promise<ChappieOutput> {
  const sections: string[] = [];

  if (context?.template) {
    sections.push(buildTemplatePriorBlock(context.template));
  }

  if (context?.attachments && context.attachments.length > 0) {
    const attachBlock = context.attachments
      .map(
        (a, i) =>
          `### 添付 ${i + 1}: ${a.filename} (${a.charCount.toLocaleString()} 文字)\n${a.text}`,
      )
      .join("\n\n---\n\n");
    sections.push(`# ユーザー添付資料\n\n${attachBlock}`);
  }

  sections.push(`# 壁打ち会話ログ\n\n${formatConversation(messages)}`);
  sections.push(
    `# 指示\n上記のテンプレート既定値・添付資料・会話を統合し、ChappieOutput を埋めてください。\n会話で明示的に変更されていない項目はテンプレの既定値を使って構いません。`,
  );

  const result = await generateText({
    model: openrouter("openai/gpt-4o-mini"),
    output: Output.object({ schema: chappieOutputSchema }),
    system: EXTRACTION_PROMPT,
    messages: [{ role: "user", content: sections.join("\n\n---\n\n") }],
  });

  return result.output;
}

function buildTemplatePriorBlock(template: Template): string {
  const objections = template.typicalObjections
    .map((o) => `- 「${o.trigger}」: ${o.suggestedResponses[0] ?? ""}`)
    .join("\n");
  const hearing = template.defaultHearingFields
    .map((f) => `- ${f.key} (${f.label}, ${f.type}, ${f.required ? "required" : "optional"})`)
    .join("\n");
  return `# 選択テンプレートの既定値（デフォルトとして使用可）

industry: ${template.industry}
direction: ${template.direction}
displayName: ${template.displayName}
defaultFirstMessage: ${template.defaultFirstMessage}
defaultTone: ${template.defaultPersona.tone}
doNots:
${template.defaultPersona.doNots.map((d) => `- ${d}`).join("\n")}
hearingFields:
${hearing}
typicalObjections:
${objections}
transferConditions:
${template.transferConditions.map((t) => `- ${t}`).join("\n")}
industryKnowledge: ${template.industryKnowledgeBrief}`;
}

function formatConversation(messages: { role: string; content: string }[]): string {
  return messages
    .map((m) => `[${m.role === "user" ? "ユーザ" : "Chappie"}] ${m.content}`)
    .join("\n");
}
