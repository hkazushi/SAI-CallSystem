"use client";
import { useState, useRef, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/page-transition";
import { mockProjects, mockScenarioDrafts, chappieGreeting } from "@/lib/mock-data";
import { Send, User, Check, Zap, Bot, ArrowLeft, RefreshCw, Sparkles, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Message = { role: "assistant" | "user"; content: string };

interface LogDraft {
  templateId?: string;
  suggestedTasks: Array<{ name: string; trigger: string; steps: string[]; intentTrainingPhrases: string[] }>;
  suggestedHearingFields: Array<{ key: string; label: string; type: string; required: boolean }>;
  suggestedObjections: Array<{ trigger: string; suggestedResponses: string[] }>;
  suggestedPersona: { tone: string; doNots: string[] };
  suggestedTransferConditions: string[];
}

function summarizeLogDraft(d: LogDraft): string {
  const parts: string[] = [
    "📋 既存ログから以下のドラフトを抽出しました。",
    "",
  ];
  if (d.suggestedTasks.length > 0) {
    parts.push(`**検出シナリオ (${d.suggestedTasks.length}件)**`);
    d.suggestedTasks.slice(0, 4).forEach((t) => parts.push(`- ${t.name}: ${t.trigger}`));
    parts.push("");
  }
  if (d.suggestedHearingFields.length > 0) {
    parts.push(`**ヒアリング項目 (${d.suggestedHearingFields.length}件)**`);
    parts.push(d.suggestedHearingFields.map((f) => f.label).join(" / "));
    parts.push("");
  }
  if (d.suggestedObjections.length > 0) {
    parts.push(`**反論候補 (${d.suggestedObjections.length}件)**`);
    d.suggestedObjections.slice(0, 4).forEach((o) => parts.push(`- 「${o.trigger}」`));
    parts.push("");
  }
  if (d.suggestedPersona.tone) {
    parts.push(`**ペルソナ**: ${d.suggestedPersona.tone}`);
    parts.push("");
  }
  parts.push("ここから「足す・引く・細分化」していきましょう。何を変更しますか？");
  return parts.join("\n");
}

export default function ProjectChatPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const project = mockProjects.find((p) => p.id === id) ?? mockProjects[0];
  const draft = mockScenarioDrafts.find((d) => d.project_id === project.id);

  const initialMessages: Message[] = draft
    ? (draft.conversation as Message[])
    : [{ role: "assistant", content: chappieGreeting }];

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [logDraft, setLogDraft] = useState<LogDraft | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ログ取込からのシード読み込み (?seed=logs)
  useEffect(() => {
    if (searchParams.get("seed") !== "logs") return;
    const raw = sessionStorage.getItem(`chappie-draft-${id}`);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as LogDraft;
      setLogDraft(parsed);
      setMessages((prev) => {
        // 既にシード済みの場合はスキップ
        if (prev.some((m) => m.content.includes("既存ログから以下のドラフトを抽出"))) return prev;
        return [{ role: "assistant", content: summarizeLogDraft(parsed) }, ...prev];
      });
    } catch (e) {
      console.warn("[chat] failed to parse log draft", e);
    }
  }, [id, searchParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function handleSend() {
    if (!input.trim() || isTyping) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "承知しました。その情報を反映しますね。他に変更したい点はありますか？\n\n変更が完了したら、プロジェクト詳細に戻って**再コンパイル**してください。",
      }]);
      setIsTyping(false);
    }, 800 + Math.random() * 500);
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
        {/* Sidebar */}
        <div className="w-56 shrink-0 border-r border-white/5 bg-card/30 flex flex-col">
          <div className="p-4 border-b border-white/5">
            <Link href={`/projects/${project.id}`} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors mb-2">
              <ArrowLeft className="w-3 h-3" />プロジェクトに戻る
            </Link>
            <p className="text-[13px] font-semibold truncate">{project.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {project.ai_provider === "vapi"
                ? <><Zap className="w-3 h-3 text-amber-400" /><span className="text-[11px] text-muted-foreground/50">Vapi.ai</span></>
                : <><Bot className="w-3 h-3 text-blue-400" /><span className="text-[11px] text-muted-foreground/50">Dialogflow CX</span></>
              }
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-[10px] text-muted-foreground/40 mb-2 font-medium uppercase tracking-wide">シナリオ状態</p>
            <div className="space-y-1.5">
              {[
                { label: "目的", done: true },
                { label: "商材情報", done: true },
                { label: "冒頭メッセージ", done: true },
                { label: "FAQ", done: !!draft },
                { label: "シナリオ", done: !!draft },
                { label: "音声設定", done: true },
              ].map((item) => (
                <div key={item.label} className={`flex items-center gap-2 px-2 py-1 rounded-md text-[12px] ${
                  item.done ? "text-foreground" : "text-muted-foreground/30"
                }`}>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                    item.done ? "bg-emerald-400/15" : "border border-white/10"
                  }`}>
                    {item.done && <Check className="w-2 h-2 text-emerald-400" />}
                  </div>
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-white/5 space-y-2">
            {logDraft && (
              <div className="rounded-md border border-blue-400/20 bg-blue-400/5 px-2 py-1.5 text-[10px] text-blue-300/90 flex items-center gap-1.5">
                <FileText className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  ログ取込済み ({logDraft.suggestedTasks.length} シナリオ / {logDraft.suggestedHearingFields.length} 項目)
                </span>
              </div>
            )}
            <Link href={`/projects/${project.id}/import-logs`}>
              <Button variant="outline" className="w-full h-8 text-[11px] font-semibold gap-1">
                <FileText className="w-3 h-3" />既存ログ取込
              </Button>
            </Link>
            <Link href={`/projects/${project.id}/builder`}>
              <Button className="w-full gradient-bg border-0 hover:opacity-85 h-8 text-[11px] font-semibold gap-1">
                <RefreshCw className="w-3 h-3" />再コンパイル
              </Button>
            </Link>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
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
                    msg.role === "assistant" ? "bg-primary/15" : "bg-white/8"
                  }`}>
                    {msg.role === "assistant"
                      ? <Sparkles className="w-3.5 h-3.5 text-primary" />
                      : <User className="w-3.5 h-3.5 text-white/50" />
                    }
                  </div>
                  <div className={`rounded-xl px-4 py-3 text-[13px] leading-relaxed max-w-[560px] ${
                    msg.role === "assistant"
                      ? "bg-card/60 border border-white/5"
                      : "bg-primary/10 border border-primary/15"
                  }`}>
                    {msg.content.split("\n").map((line, j) => (
                      <p key={j} className={j > 0 ? "mt-1.5" : ""}>
                        {line.replace(/\*\*/g, "")}
                      </p>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-card/60 border border-white/5 rounded-xl px-4 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce [animation-delay:300ms]" />
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-white/5 px-6 py-4 bg-card/20">
            <div className="max-w-[720px] mx-auto flex items-end gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="チャッピーにメッセージを送信..."
                rows={1}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/8 text-[13px] resize-none focus:outline-none focus:border-primary/30 placeholder:text-muted-foreground/30 min-h-[44px] max-h-[120px]"
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 120) + "px";
                }}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
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
