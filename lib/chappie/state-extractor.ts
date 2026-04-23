/**
 * 会話履歴 → ChappieOutput への構造化抽出。
 *
 * AI SDK v6: generateObject は非推奨 → generateText + Output.object({ schema }) を使う。
 * モデルは AI Gateway 経由で anthropic/claude-sonnet-4.6 を呼ぶ。抽出は境界が明確なので Opus 相当は不要。
 */
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { ChappieOutput } from "../vapi-compiler/types";
import type { Template } from "@/lib/templates/types";
import type { AttachmentContext } from "./meta-prompt";

const hearingFieldSchema = z.object({
  key: z.string().describe("snake_case のプロパティ名"),
  label: z.string().describe("人向け表示名"),
  type: z.enum(["string", "number", "boolean", "enum"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  description: z.string().optional(),
});

const taskFlowSchema = z.object({
  name: z.string(),
  trigger: z.string(),
  steps: z.array(z.string()),
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
  }),
});

const EXTRACTION_PROMPT = `あなたは会話ログを読み込んで、Vapi 音声AI エージェント設定に必要な情報を
JSON に構造化して抜き出すアシスタントです。

- 必ずすべてのフィールドを埋めること。
- 情報が不十分な場合は、テンプレートと添付資料から推定できる妥当なデフォルトを入れること。
- 言語は日本語で書かれていれば "ja"。
- firstMessage は電話の第一声として自然な1文にする。
- tasks は最低 3 つ以上。trigger（どの場面で発火するか）と steps（ステップ配列）を具体的に書く。
- hearingFields には業界標準の項目を会話からもテンプレからも拾って必ず含める。
- doNots / transferConditions / prohibitedBehaviors はテンプレの既定値＋会話で追加された禁止事項をマージする。
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
    model: anthropic("claude-sonnet-4-6"),
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
