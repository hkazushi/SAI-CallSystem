"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/page-transition";
import { mockTemplates, chappieGreeting } from "@/lib/mock-data";
import { Send, Bot, User, Check, Zap, ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Message = { role: "assistant" | "user"; content: string };

// チャッピーのモック応答
const chappieResponses: Record<string, string> = {
  default: `なるほど、ありがとうございます！

では次に、**商材の詳細**を教えてください。

1. **商品・サービス名**は何ですか？
2. **価格帯**はどのくらいですか？
3. **主な特長**を3つほど教えてください。`,
  product: `いい商材ですね！

次に、**冒頭の挨拶メッセージ**を決めましょう。AIエージェントが電話の最初に話す言葉です。

例えば：
> 「こんにちは、○○株式会社の△△と申します。□□のご案内でお電話しました。」

どのような挨拶にしますか？自然な形で教えていただければ、チャッピーが整えます。`,
  greeting: `いい挨拶ですね！自然で好印象です。

次に、**お客様からよく聞かれそうな質問**とその回答を教えてください。

例えば：
- 「料金はいくら？」→「月額○○円からご利用いただけます」
- 「解約金はある？」→「最低利用期間内は○○円です」

思いつく限りで大丈夫です。後からいつでも追加できます。`,
  faq: `ありがとうございます！FAQが充実していると、AIの対応品質がぐっと上がります。

最後に、**NGワードや禁止事項**はありますか？

例えば：
- 競合他社の名前を出さない
- 「絶対」「必ず」などの断定表現を避ける
- 個人情報を聞き出さない

何かあれば教えてください。なければ「特になし」でOKです。`,
  done: `お疲れ様でした！すべての情報が集まりました 🎉

収集した情報でAIコールエージェントを構築する準備ができました。

**「確認画面へ進む」**ボタンを押して、内容を確認してください。
問題なければ、選択したAIエンジン向けにコンパイルして実行可能にします。`,
};

const responseKeys = Object.keys(chappieResponses);

// 収集済み項目のモック
function getCollectedItems(msgCount: number) {
  const items = [
    { key: "purpose", label: "目的", done: msgCount >= 2 },
    { key: "product", label: "商材情報", done: msgCount >= 4 },
    { key: "first_message", label: "冒頭メッセージ", done: msgCount >= 6 },
    { key: "faq", label: "FAQ", done: msgCount >= 8 },
    { key: "ng_words", label: "NGワード", done: msgCount >= 10 },
    { key: "voice", label: "音声設定", done: false },
    { key: "goals", label: "達成ゴール", done: msgCount >= 2 },
    { key: "transfer", label: "転送条件", done: false },
  ];
  return items;
}

export default function ChappieChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground/40 text-sm">読み込み中...</div>}>
      <ChappieChatInner />
    </Suspense>
  );
}

function ChappieChatInner() {
  const searchParams = useSearchParams();
  const engine = searchParams.get("engine") ?? "vapi";
  const templateSlug = searchParams.get("template");
  const template = templateSlug ? mockTemplates.find((t) => t.slug === templateSlug) : null;

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: chappieGreeting },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function handleSend() {
    if (!input.trim() || isTyping) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsTyping(true);

    // モック: 0.8〜1.5秒後に応答
    setTimeout(() => {
      const userMsgCount = messages.filter((m) => m.role === "user").length + 1;
      const key = responseKeys[Math.min(userMsgCount, responseKeys.length - 1)];
      setMessages((prev) => [...prev, { role: "assistant", content: chappieResponses[key] }]);
      setIsTyping(false);
      if (key === "done") setIsComplete(true);
    }, 800 + Math.random() * 700);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const rawCollected = getCollectedItems(messages.filter((m) => m.role === "user").length);
  // 完了時は全項目をdone扱いにして進捗を100%にする
  const collected = isComplete ? rawCollected.map((item) => ({ ...item, done: true })) : rawCollected;
  const doneCount = collected.filter((i) => i.done).length;
  const progress = Math.round((doneCount / collected.length) * 100);

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
            {/* Engine */}
            <div>
              <p className="text-[10px] text-muted-foreground/40 mb-1">AIエンジン</p>
              <div className="flex items-center gap-1.5">
                {engine === "vapi"
                  ? <><Zap className="w-3 h-3 text-amber-400" /><span className="text-[12px] font-medium">Vapi.ai（柔軟型）</span></>
                  : <><Bot className="w-3 h-3 text-blue-400" /><span className="text-[12px] font-medium">Dialogflow CX（厳格型）</span></>
                }
              </div>
            </div>

            {/* Template */}
            {template && (
              <div>
                <p className="text-[10px] text-muted-foreground/40 mb-1">テンプレート</p>
                <p className="text-[12px] font-medium">{template.name}</p>
              </div>
            )}

            {/* Progress */}
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
            </div>
          </div>

          {/* Collected items */}
          <div className="flex-1 overflow-y-auto p-4 pt-2">
            <p className="text-[10px] text-muted-foreground/40 mb-2 font-medium uppercase tracking-wide">収集済み項目</p>
            <div className="space-y-1">
              {collected.map((item) => (
                <div key={item.key} className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] ${
                  item.done ? "text-foreground" : "text-muted-foreground/30"
                }`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    item.done ? "bg-emerald-400/15" : "border border-white/10"
                  }`}>
                    {item.done && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                  </div>
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          {(isComplete || progress >= 50) && (
            <div className="p-4 border-t border-white/5 space-y-2">
              {isComplete && (
                <p className="text-[10px] text-emerald-400/80 flex items-center gap-1 leading-tight">
                  <Check className="w-3 h-3" />収集完了。確認画面で内容をレビューできます
                </p>
              )}
              <Link href="/projects/proj-001">
                <Button className="w-full gradient-bg border-0 hover:opacity-85 h-9 text-[12px] font-semibold gap-1.5">
                  確認画面へ進む <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat messages */}
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
                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === "assistant" ? "bg-primary/15" : "bg-white/8"
                  }`}>
                    {msg.role === "assistant"
                      ? <Sparkles className="w-3.5 h-3.5 text-primary" />
                      : <User className="w-3.5 h-3.5 text-white/50" />
                    }
                  </div>

                  {/* Bubble */}
                  <div className={`rounded-xl px-4 py-3 text-[13px] leading-relaxed max-w-[560px] ${
                    msg.role === "assistant"
                      ? "bg-card/60 border border-white/5"
                      : "bg-primary/10 border border-primary/15"
                  }`}>
                    {msg.content.split("\n").map((line, j) => (
                      <p key={j} className={`${j > 0 ? "mt-1.5" : ""} ${
                        line.startsWith("**") ? "font-semibold" : ""
                      } ${line.startsWith(">") ? "border-l-2 border-primary/30 pl-2 text-muted-foreground/60 italic" : ""}`}>
                        {line.replace(/\*\*/g, "").replace(/^> /, "")}
                      </p>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Inline CTA after done message */}
            {isComplete && !isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="flex gap-3 max-w-[720px]"
              >
                <div className="w-7 shrink-0" />
                <Link href="/projects/proj-001">
                  <Button className="gradient-bg border-0 hover:opacity-85 h-10 px-5 text-[13px] font-semibold gap-2">
                    確認画面へ進む <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </motion.div>
            )}

            {/* Typing indicator */}
            {isTyping && (
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

          {/* Input area */}
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
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/8 text-[13px] resize-none focus:outline-none focus:border-primary/30 placeholder:text-muted-foreground/30 min-h-[44px] max-h-[120px]"
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
                disabled={!input.trim() || isTyping}
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
