/**
 * POST /api/chappie/chat
 *
 * Chappie 壁打ち会話の Streaming チャット API。
 * Vercel AI Gateway 経由で "openai/gpt-5.4" をストリームする。
 *
 * Request body:  { messages: UIMessage[] }
 * Response:      AI SDK UI message stream (SSE) — messageMetadata に現在 stage を載せる
 */
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { NextResponse } from "next/server";
import { CHAPPIE_META_PROMPT, buildStageDirective } from "@/lib/chappie/meta-prompt";
import { detectStage } from "@/lib/chappie/stage-detector";
import type { WallDiscussionStage } from "@/lib/chappie/types";

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

  const { messages } = (body ?? {}) as { messages?: UIMessage[] };
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

  const result = streamText({
    model: anthropic("claude-opus-4-7"),
    system: `${CHAPPIE_META_PROMPT}\n\n${buildStageDirective(stage)}`,
    messages: modelMessages,
    temperature: 0.6,
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: (): ChappieMessageMetadata => ({ stage }),
    onError: (error) => {
      console.error("[chappie-chat] stream error", { stage, error });
      return error instanceof Error ? error.message : "unknown stream error";
    },
  });
}
