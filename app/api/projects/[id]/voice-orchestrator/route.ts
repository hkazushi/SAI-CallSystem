/**
 * POST /api/projects/[id]/voice-orchestrator
 *
 * ブラウザの音声を STT → DFCX → TTS に通すオーケストレーター。
 * SaaS の本番音声基盤（Twilio 接続前の段階）として使う。
 *
 * フロー:
 *   1. multipart/form-data で audio (webm/opus) を受け取る
 *   2. GCP Speech-to-Text v2 (Chirp_2 / ja-JP) で文字起こし
 *   3. Dialogflow CX detectIntent でエージェント応答取得
 *   4. GCP Text-to-Speech v1 (Chirp3 HD / ja-JP) で MP3 合成
 *   5. JSON で transcript / responseText / audioBase64 を返す
 *
 * 必要な GCP API (sai-callsystem-dev で有効化):
 *   - Cloud Speech-to-Text API
 *   - Cloud Text-to-Speech API
 *   - Dialogflow API (既に有効)
 */
import { NextResponse } from "next/server";
import {
  getAccessToken,
  getGcpLocation,
  getGcpProjectId,
} from "@/lib/dfcx-client";

export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

const STT_MODEL = "chirp_2";
const STT_LANGUAGE = "ja-JP";
// chirp_2 が使えるリージョン: us-central1 / europe-west4 / asia-southeast1
// 日本に最も近いのは asia-southeast1 (シンガポール)。
const STT_LOCATION = "asia-southeast1";
const TTS_LANGUAGE = "ja-JP";
const TTS_VOICE = "ja-JP-Chirp3-HD-Aoede";

export async function POST(req: Request, { params }: RouteContext) {
  const { id: projectId } = await params;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "expected multipart/form-data with 'audio' file" },
      { status: 400 },
    );
  }

  const audioFile = formData.get("audio");
  const agentName = formData.get("agentName");
  const sessionId = formData.get("sessionId");
  const languageCode =
    typeof formData.get("languageCode") === "string"
      ? (formData.get("languageCode") as string)
      : STT_LANGUAGE;

  if (!(audioFile instanceof Blob) || audioFile.size === 0) {
    return NextResponse.json({ error: "audio file is required" }, { status: 400 });
  }
  if (typeof agentName !== "string" || !agentName.includes("/agents/")) {
    return NextResponse.json(
      { error: "agentName (projects/.../agents/...) is required" },
      { status: 400 },
    );
  }
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
  const audioBase64In = audioBuffer.toString("base64");

  const token = await getAccessToken();
  const gcpProjectId = getGcpProjectId();
  const dfcxLocation = getGcpLocation();

  try {
    /* ---------- Step 1: Speech-to-Text v2 (Chirp_2) ---------- */
    const transcript = await transcribe({
      token,
      gcpProjectId,
      audioBase64: audioBase64In,
      languageCode,
    });

    if (!transcript) {
      return NextResponse.json({
        ok: true,
        transcript: "",
        responseText: "",
        audioBase64: null,
        warning: "no_speech_detected",
      });
    }

    /* ---------- Step 2: DFCX detectIntent ---------- */
    const dfcxRes = await detectIntent({
      token,
      agentName,
      sessionId,
      text: transcript,
      languageCode,
      dfcxLocation,
    });

    const responseText = collectResponseText(dfcxRes);

    /* ---------- Step 3: Text-to-Speech (Chirp3 HD) ---------- */
    const audioBase64 = responseText
      ? await synthesize({ token, text: responseText, voiceName: TTS_VOICE })
      : null;

    return NextResponse.json({
      ok: true,
      projectId,
      transcript,
      responseText,
      audioBase64,
      sessionInfo: dfcxRes.queryResult?.currentPage?.displayName ?? null,
      parameters: dfcxRes.queryResult?.parameters ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown voice error";
    console.error("[voice-orchestrator] failed", { projectId, error: message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/* ---------------- helpers ---------------- */

async function transcribe(args: {
  token: string;
  gcpProjectId: string;
  audioBase64: string;
  languageCode: string;
}): Promise<string> {
  // Speech v2 の `_` recognizer はインライン設定で使い捨て。リソース作成不要。
  // chirp_2 はグローバル不可なので asia-southeast1 リージョン経由で叩く。
  const url = `https://${STT_LOCATION}-speech.googleapis.com/v2/projects/${args.gcpProjectId}/locations/${STT_LOCATION}/recognizers/_:recognize`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.token}`,
    },
    body: JSON.stringify({
      config: {
        autoDecodingConfig: {},
        languageCodes: [args.languageCode],
        model: STT_MODEL,
        features: {
          enableAutomaticPunctuation: true,
        },
      },
      content: args.audioBase64,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`STT failed: ${resp.status} ${resp.statusText} ${body}`);
  }
  const data = (await resp.json()) as {
    results?: Array<{ alternatives?: Array<{ transcript?: string }> }>;
  };
  const transcripts =
    data.results
      ?.map((r) => r.alternatives?.[0]?.transcript ?? "")
      .filter(Boolean) ?? [];
  return transcripts.join(" ").trim();
}

interface DfcxDetectIntentResponse {
  queryResult?: {
    responseMessages?: Array<{
      text?: { text?: string[] };
    }>;
    currentPage?: { name?: string; displayName?: string };
    parameters?: Record<string, unknown>;
  };
}

async function detectIntent(args: {
  token: string;
  agentName: string;
  sessionId: string;
  text: string;
  languageCode: string;
  dfcxLocation: string;
}): Promise<DfcxDetectIntentResponse> {
  // agentName: projects/{}/locations/{}/agents/{id}
  // session resource: <agentName>/sessions/<sessionId>
  const sessionResource = `${args.agentName}/sessions/${args.sessionId}`;
  const apiBase =
    args.dfcxLocation === "global"
      ? "https://dialogflow.googleapis.com/v3"
      : `https://${args.dfcxLocation}-dialogflow.googleapis.com/v3`;
  const url = `${apiBase}/${sessionResource}:detectIntent`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.token}`,
    },
    body: JSON.stringify({
      queryInput: {
        text: { text: args.text },
        languageCode: args.languageCode,
      },
    }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`DFCX detectIntent failed: ${resp.status} ${resp.statusText} ${body}`);
  }
  return (await resp.json()) as DfcxDetectIntentResponse;
}

function collectResponseText(res: DfcxDetectIntentResponse): string {
  const parts: string[] = [];
  for (const m of res.queryResult?.responseMessages ?? []) {
    for (const t of m.text?.text ?? []) {
      if (t) parts.push(t);
    }
  }
  return parts.join("\n").trim();
}

async function synthesize(args: {
  token: string;
  text: string;
  voiceName: string;
}): Promise<string> {
  const url = "https://texttospeech.googleapis.com/v1/text:synthesize";
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.token}`,
    },
    body: JSON.stringify({
      input: { text: args.text },
      voice: {
        languageCode: TTS_LANGUAGE,
        name: args.voiceName,
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 1.0,
      },
    }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`TTS failed: ${resp.status} ${resp.statusText} ${body}`);
  }
  const data = (await resp.json()) as { audioContent?: string };
  if (!data.audioContent) throw new Error("TTS returned no audioContent");
  return data.audioContent;
}
