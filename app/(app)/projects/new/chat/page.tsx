"use client";
import { useState, useRef, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/page-transition";
import { getTemplate } from "@/lib/templates";
import type { WallDiscussionStage } from "@/lib/chappie/types";
import { STAGE_ORDER } from "@/lib/chappie/types";
import { parseChoices } from "@/lib/chappie/quick-replies";
import type { ChappieMessageMetadata } from "@/app/api/chappie/chat/route";
import type { ChappieOutput } from "@/lib/vapi-compiler/types";
import type { ChappieEngine } from "@/lib/chappie/meta-prompt";
import { FileUploadZone, type AttachedFile } from "@/components/chappie/FileUploadZone";
import { VapiCallWidget } from "@/components/vapi-call-widget";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Send,
  Bot,
  User,
  Check,
  Zap,
  Sparkles,
  Loader2,
  ExternalLink,
  AlertCircle,
  FileText,
  Trash2,
} from "lucide-react";
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

function buildGreeting(templateName: string | null): string {
  if (templateName) {
    return `こんにちは！Chappieです。「${templateName}」テンプレートをベースに、御社の音声AIエージェントを一緒に作っていきます。

まずはこちらから3つ確認させてください：
(1) 御社の主な業態・取り扱う商材は、このテンプレート想定と大きく違う部分はありますか？
(2) 既に使っているトークスクリプトや商材資料があれば、左の「資料アップロード」からドラッグ&ドロップしてください。内容を踏まえて設計します。
(3) 今回のAIで「これだけは絶対に実現したい」ゴールを一言で教えてください。

どれから話しましょうか？`;
  }
  return `こんにちは！Chappieです。音声AIエージェントを一緒に作っていきます。

まずはざっくりで良いので、どんな業種・どんな電話業務を自動化したいか教えてください。業界のプロ目線で先回りして提案していきます！`;
}

export default function ChappieChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-1px)] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
        </div>
      }
    >
      <ChappieChatInner />
    </Suspense>
  );
}

function ChappieChatInner() {
  const searchParams = useSearchParams();
  const engineParam = searchParams.get("engine");
  const engine: ChappieEngine =
    engineParam === "dialogflow_cx" || engineParam === "both" ? engineParam : "vapi";
  const templateId = searchParams.get("template");
  const template = templateId ? getTemplate(templateId) : undefined;

  const [attachments, setAttachments] = useState<AttachedFile[]>([]);

  const readyAttachments = useMemo(
    () =>
      attachments
        .filter((a) => a.status === "ready")
        .map((a) => ({
          filename: a.filename,
          text: a.text,
          charCount: a.charCount,
        })),
    [attachments],
  );

  const storageKey = useMemo(
    () => `chappie-chat-${templateId ?? "no-template"}`,
    [templateId],
  );

  const initialMessages = useMemo<ChappieUIMessage[]>(
    () => [
      {
        id: "chappie-greeting",
        role: "assistant",
        parts: [{ type: "text", text: buildGreeting(template?.displayName ?? null) }],
        metadata: { stage: "discovery" },
      },
    ],
    [template],
  );

  const { messages, sendMessage, setMessages, status } = useChat<ChappieUIMessage>({
    transport: new DefaultChatTransport({
      api: "/api/chappie/chat",
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          messages,
          templateId: template?.id,
          attachments: readyAttachments,
          engine,
        },
      }),
    }),
    messages: initialMessages,
  });

  const [storageHydrated, setStorageHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as ChappieUIMessage[];
        if (Array.isArray(parsed) && parsed.length > 1) {
          setMessages(parsed);
        }
      }
    } catch {
      // stale data or storage blocked — keep greeting
    } finally {
      setStorageHydrated(true);
    }
  }, [storageKey, setMessages]);

  useEffect(() => {
    if (!storageHydrated) return;
    if (messages.length <= 1) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // quota exceeded or storage disabled — silently skip
    }
  }, [messages, storageKey, storageHydrated]);

  function handleResetConversation() {
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      "会話履歴をリセットして最初からやり直しますか？（元に戻せません）",
    );
    if (!ok) return;
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setMessages([
      {
        id: "chappie-greeting",
        role: "assistant",
        parts: [{ type: "text", text: buildGreeting(template?.displayName ?? null) }],
        metadata: { stage: "discovery" },
      },
    ]);
    setDeployState({ kind: "idle" });
  }

  const [input, setInput] = useState("");
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<"vapi" | "dfcx" | null>(null);
  const [deployedOutput, setDeployedOutput] = useState<ChappieOutput | null>(null);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [savingProject, setSavingProject] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deployState, setDeployState] = useState<
    | { kind: "idle" }
    | { kind: "extracting"; target: "vapi" | "dfcx" }
    | { kind: "deploying"; target: "vapi" | "dfcx" }
    | { kind: "success"; target: "vapi"; assistantId: string; name: string }
    | { kind: "dfcx_success"; agentId: string; agentName: string; trainOperationName?: string }
    | { kind: "error"; error: string }
  >({ kind: "idle" });
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isBusy = status === "submitted" || status === "streaming";
  const isDeploying = deployState.kind === "extracting" || deployState.kind === "deploying";

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

  function handleDeployClick(target: "vapi" | "dfcx") {
    if (isDeploying || deployState.kind === "success" || deployState.kind === "dfcx_success") return;
    if (!reachedReview) {
      setPendingTarget(target);
      setShowIncompleteWarning(true);
      return;
    }
    if (target === "vapi") void runDeployToVapi();
    else void runDeployToDfcx();
  }

  async function extractOutput(): Promise<ChappieOutput> {
    const extractRes = await fetch("/api/chappie/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        templateId: template?.id,
        attachments: readyAttachments,
      }),
    });
    if (!extractRes.ok) {
      const err = (await extractRes.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `extract failed: ${extractRes.status}`);
    }
    const { output } = (await extractRes.json()) as { output: ChappieOutput };
    return output;
  }

  async function runDeployToVapi() {
    if (isDeploying || deployState.kind === "success" || deployState.kind === "dfcx_success") return;

    setDeployState({ kind: "extracting", target: "vapi" });
    try {
      const output = await extractOutput();

      setDeployState({ kind: "deploying", target: "vapi" });
      const projectId = `new-${Date.now()}`;
      const deployRes = await fetch(`/api/projects/${projectId}/deploy-vapi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ output, tenantId: "tenant-001" }),
      });
      if (!deployRes.ok) {
        const err = (await deployRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `deploy failed: ${deployRes.status}`);
      }
      const result = (await deployRes.json()) as { assistantId: string; name: string };
      setDeployState({
        kind: "success",
        target: "vapi",
        assistantId: result.assistantId,
        name: result.name,
      });
    } catch (err) {
      setDeployState({
        kind: "error",
        error: err instanceof Error ? err.message : "unknown error",
      });
    }
  }

  async function runDeployToDfcx() {
    if (isDeploying || deployState.kind === "success" || deployState.kind === "dfcx_success") return;

    setDeployState({ kind: "extracting", target: "dfcx" });
    try {
      const output = await extractOutput();

      setDeployState({ kind: "deploying", target: "dfcx" });
      const projectId = `new-${Date.now()}`;
      const deployRes = await fetch(`/api/projects/${projectId}/deploy-dialogflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          output,
          template,
          tenantId: projectId,
        }),
      });
      if (!deployRes.ok) {
        const err = (await deployRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `deploy failed: ${deployRes.status}`);
      }
      const result = (await deployRes.json()) as {
        ok: boolean;
        agentId?: string;
        agentName?: string;
        trainOperationName?: string;
        error?: string;
      };
      if (!result.ok || !result.agentId || !result.agentName) {
        throw new Error(result.error ?? "DFCX deploy did not return agent");
      }
      setDeployState({
        kind: "dfcx_success",
        agentId: result.agentId,
        agentName: result.agentName,
        trainOperationName: result.trainOperationName,
      });
      // 抽出した output と DFCX 結果を保存用に保持
      setDeployedOutput(output);
    } catch (err) {
      setDeployState({
        kind: "error",
        error: err instanceof Error ? err.message : "unknown error",
      });
    }
  }

  const totalTokens = readyAttachments.reduce((s, a) => s + Math.ceil(a.charCount / 3), 0);

  return (
    <PageTransition>
      <div className="flex h-[calc(100vh-1px)] overflow-hidden">
        {/* Left sidebar — project info */}
        <div className="w-72 shrink-0 border-r border-white/5 bg-card/30 flex flex-col">
          <div className="p-4 border-b border-white/5">
            <p className="text-[10px] tracking-[0.13em] uppercase text-muted-foreground/40 font-medium">
              新規プロジェクト
            </p>
            <p className="text-[13px] font-semibold mt-1">チャッピー壁打ち</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* AIエンジン */}
              <div>
                <p className="text-[10px] text-muted-foreground/40 mb-1">AIエンジン</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(engine === "vapi" || engine === "both") && (
                    <>
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span className="text-[12px] font-medium">Vapi.ai</span>
                    </>
                  )}
                  {engine === "both" && (
                    <span className="text-[10px] text-muted-foreground/40 mx-1">/</span>
                  )}
                  {(engine === "dialogflow_cx" || engine === "both") && (
                    <>
                      <Bot className="w-3 h-3 text-blue-400" />
                      <span className="text-[12px] font-medium">Dialogflow CX</span>
                    </>
                  )}
                </div>
              </div>

              {/* Template */}
              {template && (
                <div>
                  <p className="text-[10px] text-muted-foreground/40 mb-1">テンプレート</p>
                  <div className="rounded-md border border-primary/15 bg-primary/5 px-2.5 py-2">
                    <p className="text-[12px] font-semibold text-foreground/90">
                      {template.displayName}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5 line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                </div>
              )}

              {/* File upload */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-muted-foreground/40">資料アップロード</p>
                  {readyAttachments.length > 0 && (
                    <span className="text-[10px] text-muted-foreground/50 num">
                      {totalTokens.toLocaleString()} tok
                    </span>
                  )}
                </div>
                <FileUploadZone
                  files={attachments}
                  onFilesChange={setAttachments}
                  maxFiles={5}
                  disabled={isBusy}
                />
              </div>

              {/* Progress */}
              <div className="pt-1">
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

              {/* Collected items */}
              <div>
                <p className="text-[10px] text-muted-foreground/40 mb-2 font-medium uppercase tracking-wide">
                  収集済み項目
                </p>
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
            </div>
          </div>

          <div className="p-4 border-t border-white/5 space-y-2">
            {deployState.kind === "success" ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-400 text-[12px] font-semibold">
                  <Check className="w-3 h-3" />
                  Vapi Assistant 作成完了
                </div>
                <div className="rounded-md bg-white/5 p-2 space-y-1">
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">
                    name
                  </p>
                  <p className="text-[11px] font-medium break-all">{deployState.name}</p>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mt-1.5">
                    assistantId
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground/80 break-all">
                    {deployState.assistantId}
                  </p>
                </div>
                <VapiCallWidget
                  assistantId={deployState.assistantId}
                  assistantName={deployState.name}
                  triggerLabel="テスト通話する"
                  className="w-full gradient-bg border-0 hover:opacity-85 h-9 text-[12px] font-semibold justify-center"
                />
                <a
                  href={`https://dashboard.vapi.ai/assistants/${deployState.assistantId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <Button
                    className="w-full h-8 text-[11px] gap-1.5 text-muted-foreground/70 hover:text-foreground"
                    variant="ghost"
                  >
                    管理画面で開く（管理者用） <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              </div>
            ) : deployState.kind === "dfcx_success" ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-400 text-[12px] font-semibold">
                  <Check className="w-3 h-3" />
                  Dialogflow CX Agent 作成完了
                </div>
                <div className="rounded-md bg-white/5 p-2 space-y-1">
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">
                    agentId
                  </p>
                  <p className="text-[11px] font-medium break-all">{deployState.agentId}</p>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mt-1.5">
                    agentName
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground/80 break-all">
                    {deployState.agentName}
                  </p>
                  {deployState.trainOperationName && (
                    <>
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mt-1.5">
                        train operation
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground/80 break-all">
                        {deployState.trainOperationName}
                      </p>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                  GCP Console の Conversational Agents で動作確認できます。Train ジョブが完了するまで数分かかる場合があります。
                </p>
                {!savedProjectId ? (
                  <Button
                    onClick={async () => {
                      setSavingProject(true);
                      setSaveError(null);
                      try {
                        const projectName = deployedOutput?.assistantName
                          ? `${deployedOutput.assistantName} (${template?.displayName ?? "untitled"})`
                          : (template?.displayName ?? "新規プロジェクト");
                        const resp = await fetch("/api/projects-store", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            name: projectName,
                            templateId: template?.id,
                            chappieOutput: deployedOutput,
                            dfcxAgentId: deployState.kind === "dfcx_success" ? deployState.agentId : undefined,
                            dfcxAgentName: deployState.kind === "dfcx_success" ? deployState.agentName : undefined,
                            dfcxTrainOperationId: deployState.kind === "dfcx_success" ? deployState.trainOperationName : undefined,
                          }),
                        });
                        const data = (await resp.json()) as { project?: { id: string }; error?: string };
                        if (!resp.ok || !data.project) throw new Error(data.error ?? `保存失敗 (${resp.status})`);
                        setSavedProjectId(data.project.id);
                      } catch (e) {
                        setSaveError(e instanceof Error ? e.message : "保存失敗");
                      } finally {
                        setSavingProject(false);
                      }
                    }}
                    disabled={savingProject}
                    className="w-full gradient-bg border-0 hover:opacity-85 h-9 text-[12px] font-semibold gap-1.5"
                  >
                    {savingProject ? "保存中…" : "💾 プロジェクトとして保存"}
                  </Button>
                ) : (
                  <a href={`/projects/${savedProjectId}/test-voice?agentName=${encodeURIComponent(deployState.agentName)}`} className="block">
                    <Button className="w-full gradient-bg border-0 hover:opacity-85 h-9 text-[12px] font-semibold gap-1.5">
                      ✅ 保存完了 → テスト会話へ
                    </Button>
                  </a>
                )}
                {saveError && (
                  <p className="text-[10px] text-red-400 break-words">{saveError}</p>
                )}
                <a
                  href={`/projects/new/test-voice?agentName=${encodeURIComponent(deployState.agentName)}`}
                  className="block"
                >
                  <Button
                    variant="outline"
                    className="w-full h-8 text-[11px] gap-1.5"
                  >
                    🎤 保存せず音声テスト
                  </Button>
                </a>
                <a
                  href={`https://dialogflow.cloud.google.com/cx/${deployState.agentName}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <Button
                    className="w-full h-8 text-[11px] gap-1.5 text-muted-foreground/70 hover:text-foreground"
                    variant="ghost"
                  >
                    GCP Console で開く <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              </div>
            ) : (
              <>
                {(engine === "vapi" || engine === "both") && (
                  <Button
                    onClick={() => handleDeployClick("vapi")}
                    disabled={isDeploying}
                    className="w-full gradient-bg border-0 hover:opacity-85 h-9 text-[12px] font-semibold gap-1.5"
                  >
                    {deployState.kind === "extracting" && deployState.target === "vapi" ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        情報を抽出中…
                      </>
                    ) : deployState.kind === "deploying" && deployState.target === "vapi" ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Vapiへ送信中…
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3" />
                        Vapi Assistant を作成
                      </>
                    )}
                  </Button>
                )}
                {(engine === "dialogflow_cx" || engine === "both") && (
                  <Button
                    onClick={() => handleDeployClick("dfcx")}
                    disabled={isDeploying}
                    className="w-full bg-blue-500/15 hover:bg-blue-500/25 border border-blue-400/30 text-blue-100 h-9 text-[12px] font-semibold gap-1.5"
                  >
                    {deployState.kind === "extracting" && deployState.target === "dfcx" ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        情報を抽出中…
                      </>
                    ) : deployState.kind === "deploying" && deployState.target === "dfcx" ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Dialogflow CX へ送信中…
                      </>
                    ) : (
                      <>
                        <Bot className="w-3 h-3" />
                        Dialogflow CX にデプロイ
                      </>
                    )}
                  </Button>
                )}
                {!reachedReview && !isDeploying && (
                  <p className="text-[10px] text-amber-300/70 leading-relaxed">
                    ※ まだヒアリング途中です。途中でも作成できますが、内容が不完全になります。
                  </p>
                )}
                {deployState.kind === "error" && (
                  <div className="flex items-start gap-1.5 text-[11px] text-red-400 bg-red-500/5 border border-red-500/15 rounded-md p-2">
                    <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                    <p className="break-words">{deployState.error}</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={handleResetConversation}
                  className="w-full h-8 text-[11px] gap-1.5 text-muted-foreground/70 hover:text-foreground mt-2"
                >
                  <Trash2 className="w-3 h-3" /> 会話をリセット
                </Button>
                <p className="text-[10px] text-muted-foreground/40 leading-relaxed">
                  ブラウザを閉じたり更新しても会話は自動保存されます
                </p>
              </>
            )}
          </div>

          <AlertDialog open={showIncompleteWarning} onOpenChange={setShowIncompleteWarning}>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogMedia className="bg-amber-500/15 text-amber-400">
                  <AlertCircle className="w-5 h-5" />
                </AlertDialogMedia>
                <AlertDialogTitle>まだヒアリング途中ですが、作成しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  現在のステージは「{currentStage}」で、収集進捗は {progress}% です。
                  このまま作成するとテンプレートのデフォルト値で埋められ、
                  不完全な AI エージェントになる可能性があります。
                  <br />
                  <br />
                  続けるにはそのまま、やっぱり壁打ちを続けるならキャンセルしてください。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPendingTarget(null)}>
                  壁打ちを続ける
                </AlertDialogCancel>
                <AlertDialogAction
                  className="gradient-bg border-0 hover:opacity-85"
                  onClick={() => {
                    setShowIncompleteWarning(false);
                    if (pendingTarget === "dfcx") void runDeployToDfcx();
                    else void runDeployToVapi();
                    setPendingTarget(null);
                  }}
                >
                  このまま作成する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {/* Attachments summary chip */}
            {readyAttachments.length > 0 && (
              <div className="max-w-[720px] rounded-lg border border-white/5 bg-white/3 px-3 py-2 flex items-center gap-2 text-[11px] text-muted-foreground/70">
                <FileText className="w-3 h-3 text-primary/70" />
                <span>
                  {readyAttachments.length} 件の資料を参照中（合計{" "}
                  {readyAttachments
                    .reduce((s, a) => s + a.charCount, 0)
                    .toLocaleString()}{" "}
                  文字）
                </span>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => {
                const rawText = msg.parts
                  .filter((p): p is { type: "text"; text: string } => p.type === "text")
                  .map((p) => p.text)
                  .join("");
                const { cleanText, choices } =
                  msg.role === "assistant"
                    ? parseChoices(rawText)
                    : { cleanText: rawText, choices: [] as string[] };
                const isLastAssistant =
                  msg.role === "assistant" &&
                  idx === messages.length - 1 &&
                  !isBusy &&
                  choices.length > 0;
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
                    <div className="flex flex-col gap-2 max-w-[560px]">
                      <div
                        className={`rounded-xl px-4 py-3 text-[13px] leading-relaxed ${
                          msg.role === "assistant"
                            ? "bg-card/60 border border-white/5"
                            : "bg-primary/10 border border-primary/15"
                        }`}
                      >
                        {renderText(cleanText)}
                      </div>
                      {isLastAssistant && (
                        <div className="flex flex-wrap gap-1.5">
                          {choices.map((choice) => (
                            <button
                              key={choice}
                              type="button"
                              onClick={() => {
                                if (isBusy) return;
                                sendMessage({ text: choice });
                              }}
                              className="px-3 py-1.5 rounded-full border border-primary/25 bg-primary/8 hover:bg-primary/15 hover:border-primary/40 text-[12px] text-foreground/90 transition-colors text-left"
                            >
                              {choice}
                            </button>
                          ))}
                          <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/3 text-[11px] text-muted-foreground/60 self-center">
                            または下に自由記入
                          </span>
                        </div>
                      )}
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
            <p className="text-center text-[10px] text-muted-foreground/25 mt-2">
              Shift + Enter で改行 / Enter で送信
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
