/**
 * POST /api/projects/[id]/dfcx-text
 *
 * テキストのみで Dialogflow CX agent を叩くエンドポイント。
 * STT/TTS をバイパスし、フロー遷移を高速検証するためのテストパス。
 *
 * 入力: { agentName, sessionId, text, languageCode? }
 * 出力: { responseText, parameters, currentPage }
 */
import { NextResponse } from "next/server";
import { getAccessToken, getGcpLocation } from "@/lib/dfcx-client";

export const maxDuration = 30;

type RouteContext = { params: Promise<{ id: string }> };

interface DetectIntentResponse {
  queryResult?: {
    responseMessages?: Array<{ text?: { text?: string[] } }>;
    currentPage?: { name?: string; displayName?: string };
    parameters?: Record<string, unknown>;
  };
}

function quotaProject(): string | undefined {
  return process.env.GOOGLE_CLOUD_QUOTA_PROJECT ?? process.env.GCP_PROJECT_ID;
}

export async function POST(req: Request, { params }: RouteContext) {
  const { id: projectId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    agentName?: string;
    sessionId?: string;
    text?: string;
    languageCode?: string;
  };

  if (!body.agentName || !body.agentName.includes("/agents/")) {
    return NextResponse.json({ error: "agentName is required" }, { status: 400 });
  }
  if (!body.sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }
  const text = (body.text ?? "").trim();
  const languageCode = body.languageCode ?? "ja-JP";

  const token = await getAccessToken();
  const dfcxLocation = getGcpLocation();
  const apiBase =
    dfcxLocation === "global"
      ? "https://dialogflow.googleapis.com/v3"
      : `https://${dfcxLocation}-dialogflow.googleapis.com/v3`;
  const sessionResource = `${body.agentName}/sessions/${body.sessionId}`;
  const url = `${apiBase}/${sessionResource}:detectIntent`;

  // 空テキストは welcome イベント代替（Default Welcome Intent を発火させる）
  const queryInput = text
    ? { text: { text }, languageCode }
    : { text: { text: "こんにちは" }, languageCode };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(quotaProject() ? { "X-Goog-User-Project": quotaProject()! } : {}),
      },
      body: JSON.stringify({ queryInput }),
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      return NextResponse.json(
        { error: `DFCX detectIntent failed: ${resp.status} ${t}` },
        { status: 502 },
      );
    }
    const data = (await resp.json()) as DetectIntentResponse;
    const parts: string[] = [];
    for (const m of data.queryResult?.responseMessages ?? []) {
      for (const t of m.text?.text ?? []) if (t) parts.push(t);
    }
    return NextResponse.json({
      ok: true,
      projectId,
      responseText: parts.join("\n").trim(),
      currentPage: data.queryResult?.currentPage?.displayName ?? null,
      parameters: data.queryResult?.parameters ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 502 },
    );
  }
}
