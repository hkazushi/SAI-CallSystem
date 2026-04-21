"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/page-transition";
import { mockProjects } from "@/lib/mock-data";
import {
  ArrowLeft, Send, Bot, User, Loader2, ExternalLink, AlertCircle,
  RefreshCw, Sparkles, Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  role: "user" | "assistant";
  text: string;
  meta?: { intent?: string | null; page?: string | null; confidence?: number | null };
};

function makeSessionId() {
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function TestChatPage() {
  const { id } = useParams();
  const project = mockProjects.find((p) => p.id === id) ?? mockProjects[0];
  const storageKey = `dfcx-agent-${project.id}`;

  const [agentInfo, setAgentInfo] = useState<{ agentId: string; consoleUrl: string } | null>(null);
  const [sessionId, setSessionId] = useState<string>(makeSessionId());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try { setAgentInfo(JSON.parse(stored)); } catch {}
    }
  }, [storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function sendText(text: string) {
    if (!agentInfo) return;
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/dfcx/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agentInfo.agentId,
          sessionId,
          text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "chat failed");
      const reply: Message = {
        role: "assistant",
        text: (data.replies && data.replies.length > 0) ? data.replies.join("\n") : "（応答なし）",
        meta: {
          intent: data.matchedIntent,
          page: data.currentPage,
          confidence: data.confidence,
        },
      };
      setMessages((prev) => [...prev, reply]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  async function handleStart() {
    setMessages([]);
    setStarted(true);
    // DFCXは空入力でWelcome Intentがトリガーされる
    await sendText("");
  }

  async function handleSend() {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    await sendText(text);
  }

  function handleReset() {
    setSessionId(makeSessionId());
    setMessages([]);
    setStarted(false);
    setError(null);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!agentInfo) {
    return (
      <PageTransition>
        <div className="p-6 max-w-2xl space-y-5">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground/50">
            <Link href={`/projects/${project.id}`} className="flex items-center gap-1 hover:text-muted-foreground/80">
              <ArrowLeft className="w-3 h-3" />{project.name}
            </Link>
          </div>
          <div className="rounded-xl bg-amber-400/5 border border-amber-400/20 p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-300 text-[13px]">デプロイ未完了</p>
              <p className="text-amber-400/70 text-[12px] mt-1 leading-relaxed">
                このプロジェクトはまだDialogflow CXに反映されていません。
                Agent設定ページで「DFCXにデプロイ」ボタンを押してください。
              </p>
              <Link href={`/projects/${project.id}/dfcx`}>
                <Button className="mt-3 gradient-bg border-0 hover:opacity-85 h-8 text-[12px]">
                  Agent設定ページへ
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex h-[calc(100vh-1px)] overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r border-white/5 bg-card/30 flex flex-col">
          <div className="p-4 border-b border-white/5">
            <Link href={`/projects/${project.id}/dfcx`} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40 hover:text-muted-foreground/70 mb-2">
              <ArrowLeft className="w-3 h-3" />Agent設定に戻る
            </Link>
            <p className="text-[13px] font-semibold truncate">{project.name}</p>
            <p className="text-[10px] text-muted-foreground/40 mt-1">テスト会話</p>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <p className="text-[10px] text-muted-foreground/40 mb-1">Agent ID</p>
              <p className="text-[11px] font-mono truncate">{agentInfo.agentId}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/40 mb-1">Session ID</p>
              <p className="text-[10px] font-mono truncate text-muted-foreground/60">{sessionId}</p>
            </div>
            <a href={agentInfo.consoleUrl} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-400/80 hover:text-emerald-300 flex items-center gap-1">
              DFCXコンソール <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-4 border-t border-white/5 mt-auto space-y-2">
            <Button onClick={handleReset} variant="outline" className="w-full h-8 text-[11px] border-white/10 gap-1">
              <RefreshCw className="w-3 h-3" />セッションをリセット
            </Button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {!started && (
              <div className="max-w-[560px] mx-auto text-center py-16 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6 text-emerald-400" />
                </div>
                <h2 className="text-[18px] font-semibold">DFCXエージェントのテスト会話</h2>
                <p className="text-[13px] text-muted-foreground/60 leading-relaxed">
                  デプロイされたDialogflow CXエージェントと実際に会話します。<br />
                  「開始」を押すとエージェントがオープニングメッセージを発します。
                </p>
                <Button onClick={handleStart} className="gradient-bg border-0 hover:opacity-85 h-10 px-6 text-[13px] font-semibold">
                  会話を開始
                </Button>
                <div className="text-[11px] text-muted-foreground/40 pt-3 border-t border-white/5 mt-6 max-w-md mx-auto">
                  <Info className="w-3 h-3 inline mr-1" />
                  応答内容はIntent/Page単位でDFCXから返ってきます。適切に分岐しない場合は、
                  <Link href={`/projects/${project.id}/dfcx`} className="text-primary hover:underline">設定を見直して再デプロイ</Link>してください。
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex gap-3 max-w-[720px] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === "assistant" ? "bg-emerald-400/15" : "bg-white/8"
                  }`}>
                    {msg.role === "assistant"
                      ? <Bot className="w-3.5 h-3.5 text-emerald-400" />
                      : <User className="w-3.5 h-3.5 text-white/50" />}
                  </div>
                  <div className="flex flex-col gap-1.5 max-w-[560px]">
                    <div className={`rounded-xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap ${
                      msg.role === "assistant"
                        ? "bg-card/60 border border-white/5"
                        : "bg-primary/10 border border-primary/15"
                    }`}>
                      {msg.text}
                    </div>
                    {msg.meta && msg.role === "assistant" && (msg.meta.intent || msg.meta.page) && (
                      <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono text-muted-foreground/50 px-1">
                        {msg.meta.page && <span>Page: <span className="text-primary/80">{msg.meta.page}</span></span>}
                        {msg.meta.intent && <span>· Intent: <span className="text-emerald-300/80">{msg.meta.intent}</span></span>}
                        {typeof msg.meta.confidence === "number" && <span>· {Math.round(msg.meta.confidence * 100)}%</span>}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {sending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-400/15 flex items-center justify-center">
                  <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                </div>
                <div className="bg-card/60 border border-white/5 rounded-xl px-4 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce [animation-delay:300ms]" />
                </div>
              </motion.div>
            )}

            {error && (
              <div className="max-w-[720px] rounded-xl bg-red-400/5 border border-red-400/20 p-3 flex items-start gap-2 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <div className="text-red-300/80 font-mono break-all">{error}</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-white/5 px-6 py-4 bg-card/20">
            <div className="max-w-[720px] mx-auto flex items-end gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                disabled={!started || sending}
                placeholder={started ? "メッセージを入力..." : "まず「会話を開始」を押してください"}
                rows={1}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/8 text-[13px] resize-none focus:outline-none focus:border-primary/30 placeholder:text-muted-foreground/30 min-h-[44px] max-h-[120px] disabled:opacity-50"
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 120) + "px";
                }}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sending || !started}
                className="gradient-bg border-0 hover:opacity-85 h-[44px] w-[44px] p-0 shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
