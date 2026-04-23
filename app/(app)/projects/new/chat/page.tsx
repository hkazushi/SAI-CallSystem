"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/page-transition";
import { mockTemplates, chappieGreeting } from "@/lib/mock-data";
import type { WallDiscussionStage } from "@/lib/chappie/types";
import { STAGE_ORDER } from "@/lib/chappie/types";
import type { ChappieMessageMetadata } from "@/app/api/chappie/chat/route";
import { Send, Bot, User, Check, Zap, ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ChappieUIMessage = UIMessage<ChappieMessageMetadata>;

const STAGE_TO_COLLECTED: Record<WallDiscussionStage, string[]> = {
  discovery: ["purpose", "goals"],
  identity: ["product"],
  task_flow: ["first_message", "faq"],
  hearing_rules: ["ng_words"],
  style_guardrails: ["voice", "transfer"],
  review: ["purpose", "goals", "product", "first_message", "faq", "ng_words", "voice", "transfer"],
};

const COLLECTED_ITEMS: { key: string; label: string }[] = [
  { key: "purpose", label: "目的" },
  { key: "product", label: "商材情報" },
  { key: "first_message", label: "冒頭メッセージ" },
  { key: "faq", label: "FAQ" },
  { key: "ng_words", label: "NGワード" },
  { key: "voice", label: "音声設定" },
  { key: "goals", label: "達成ゴール" },
  { key: "transfer", label: "転送条件" },
];

function renderText(text: string) {
  return text.split("\n").map((line, j) => {
    const isHeading = line.startsWith("**");
    const isQuote = line.startsWith("> ");
    return (
      <p
        key={j}
        className={`${j > 0 ? "mt-1.5" : ""} ${isHeading ? "font-semibold" : ""} ${
          isQuote ? "border-l-2 border-primary/30 pl-2 text-muted-foreground/60 italic" : ""
        }`}
      >
        {line.replace(/\*\*/g, "").replace(/^> /, "")}
      </p>
    );
  });
}

const initialMessages: ChappieUIMessage[] = [
  {
    id: "chappie-greeting",
    role: "assistant",
    parts: [{ type: "text", text: chappieGreeting }],
    metadata: { stage: "discovery" },
  },
];

export default function ChappieChatPage() {
  const searchParams = useSearchParams();
  const engine = searchParams.get("engine") ?? "vapi";
  const templateSlug = searchParams.get("template");
  const template = templateSlug ? mockTemplates.find((t) => t.slug === templateSlug) : null;

  const { messages, sendMessage, status } = useChat<ChappieUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/chappie/chat" }),
    messages: initialMessages,
  });

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const currentStage = useMemo<WallDiscussionStage>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant" && msg.metadata?.stage) {
        return msg.metadata.stage;
      }
    }
    return "discovery";
  }, [messages]);

  const completedKeys = useMemo(() => {
    const stageIndex = STAGE_ORDER.indexOf(currentStage);
    const reached: string[] = [];
    for (let i = 0; i <= stageIndex; i++) {
      reached.push(...STAGE_TO_COLLECTED[STAGE_ORDER[i]]);
    }
    return new Set(reached);
  }, [currentStage]);

  const collected = COLLECTED_ITEMS.map((item) => ({
    ...item,
    done: completedKeys.has(item.key),
  }));
  const doneCount = collected.filter((i) => i.done).length;
  const progress = Math.round((doneCount / collected.length) * 100);
  const reachedReview = currentStage === "review";

  function handleSend() {
    const text = input.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <PageTransition>
      <div className="flex h-[calc(100vh-1px)] overflow-hidden">
        {/* Left sidebar — project info */}
        <div className="w-64 shrink-0 border-r border-white/5 bg-card/30 flex flex-col">
          <div className="p-4 border-b border-white/5">
            <p className="text-[10px] tracking-[0.13em] uppercase text-muted-foreground/40 font-medium">新規プロジェクト</p>
            <p className="text-[13px] font-semibold mt-1">チャッピー壁打ち</p>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <p className="text-[10px] text-muted-foreground/40 mb-1">AIエンジン</p>
              <div className="flex items-center gap-1.5">
                {engine === "vapi" ? (
                  <>
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span className="text-[12px] font-medium">Vapi.ai（柔軟型）</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3 h-3 text-blue-400" />
                    <span className="text-[12px] font-medium">Dialogflow CX（厳格型）</span>
                  </>
                )}
              </div>
            </div>

            {template && (
              <div>
                <p className="text-[10px] text-muted-foreground/40 mb-1">テンプレート</p>
                <p className="text-[12px] font-medium">{template.name}</p>
              </div>
            )}

            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] text-muted-foreground/40">収集進捗</p>
                <span className="text-[11px] font-bold num text-primary">{progress}%</span>
              </div>
              <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground/40 mt-2">
                ステージ: <span className="text-foreground/80">{currentStage}</span>
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 pt-2">
            <p className="text-[10px] text-muted-foreground/40 mb-2 font-medium uppercase tracking-wide">収集済み項目</p>
            <div className="space-y-1">
              {collected.map((item) => (
                <div
                  key={item.key}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] ${
                    item.done ? "text-foreground" : "text-muted-foreground/30"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      item.done ? "bg-emerald-400/15" : "border border-white/10"
                    }`}
                  >
                    {item.done && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                  </div>
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          {(progress >= 50 || reachedReview) && (
            <div className="p-4 border-t border-white/5">
              <Link href="/projects/proj-001">
                <Button className="w-full gradient-bg border-0 hover:opacity-85 h-9 text-[12px] font-semibold gap-1.5">
                  {reachedReview ? "確認画面へ進む" : "一時保存して進む"} <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const text = msg.parts
                  .filter((p): p is { type: "text"; text: string } => p.type === "text")
                  .map((p) => p.text)
                  .join("");
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex gap-3 max-w-[720px] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        msg.role === "assistant" ? "bg-primary/15" : "bg-white/8"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-white/50" />
                      )}
                    </div>
                    <div
                      className={`rounded-xl px-4 py-3 text-[13px] leading-relaxed max-w-[560px] ${
                        msg.role === "assistant"
                          ? "bg-card/60 border border-white/5"
                          : "bg-primary/10 border border-primary/15"
                      }`}
                    >
                      {renderText(text)}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {isBusy && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 max-w-[720px]"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-card/60 border border-white/5 rounded-xl px-4 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce [animation-delay:300ms]" />
                </div>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="border-t border-white/5 px-6 py-4 bg-card/20">
            <div className="max-w-[720px] mx-auto flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="チャッピーにメッセージを送信..."
                  rows={1}
                  disabled={isBusy}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/8 text-[13px] resize-none focus:outline-none focus:border-primary/30 placeholder:text-muted-foreground/30 min-h-[44px] max-h-[120px] disabled:opacity-50"
                  style={{ height: "auto" }}
                  onInput={(e) => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = "auto";
                    t.style.height = Math.min(t.scrollHeight, 120) + "px";
                  }}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isBusy}
                className="gradient-bg border-0 hover:opacity-85 h-[44px] w-[44px] p-0 shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-center text-[10px] text-muted-foreground/25 mt-2">Shift + Enter で改行 / Enter で送信</p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
