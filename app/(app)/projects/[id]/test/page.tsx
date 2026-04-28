"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/page-transition";
import { Send, Bot, User, RotateCcw, AlertCircle, Loader2 } from "lucide-react";
import { safeUuid } from "@/lib/safe-uuid";

type Turn = { id: string; role: "user" | "agent"; text: string };

function TestTextInner() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "new";
  const search = useSearchParams();
  const agentNameFromQuery = search.get("agentName") ?? "";

  const [agentName, setAgentName] = useState<string>(agentNameFromQuery);
  const [projectName, setProjectName] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageInfo, setPageInfo] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setSessionId(safeUuid()); }, []);

  useEffect(() => {
    if (agentNameFromQuery) { setAgentName(agentNameFromQuery); return; }
    if (!/^[0-9a-f-]{36}$/i.test(projectId)) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`/api/projects-store/${projectId}`);
        const data = (await resp.json()) as { project?: { dfcx_agent_name?: string | null; name?: string } };
        if (cancelled) return;
        if (data.project?.dfcx_agent_name) setAgentName(data.project.dfcx_agent_name);
        if (data.project?.name) setProjectName(data.project.name);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [projectId, agentNameFromQuery]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns]);

  async function send(text: string) {
    if (!agentName || !sessionId) {
      setError("agentName/sessionId が未設定です");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/projects/${projectId}/dfcx-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName, sessionId, text }),
      });
      const data = (await resp.json()) as {
        ok?: boolean;
        responseText?: string;
        currentPage?: string | null;
        error?: string;
      };
      if (!resp.ok || !data.ok) throw new Error(data.error ?? `failed (${resp.status})`);
      const userTurn: Turn = { id: safeUuid(), role: "user", text };
      const agentTurn: Turn = { id: safeUuid(), role: "agent", text: data.responseText ?? "(応答なし)" };
      setTurns((prev) => [...prev, ...(text ? [userTurn] : []), agentTurn]);
      setPageInfo(data.currentPage ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "通信エラー");
    } finally {
      setLoading(false);
    }
  }

  function startGreet() {
    setTurns([]);
    setSessionId(safeUuid());
    setTimeout(() => send(""), 50);
  }

  function reset() {
    setTurns([]);
    setSessionId(safeUuid());
    setError(null);
    setPageInfo(null);
  }

  function handleSend() {
    const t = input.trim();
    if (!t || loading) return;
    setInput("");
    send(t);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-2xl px-4 py-8 space-y-4">
        <header className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">
            テキストテスト（Dialogflow CX）
            {projectName && <span className="text-muted-foreground/60 text-base ml-2">— {projectName}</span>}
          </h1>
          <p className="text-[12px] text-muted-foreground/70">
            STT/TTS をバイパスしてフロー遷移を高速検証できます。<br />
            <span className="font-mono break-all">{agentName || "agentName 取得中…"}</span>
          </p>
        </header>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-[12px] text-red-200">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-lg border border-white/10 bg-white/5 p-4 min-h-[300px] space-y-3">
          {turns.length === 0 ? (
            <p className="text-[12px] text-muted-foreground/50 text-center py-12">
              下の「会話開始」を押すと agent から第一声を取得します
            </p>
          ) : (
            turns.map((t) => (
              <div key={t.id} className={`flex gap-2 ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                {t.role === "agent" && (
                  <div className="w-6 h-6 rounded-md bg-blue-500/15 flex items-center justify-center shrink-0">
                    <Bot className="w-3 h-3 text-blue-400" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-lg px-3 py-2 text-[12px] ${
                  t.role === "user" ? "bg-primary/20 border border-primary/30" : "bg-white/10 border border-white/15"
                }`}>
                  <div className="whitespace-pre-wrap">{t.text}</div>
                </div>
                {t.role === "user" && (
                  <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                    <User className="w-3 h-3 text-white/60" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
              <Loader2 className="w-3 h-3 animate-spin" /> 応答中…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading || !agentName}
            placeholder="メッセージを入力..."
            rows={1}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[12px] resize-none focus:outline-none focus:border-primary/30 placeholder:text-muted-foreground/30 disabled:opacity-50 min-h-[40px] max-h-[120px]"
          />
          <Button onClick={handleSend} disabled={!input.trim() || loading || !agentName} className="gradient-bg border-0 hover:opacity-85 h-[40px]">
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button onClick={startGreet} disabled={loading || !agentName} variant="outline" size="sm" className="text-[11px] h-7">
            会話開始（agent から第一声）
          </Button>
          <Button onClick={reset} variant="ghost" size="sm" className="text-[11px] h-7 text-muted-foreground/70 gap-1">
            <RotateCcw className="w-3 h-3" /> セッションをリセット
          </Button>
        </div>

        <div className="text-center text-[10px] text-muted-foreground/50 space-y-0.5">
          <p>session: {sessionId}</p>
          {pageInfo && <p>現在ページ: {pageInfo}</p>}
        </div>
      </div>
    </PageTransition>
  );
}

export default function TestTextPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">読み込み中…</div>}>
      <TestTextInner />
    </Suspense>
  );
}
