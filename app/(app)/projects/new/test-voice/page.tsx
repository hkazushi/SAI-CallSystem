"use client";
import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/page-transition";
import { Phone, PhoneOff, Loader2, Volume2, AlertCircle, RotateCcw, Mic } from "lucide-react";
import { safeUuid, isSecureContextAvailable } from "@/lib/safe-uuid";

type Turn = {
  id: string;
  role: "user" | "agent";
  text: string;
  audioUrl?: string;
};

const SILENCE_THRESHOLD = 0.005;
const SILENCE_DURATION_MS = 900;
const MIN_SPEECH_DURATION_MS = 400;
const MAX_RECORDING_MS = 15000;
const POST_PLAY_DELAY_MS = 300;

function TestVoiceInner() {
  const search = useSearchParams();
  const agentName = search.get("agentName") ?? "";
  const [projectId, setProjectId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [callActive, setCallActive] = useState(false);
  const [status, setStatus] = useState<"idle" | "greeting" | "listening" | "thinking" | "speaking">("idle");
  const [vadLevel, setVadLevel] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<"prompt" | "granted" | "denied">("prompt");

  const callActiveRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // マイクの有効/無効切替（agent発話中はマイクを完全に切ってエコー回り込み防止）
  const setMicEnabled = (enabled: boolean) => {
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = enabled; });
  };

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const recordingStartRef = useRef<number>(0);
  const speechDetectedRef = useRef<boolean>(false);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const sessionIdRef = useRef<string>("");
  const projectIdRef = useRef<string>("");

  useEffect(() => {
    setProjectId(`new-${Date.now()}`);
    setSessionId(safeUuid());
  }, []);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { projectIdRef.current = projectId; }, [projectId]);
  useEffect(() => { callActiveRef.current = callActive; }, [callActive]);

  const stopAll = useCallback(() => {
    callActiveRef.current = false;
    setCallActive(false);
    setStatus("idle");
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch { /* noop */ }
    }
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = "";
    }
  }, []);

  useEffect(() => {
    return () => stopAll();
  }, [stopAll]);

  const callOrchestrator = useCallback(
    async (blob: Blob | null): Promise<{ text: string; audioUrl?: string; transcript: string } | null> => {
      if (!agentName) {
        setError("agentName が URL に指定されていません");
        return null;
      }
      try {
        let resp: Response;
        if (blob === null) {
          resp = await fetch(`/api/projects/${projectIdRef.current}/voice-orchestrator`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agentName, sessionId: sessionIdRef.current, languageCode: "ja-JP" }),
          });
        } else {
          const fd = new FormData();
          fd.append("audio", blob, "speech.webm");
          fd.append("agentName", agentName);
          fd.append("sessionId", sessionIdRef.current);
          resp = await fetch(`/api/projects/${projectIdRef.current}/voice-orchestrator`, {
            method: "POST",
            body: fd,
          });
        }
        const data = (await resp.json()) as {
          ok?: boolean;
          transcript?: string;
          responseText?: string;
          audioBase64?: string | null;
          warning?: string;
          error?: string;
        };
        if (!resp.ok || !data.ok) throw new Error(data.error ?? `failed (${resp.status})`);
        if (data.warning === "no_speech_detected") return { text: "", transcript: "", audioUrl: undefined };
        return {
          text: data.responseText ?? "",
          transcript: data.transcript ?? "",
          audioUrl: data.audioBase64 ? base64ToObjectUrl(data.audioBase64, "audio/mpeg") : undefined,
        };
      } catch (e) {
        setError(e instanceof Error ? e.message : "通信エラー");
        return null;
      }
    },
    [agentName],
  );

  const playAudio = useCallback((url: string): Promise<void> => {
    return new Promise((resolve) => {
      const el = audioElRef.current;
      if (!el) { resolve(); return; }
      el.src = url;
      el.onended = () => resolve();
      el.onerror = () => resolve();
      el.play().catch(() => resolve());
    });
  }, []);

  const manualSendRef = useRef<(() => void) | null>(null);

  const recordAndRespond = useCallback(async () => {
    if (!callActiveRef.current) return;
    if (!streamRef.current || !analyserRef.current) return;

    setStatus("listening");
    speechDetectedRef.current = false;
    recordingStartRef.current = Date.now();

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;
    const chunks: Blob[] = [];
    recorder.ondataavailable = (ev) => { if (ev.data.size > 0) chunks.push(ev.data); };

    const stopAndSend = async () => {
      if (recorder.state !== "inactive") {
        try { recorder.stop(); } catch { /* noop */ }
      }
      await new Promise((r) => setTimeout(r, 100));
      const elapsed = Date.now() - recordingStartRef.current;
      const blob = new Blob(chunks, { type: mimeType });
      console.log("[stopAndSend]", { elapsed, blobSize: blob.size, speechDetected: speechDetectedRef.current });
      if (!speechDetectedRef.current || elapsed < MIN_SPEECH_DURATION_MS || blob.size < 1000) {
        if (callActiveRef.current) recordAndRespond();
        return;
      }
      // 思考・発話中はマイクOFF（agent音声の回り込み防止）
      setMicEnabled(false);
      setStatus("thinking");
      const result = await callOrchestrator(blob);
      if (!result || !callActiveRef.current) return;
      const userTurn: Turn = { id: safeUuid(), role: "user", text: result.transcript };
      const agentTurn: Turn = { id: safeUuid(), role: "agent", text: result.text, audioUrl: result.audioUrl };
      setTurns((prev) => [...prev, userTurn, agentTurn]);
      if (result.audioUrl) {
        setStatus("speaking");
        await playAudio(result.audioUrl);
        await new Promise((r) => setTimeout(r, POST_PLAY_DELAY_MS));
      }
      setMicEnabled(true);
      if (callActiveRef.current) recordAndRespond();
    };

    manualSendRef.current = () => {
      speechDetectedRef.current = true;
      stopAndSend();
    };

    recorder.start();

    const buf = new Float32Array(analyserRef.current.fftSize);
    const tick = () => {
      if (!callActiveRef.current || mediaRecorderRef.current !== recorder) return;
      const elapsed = Date.now() - recordingStartRef.current;
      if (elapsed > MAX_RECORDING_MS) {
        stopAndSend();
        return;
      }
      analyserRef.current!.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      setVadLevel(Math.min(1, rms / 0.05));
      if (Math.random() < 0.01) console.log("[VAD]", { rms: rms.toFixed(4), threshold: SILENCE_THRESHOLD, speechDetected: speechDetectedRef.current });
      if (rms > SILENCE_THRESHOLD) {
        speechDetectedRef.current = true;
        if (silenceTimerRef.current) {
          window.clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (speechDetectedRef.current && silenceTimerRef.current === null) {
        silenceTimerRef.current = window.setTimeout(() => {
          silenceTimerRef.current = null;
          stopAndSend();
        }, SILENCE_DURATION_MS);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [callOrchestrator, playAudio]);

  const startCall = useCallback(async () => {
    setError(null);
    setTurns([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      setPermission("granted");
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      callActiveRef.current = true;
      setCallActive(true);

      // agent発話前はマイクOFF（自分の声でgreetを邪魔されないため）
      setMicEnabled(false);
      setStatus("greeting");
      const greet = await callOrchestrator(null);
      if (!greet || !callActiveRef.current) return;
      const greetTurn: Turn = { id: safeUuid(), role: "agent", text: greet.text, audioUrl: greet.audioUrl };
      setTurns([greetTurn]);
      if (greet.audioUrl) {
        setStatus("speaking");
        await playAudio(greet.audioUrl);
        await new Promise((r) => setTimeout(r, POST_PLAY_DELAY_MS));
      }
      // agent発話完了後、マイクをONに
      setMicEnabled(true);
      if (callActiveRef.current) recordAndRespond();
    } catch (e) {
      setPermission("denied");
      setError(e instanceof Error ? e.message : "マイクの使用が許可されませんでした");
      stopAll();
    }
  }, [callOrchestrator, playAudio, recordAndRespond, stopAll]);

  const resetSession = useCallback(() => {
    stopAll();
    setTurns([]);
    setSessionId(safeUuid());
    setError(null);
  }, [stopAll]);

  const statusLabel: Record<typeof status, string> = {
    idle: "待機中",
    greeting: "エージェントが応答中…",
    listening: "🎤 聞き取り中…（話してください）",
    thinking: "考え中…",
    speaking: "🔊 エージェント発話中…",
  };

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-2xl px-4 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">音声テスト（Dialogflow CX）</h1>
          <p className="text-[12px] text-muted-foreground/70">
            「通話開始」を押すと、エージェントから話しかけて連続会話できます。<br />
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
              下の「通話開始」ボタンを押すと会話が始まります
            </p>
          ) : (
            turns.map((t) => (
              <div key={t.id} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-[12px] ${
                  t.role === "user" ? "bg-primary/20 border border-primary/30" : "bg-white/10 border border-white/15"
                }`}>
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

        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-3">
            {!callActive ? (
              <Button
                onClick={startCall}
                disabled={!agentName || !sessionId}
                className="h-14 px-6 rounded-full gradient-bg border-0 hover:opacity-85 gap-2"
              >
                <Phone className="w-5 h-5" />
                通話開始
              </Button>
            ) : (
              <Button
                onClick={stopAll}
                variant="destructive"
                className="h-14 px-6 rounded-full gap-2"
              >
                <PhoneOff className="w-5 h-5" />
                通話終了
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
          {callActive && (
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-[11px] text-muted-foreground/70 inline-flex items-center gap-1.5">
                {status === "thinking" || status === "greeting" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mic className="w-3 h-3" />}
                {statusLabel[status]}
              </p>
              {status === "listening" && (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-[width] duration-75"
                        style={{ width: `${Math.round(vadLevel * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 font-mono">{(vadLevel * 100).toFixed(0)}%</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => manualSendRef.current?.()}
                    className="h-7 text-[11px]"
                  >
                    手動で送信
                  </Button>
                </div>
              )}
            </div>
          )}
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
