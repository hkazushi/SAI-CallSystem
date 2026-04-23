/**
 * POST /api/chappie/extract
 *
 * 壁打ち会話履歴 + 選択テンプレ + 添付資料 から ChappieOutput を構造化抽出する。
 *
 * Request body:
 *   {
 *     messages: UIMessage[],
 *     templateId?: string,
 *     attachments?: { filename, text, charCount }[]
 *   }
 * Response: { output: ChappieOutput }
 */
import { NextResponse } from "next/server";
import type { UIMessage } from "ai";
import { extractChappieOutput } from "@/lib/chappie/state-extractor";
import { getTemplate } from "@/lib/templates";
import type { AttachmentContext } from "@/lib/chappie/meta-prompt";

export const maxDuration = 60;

function extractText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export async function POST(req: Request) {
  // TODO(auth, Phase B): Supabase Auth JWT を検証する。

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { messages, templateId, attachments } = (body ?? {}) as {
    messages?: UIMessage[];
    templateId?: string;
    attachments?: AttachmentContext[];
  };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "messages array with at least one message is required" },
      { status: 400 },
    );
  }

  const flatMessages = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: extractText(m),
    }))
    .filter((m) => m.content.length > 0);

  if (flatMessages.length === 0) {
    return NextResponse.json({ error: "no textual messages found" }, { status: 400 });
  }

  const template = templateId ? getTemplate(templateId) : undefined;
  const safeAttachments: AttachmentContext[] = Array.isArray(attachments)
    ? attachments
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
        }))
    : [];

  try {
    const output = await extractChappieOutput(flatMessages, {
      template,
      attachments: safeAttachments,
    });
    return NextResponse.json({ output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown extract error";
    console.error("[chappie-extract] failed", { error: message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
