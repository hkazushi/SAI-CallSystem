/**
 * POST /api/chappie/chat
 *
 * Chappie 壁打ち会話の Streaming チャット API。
 * Vercel AI Gateway 経由で "openai/gpt-5.4" をストリームする。
 *
 * Request body:  { messages: UIMessage[] }
 * Response:      AI SDK UI message stream (SSE)
 */
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { CHAPPIE_META_PROMPT, buildStageDirective } from "@/lib/chappie/meta-prompt";
import { detectStage } from "@/lib/chappie/stage-detector";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const modelMessages = await convertToModelMessages(messages);
  const stage = detectStage(
    modelMessages.map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : "",
    })),
  );

  const result = streamText({
    model: "openai/gpt-5.4",
    system: `${CHAPPIE_META_PROMPT}\n\n${buildStageDirective(stage)}`,
    messages: modelMessages,
    temperature: 0.6,
    providerOptions: {
      gateway: {
        tags: ["feature:chappie-chat", "env:dev"],
      },
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "x-chappie-stage": stage,
    },
  });
}
