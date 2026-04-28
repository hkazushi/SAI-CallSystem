"use client";
import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/page-transition";
import { Mic, MicOff, Loader2, Volume2, AlertCircle, RotateCcw } from "lucide-react";
import { safeUuid, isSecureContextAvailable } from "@/lib/safe-uuid";

type Turn = {
  id: string;
  role: "user" | "agent";
  text: string;
  audioUrl?: string;
};

function TestVoiceInner() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "new";
  const search = useSearchParams();
  const agentName = search.get("agentName") ?? "";

  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    setSessionId(safeUuid());
  }, []);
  const [recording, setRecording] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<"prompt" | "granted" | "denied">("prompt");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermission("granted");

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        await sendToOrchestrator(blob);
      };

      recorder.start();
      setRecording(true);
    } catch (e) {
      setPermission("denied");
      setError(e instanceof Error ? e.message : "マイクの使用が許可されませんでした");
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  const sendToOrchestrator = useCallback(
    async (blob: Blob) => {
      if (!agentName) {
        setError("agentName が URL に指定されていません");
        return;
      }
      setThinking(true);
      try {
        const fd = new FormData();
        fd.append("audio", blob, "speech.webm");
        fd.append("agentName", agentName);
        fd.append("sessionId", sessionId);

        const resp = await fetch(`/api/projects/${projectId}/voice-orchestrator`, {
          method: "POST",
          body: fd,
        });
        const data = (await resp.json()) as {
          ok?: boolean;
          transcript?: string;
          responseText?: string;
          audioBase64?: string | null;
          warning?: string;
          error?: string;
        };

        if (!resp.ok || !data.ok) {
          throw new Error(data.error ?? `voice-orchestrator failed (${resp.status})`);
        }

        if (data.warning === "no_speech_detected") {
          setError("音声が検出できませんでした。もう一度お試しください。");
          return;
        }

        const userTurn: Turn = {
          id: safeUuid(),
          role: "user",
          text: data.transcript ?? "",
        };
        const agentAudioUrl = data.audioBase64
          ? base64ToObjectUrl(data.audioBase64, "audio/mpeg")
          : undefined;
        const agentTurn: Turn = {
          id: safeUuid(),
          role: "agent",
          text: data.responseText ?? "",
          audioUrl: agentAudioUrl,
        };
        setTurns((prev) => [...prev, userTurn, agentTurn]);

        if (agentAudioUrl && audioElRef.current) {
          audioElRef.current.src = agentAudioUrl;
          audioElRef.current.play().catch(() => {
            /* autoplay policy などは無視 */
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "通信エラー");
      } finally {
        setThinking(false);
      }
    },
    [agentName, projectId, sessionId],
  );

  const resetSession = useCallback(() => {
    setTurns([]);
    setSessionId(safeUuid());
    setError(null);
  }, []);

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-2xl px-4 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">音声テスト（Dialogflow CX）</h1>
          <p className="text-[12px] text-muted-foreground/70">
            ブラウザのマイクで実際にエージェントと会話できます。<br />
            <span className="font-mono break-all">{agentName || "agentName 未指定"}</span>
          </p>
        </header>

        {!isSecureContextAvailable() && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] text-amber-200">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              現在のページは HTTPS ではないため、ブラウザのマイク（getUserMedia）が使えません。
              ローカルで <span className="font-mono">http://localhost:3000</span> 経由でアクセスするか、
              本番ドメインで HTTPS を有効化してください。
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-[12px] text-red-200">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-lg border border-white/10 bg-white/5 p-4 min-h-[280px] space-y-3">
          {turns.length === 0 ? (
            <p className="text-[12px] text-muted-foreground/50 text-center py-12">
              下のマイクボタンを押して話しかけてください
            </p>
          ) : (
            turns.map((t) => (
              <div
                key={t.id}
                className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-[12px] ${
                    t.role === "user"
                      ? "bg-primary/20 border border-primary/30"
                      : "bg-white/10 border border-white/15"
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground/60 mb-0.5">
                    {t.role === "user" ? "あなた" : "エージェント"}
                  </div>
                  <div className="whitespace-pre-wrap">{t.text || "（無音）"}</div>
                  {t.audioUrl && (
                    <button
                      onClick={() => {
                        if (audioElRef.current && t.audioUrl) {
                          audioElRef.current.src = t.audioUrl;
                          audioElRef.current.play();
                        }
                      }}
                      className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground/70 hover:text-foreground"
                    >
                      <Volume2 className="w-3 h-3" />
                      もう一度再生
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <audio ref={audioElRef} className="hidden" />

        <div className="flex items-center justify-center gap-3">
          {!recording ? (
            <Button
              onClick={startRecording}
              disabled={thinking || !agentName || !sessionId}
              className="h-14 w-14 rounded-full gradient-bg border-0 hover:opacity-85"
            >
              {thinking ? <Loader2 className="w-6 h-6 animate-spin" /> : <Mic className="w-6 h-6" />}
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              variant="destructive"
              className="h-14 w-14 rounded-full"
            >
              <MicOff className="w-6 h-6" />
            </Button>
          )}

          <Button
            onClick={resetSession}
            variant="ghost"
            className="h-10 text-[11px] gap-1.5 text-muted-foreground/70"
          >
            <RotateCcw className="w-3 h-3" />
            セッションをリセット
          </Button>
        </div>

        <div className="text-center text-[10px] text-muted-foreground/50 space-y-0.5">
          <p>
            STT: Chirp_2 (asia-southeast1, ja-JP) / TTS: Chirp3 HD (ja-JP-Chirp3-HD-Aoede)
          </p>
          <p>session: {sessionId}</p>
          {permission === "denied" && (
            <p className="text-red-400">マイクの権限がブロックされています</p>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

function base64ToObjectUrl(base64: string, mime: string): string {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

export default function TestVoicePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">読み込み中…</div>}>
      <TestVoiceInner />
    </Suspense>
  );
}
