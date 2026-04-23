/**
 * Vapi Web SDK を使ったブラウザ内テスト通話ウィジェット。
 *
 * 目的: クライアントは Vapi Dashboard にアクセスせず、
 * この SaaS 画面から作成した Assistant と直接会話できるようにする。
 *
 * - `@vapi-ai/web` は dynamic import で呼ぶ (SSR 時に `window` を参照するため)。
 * - Public Key (`NEXT_PUBLIC_VAPI_PUBLIC_KEY`) が必要。Private Key は使わない。
 * - volume-level / speech-start / speech-end イベントで可視化する。
 */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff, Phone, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type VapiType from "@vapi-ai/web";

type CallState = "idle" | "connecting" | "active" | "ending";

interface VapiCallWidgetProps {
  assistantId: string;
  assistantName?: string;
  triggerLabel?: string;
  className?: string;
}

export function VapiCallWidget({
  assistantId,
  assistantName,
  triggerLabel = "テスト通話する",
  className,
}: VapiCallWidgetProps) {
  const [open, setOpen] = useState(false);
  const [callState, setCallState] = useState<CallState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vapiRef = useRef<VapiType | null>(null);

  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;

  useEffect(() => {
    if (!open || vapiRef.current) return;
    if (!publicKey) {
      setError("NEXT_PUBLIC_VAPI_PUBLIC_KEY が未設定です。.env.local を確認してください。");
      return;
    }
    let cancelled = false;

    (async () => {
      const { default: VapiCtor } = await import("@vapi-ai/web");
      if (cancelled) return;
      const vapi = new VapiCtor(publicKey);
      vapi.on("call-start", () => setCallState("active"));
      vapi.on("call-end", () => {
        setCallState("idle");
        setVolume(0);
        setAssistantSpeaking(false);
      });
      vapi.on("volume-level", (v) => setVolume(v));
      vapi.on("speech-start", () => setAssistantSpeaking(true));
      vapi.on("speech-end", () => setAssistantSpeaking(false));
      vapi.on("error", (err) => {
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === "string"
              ? err
              : JSON.stringify(err);
        setError(msg);
        setCallState("idle");
      });
      vapiRef.current = vapi;
    })();

    return () => {
      cancelled = true;
    };
  }, [open, publicKey]);

  useEffect(() => {
    if (open) return;
    const vapi = vapiRef.current;
    if (!vapi) return;
    vapi.stop().catch(() => {});
    vapi.removeAllListeners();
    vapiRef.current = null;
    setCallState("idle");
    setVolume(0);
    setAssistantSpeaking(false);
    setIsMuted(false);
    setError(null);
  }, [open]);

  async function startCall() {
    if (!vapiRef.current) return;
    setError(null);
    setCallState("connecting");
    try {
      await vapiRef.current.start(assistantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "通話開始に失敗しました");
      setCallState("idle");
    }
  }

  async function endCall() {
    if (!vapiRef.current) return;
    setCallState("ending");
    try {
      await vapiRef.current.stop();
    } catch {
      // call-end イベントで状態復元
    }
  }

  function toggleMute() {
    if (!vapiRef.current) return;
    const next = !isMuted;
    vapiRef.current.setMuted(next);
    setIsMuted(next);
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className={cn("gap-1.5", className)}
      >
        <Phone className="w-3.5 h-3.5" />
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {assistantName ? `${assistantName} とテスト通話` : "テスト通話"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div
                className={cn(
                  "absolute inset-0 rounded-full transition-all duration-150",
                  callState === "active"
                    ? assistantSpeaking
                      ? "bg-emerald-500/15 ring-2 ring-emerald-500/40"
                      : "bg-blue-500/10 ring-2 ring-blue-500/30"
                    : "bg-muted/30 ring-1 ring-border",
                )}
                style={
                  callState === "active"
                    ? { transform: `scale(${1 + volume * 0.6})` }
                    : undefined
                }
              />
              <div className="relative z-10">
                {callState === "connecting" || callState === "ending" ? (
                  <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                ) : callState === "active" ? (
                  assistantSpeaking ? (
                    <Mic className="w-10 h-10 text-emerald-400" />
                  ) : (
                    <Mic className="w-10 h-10 text-blue-400" />
                  )
                ) : (
                  <Phone className="w-10 h-10 text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">
                {callState === "idle" && "通話ボタンを押して開始してください"}
                {callState === "connecting" && "接続中…"}
                {callState === "active" &&
                  (assistantSpeaking ? "AI が話しています…" : "どうぞお話しください")}
                {callState === "ending" && "切断中…"}
              </p>
              {callState === "idle" && (
                <p className="text-[10px] text-muted-foreground/60">
                  ※ マイクの使用許可を求められたら「許可」してください
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-1.5 text-[11px] text-red-400 bg-red-500/5 border border-red-500/15 rounded-md p-2 w-full">
                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                <p className="break-words">{error}</p>
              </div>
            )}

            <div className="flex items-center gap-3 mt-2">
              {callState === "idle" && (
                <Button
                  onClick={startCall}
                  className="gradient-bg border-0 hover:opacity-85 h-10 gap-1.5"
                >
                  <Phone className="w-4 h-4" />
                  通話を開始
                </Button>
              )}

              {callState === "active" && (
                <>
                  <Button
                    variant={isMuted ? "default" : "outline"}
                    size="icon"
                    onClick={toggleMute}
                    className="h-10 w-10 rounded-full"
                    aria-label={isMuted ? "ミュート解除" : "ミュート"}
                  >
                    {isMuted ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    onClick={endCall}
                    variant="destructive"
                    className="h-10 gap-1.5 rounded-full"
                  >
                    <PhoneOff className="w-4 h-4" />
                    通話を終了
                  </Button>
                </>
              )}

              {(callState === "connecting" || callState === "ending") && (
                <Button disabled className="h-10 gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {callState === "connecting" ? "接続中…" : "切断中…"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
