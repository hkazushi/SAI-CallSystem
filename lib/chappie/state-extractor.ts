/**
 * 会話履歴 → ChappieOutput への構造化抽出。
 *
 * AI SDK v6 移行: generateObject は非推奨 → generateText + Output.object({ schema }) を使う。
 * 直接 Anthropic SDK 呼び出しで Sonnet 4.6 を使用。抽出はタスク境界が明確なので Opus 相当は不要。
 */
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { ChappieOutput } from "../vapi-compiler/types";

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
- 情報が不十分な場合は、業種から推定できる妥当なデフォルトを入れて構わない。
- 言語は日本語で書かれていれば "ja"。
- firstMessage は電話の第一声として自然な1文にする。
`.trim();

export async function extractChappieOutput(
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<ChappieOutput> {
  const result = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    output: Output.object({ schema: chappieOutputSchema }),
    system: EXTRACTION_PROMPT,
    messages: [
      {
        role: "user",
        content: `以下の壁打ち会話ログから ChappieOutput を抽出してください。\n\n${formatConversation(messages)}`,
      },
    ],
  });

  return result.output;
}

function formatConversation(messages: { role: string; content: string }[]): string {
  return messages
    .map((m) => `[${m.role === "user" ? "ユーザ" : "Chappie"}] ${m.content}`)
    .join("\n");
}
