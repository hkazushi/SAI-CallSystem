import { NextRequest, NextResponse } from "next/server";
import { getDfcxConfig, makeSessionsClient, DfcxConfigError } from "@/lib/dfcx-client";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Dialogflow CX Sessions API でテキストベースのテスト会話を行う。
 * Request: { agentId: string, sessionId: string, text: string, languageCode?: string }
 * Response: { replies: string[], currentPage?: string, matchedIntent?: string, parameters?: Record<string, unknown> }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, sessionId, text, languageCode = "ja" } = body as {
      agentId: string;
      sessionId: string;
      text: string;
      languageCode?: string;
    };
    if (!agentId || !sessionId || typeof text !== "string") {
      return NextResponse.json({ error: "agentId, sessionId, text are required" }, { status: 400 });
    }

    const cfg = getDfcxConfig();
    const client = makeSessionsClient(cfg);

    const sessionPath = `projects/${cfg.projectId}/locations/${cfg.location}/agents/${agentId}/sessions/${sessionId}`;

    const [response] = await client.detectIntent({
      session: sessionPath,
      queryInput: {
        text: { text },
        languageCode,
      },
    });

    const result = response.queryResult;
    const replies: string[] = [];
    for (const msg of result?.responseMessages ?? []) {
      if (msg.text?.text) {
        for (const t of msg.text.text) if (t) replies.push(t);
      }
    }

    // parametersを素朴にstring化
    const parameters: Record<string, unknown> = {};
    const fields = result?.parameters?.fields;
    if (fields) {
      for (const [k, v] of Object.entries(fields)) {
        parameters[k] = (v as any).stringValue ?? (v as any).numberValue ?? (v as any).boolValue ?? null;
      }
    }

    return NextResponse.json({
      replies,
      currentPage: result?.currentPage?.displayName ?? null,
      matchedIntent: result?.intent?.displayName ?? null,
      confidence: result?.intentDetectionConfidence ?? null,
      parameters,
    });
  } catch (e) {
    if (e instanceof DfcxConfigError) {
      return NextResponse.json({ error: e.message, code: "CONFIG_ERROR" }, { status: 400 });
    }
    console.error("[/api/dfcx/chat]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "chat failed" },
      { status: 500 },
    );
  }
}
