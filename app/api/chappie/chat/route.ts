/**
 * POST /api/chappie/chat
 *
 * Chappie 壁打ち会話の Streaming チャット API。
 *
 * Request body:
 *   {
 *     messages: UIMessage[],
 *     templateId?: string,   // lib/templates の id（例: "hikari-ob"）
 *     attachments?: { filename, text, charCount }[]  // ingest-file の結果を流し込む
 *   }
 *
 * Response: AI SDK UI message stream (SSE) — messageMetadata に現在 stage を載せる。
 */
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
import { NextResponse } from "next/server";
import {
  CHAPPIE_META_PROMPT,
  buildStageDirective,
  buildTemplateContext,
  buildAttachmentContext,
  buildEngineDirective,
  type AttachmentContext,
  type ChappieEngine,
} from "@/lib/chappie/meta-prompt";
import { detectStage } from "@/lib/chappie/stage-detector";
import type { WallDiscussionStage } from "@/lib/chappie/types";
import { getTemplate } from "@/lib/templates";

export const maxDuration = 60;

export type ChappieMessageMetadata = {
  stage: WallDiscussionStage;
};

export async function POST(req: Request) {
  // TODO(auth, Phase B): Supabase Auth JWT を検証し、未認証ならここで 401 を返す。

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { messages, templateId, attachments, engine } = (body ?? {}) as {
    messages?: UIMessage[];
    templateId?: string;
    attachments?: AttachmentContext[];
    engine?: ChappieEngine;
  };
  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  const modelMessages = await convertToModelMessages(messages);
  const stage = detectStage(
    modelMessages.map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : "",
    })),
  );

  // Build system prompt layers: base meta prompt + optional template + optional attachments + stage focus
  const sections: string[] = [CHAPPIE_META_PROMPT];
  if (templateId) {
    const template = getTemplate(templateId);
    if (template) sections.push(buildTemplateContext(template));
  }
  if (Array.isArray(attachments) && attachments.length > 0) {
    const safeAttachments = attachments
      .filter(
        (a): a is AttachmentContext =>
          !!a && typeof a.text === "string" && typeof a.filename === "string",
      )
      .map((a) => ({
        filename: a.filename,
        text: a.text,
        charCount:
          typeof a.charCount === "number" && Number.isFinite(a.charCount)
            ? a.charCount
            : a.text.length,
      }));
    const block = buildAttachmentContext(safeAttachments);
    if (block) sections.push(block);
  }
  if (engine) {
    sections.push(buildEngineDirective(engine));
  }
  sections.push(buildStageDirective(stage));

  const system = sections.join("\n\n");

  const result = streamText({
    model: openrouter("anthropic/claude-opus-4.1"),
    system,
    messages: modelMessages,
    temperature: 0.6,
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: (): ChappieMessageMetadata => ({ stage }),
    onError: (error) => {
      console.error("[chappie-chat] stream error", { stage, templateId, error });
      return error instanceof Error ? error.message : "unknown stream error";
    },
  });
}
