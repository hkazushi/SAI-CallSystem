"use client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/ui/page-transition";
import { mockProjects } from "@/lib/mock-data";

type ProjectWithTemplate = (typeof mockProjects)[number] & { template_id?: string };
import { ChevronLeft, Upload, FileText, Loader2, Sparkles, ArrowRight, AlertTriangle } from "lucide-react";

type LogType = "call" | "chat" | "transcript";
type Status = "idle" | "analyzing" | "done" | "error";

interface AnalyzeDraft {
  templateId?: string;
  suggestedTasks: Array<{
    name: string;
    trigger: string;
    steps: string[];
    intentTrainingPhrases: string[];
  }>;
  suggestedHearingFields: Array<{
    key: string;
    label: string;
    type: "string" | "number" | "boolean" | "enum";
    required: boolean;
  }>;
  suggestedObjections: Array<{
    trigger: string;
    suggestedResponses: string[];
  }>;
  suggestedPersona: { tone: string; doNots: string[] };
  suggestedTransferConditions: string[];
}

interface AnalyzeResponse {
  ok: boolean;
  chunkCount: number;
  analyzedChunks: number;
  draft: AnalyzeDraft;
  error?: string;
}

export default function ImportLogsPage() {
  const { id } = useParams();
  const router = useRouter();
  const project = (mockProjects.find((p) => p.id === id) ?? mockProjects[0]) as ProjectWithTemplate;

  const [logText, setLogText] = useState("");
  const [logType, setLogType] = useState<LogType>("call");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState<AnalyzeDraft | null>(null);
  const [chunkInfo, setChunkInfo] = useState<{ total: number; analyzed: number } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("ファイルサイズは 5MB 以下にしてください");
      return;
    }
    const text = await file.text();
    setLogText(text);
    setErrorMsg(null);
  };

  const handleAnalyze = async () => {
    if (!logText.trim()) {
      setErrorMsg("ログ本文を貼り付けるかファイルをアップロードしてください");
      return;
    }
    setStatus("analyzing");
    setErrorMsg(null);
    setDraft(null);
    setChunkInfo(null);

    try {
      const res = await fetch(`/api/projects/${id}/analyze-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logText,
          logType,
          templateId: project.template_id,
        }),
      });
      const json = (await res.json()) as AnalyzeResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "分析に失敗しました");
      }
      setDraft(json.draft);
      setChunkInfo({ total: json.chunkCount, analyzed: json.analyzedChunks });
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "unknown error");
      setStatus("error");
    }
  };

  const handleSendToChappie = () => {
    if (!draft) return;
    sessionStorage.setItem(`chappie-draft-${id}`, JSON.stringify(draft));
    router.push(`/projects/${id}/chat?seed=logs`);
  };

  return (
    <PageTransition>
      <div className="container mx-auto max-w-5xl py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${id}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              プロジェクトに戻る
            </Button>
          </Link>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            既存ログ取り込み
          </h1>
          <p className="text-sm text-muted-foreground">
            既存の通話/チャットログを貼り付けると、AI が分析して
            業界実態に即した Agent 設定のドラフトを生成します。
            生成結果は Chappie の壁打ちで「足す・引く・細分化」できます。
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">ログの種類</label>
            <div className="flex gap-2">
              {(["call", "chat", "transcript"] as LogType[]).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={logType === t ? "default" : "outline"}
                  onClick={() => setLogType(t)}
                  disabled={status === "analyzing"}
                >
                  {t === "call" ? "通話ログ" : t === "chat" ? "チャットログ" : "文字起こし"}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">ファイルアップロード</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".txt,.csv,.json,.md,.log"
                onChange={handleFileUpload}
                disabled={status === "analyzing"}
                className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:px-3 file:py-1.5 file:text-sm hover:file:bg-primary/90"
              />
              <span className="text-xs text-muted-foreground">
                .txt / .csv / .json / .md / .log (最大 5MB)
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              またはログ本文を直接貼り付け
              {logText && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {logText.length.toLocaleString()} 文字
                </span>
              )}
            </label>
            <textarea
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              placeholder="例: オペレーター: お電話ありがとうございます…&#10;お客様: 解約について聞きたいんですが…"
              rows={12}
              disabled={status === "analyzing"}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleAnalyze}
              disabled={status === "analyzing" || !logText.trim()}
              size="lg"
            >
              {status === "analyzing" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI で分析する
                </>
              )}
            </Button>
          </div>
        </Card>

        {draft && (
          <Card className="p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  分析結果ドラフト
                </h2>
                {chunkInfo && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {chunkInfo.total} チャンク中 {chunkInfo.analyzed} を分析
                  </p>
                )}
              </div>
              <Button onClick={handleSendToChappie}>
                Chappie 壁打ちに送る
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            {draft.suggestedTasks.length > 0 && (
              <DraftSection title="検出されたシナリオ" count={draft.suggestedTasks.length}>
                <ul className="space-y-2 text-sm">
                  {draft.suggestedTasks.map((t, i) => (
                    <li key={i} className="rounded-md border p-3 space-y-1.5">
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">trigger: {t.trigger}</div>
                      {t.steps.length > 0 && (
                        <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-0.5">
                          {t.steps.slice(0, 4).map((s, j) => (
                            <li key={j}>{s}</li>
                          ))}
                        </ol>
                      )}
                      {t.intentTrainingPhrases.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {t.intentTrainingPhrases.map((p, k) => (
                            <Badge key={k} variant="secondary" className="text-xs">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </DraftSection>
            )}

            {draft.suggestedHearingFields.length > 0 && (
              <DraftSection title="ヒアリング項目" count={draft.suggestedHearingFields.length}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {draft.suggestedHearingFields.map((f, i) => (
                    <div key={i} className="rounded-md border p-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-xs">{f.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {f.key} · {f.type}
                        </div>
                      </div>
                      {f.required && <Badge variant="default" className="text-xs">必須</Badge>}
                    </div>
                  ))}
                </div>
              </DraftSection>
            )}

            {draft.suggestedObjections.length > 0 && (
              <DraftSection title="お客さん側の反論・不安" count={draft.suggestedObjections.length}>
                <ul className="space-y-2 text-sm">
                  {draft.suggestedObjections.map((o, i) => (
                    <li key={i} className="rounded-md border p-3 space-y-1.5">
                      <div className="font-medium text-xs">「{o.trigger}」</div>
                      {o.suggestedResponses.length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                          {o.suggestedResponses.map((r, j) => (
                            <li key={j}>{r}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </DraftSection>
            )}

            {(draft.suggestedPersona.tone || draft.suggestedPersona.doNots.length > 0) && (
              <DraftSection title="ペルソナ・禁止事項">
                {draft.suggestedPersona.tone && (
                  <div className="text-sm mb-2">
                    <span className="text-muted-foreground">トーン: </span>
                    {draft.suggestedPersona.tone}
                  </div>
                )}
                {draft.suggestedPersona.doNots.length > 0 && (
                  <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                    {draft.suggestedPersona.doNots.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
              </DraftSection>
            )}

            {draft.suggestedTransferConditions.length > 0 && (
              <DraftSection title="人間転送のトリガー" count={draft.suggestedTransferConditions.length}>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                  {draft.suggestedTransferConditions.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </DraftSection>
            )}
          </Card>
        )}
      </div>
    </PageTransition>
  );
}

function DraftSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {count !== undefined && (
          <Badge variant="outline" className="text-xs">
            {count}
          </Badge>
        )}
      </div>
      {children}
    </div>
  );
}
