"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/ui/page-transition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, Sparkles, Calendar } from "lucide-react";
import type { Report, ReportPeriod } from "@/lib/data/reports";

const PERIOD_LABEL: Record<ReportPeriod, string> = {
  daily: "日次",
  weekly: "週次",
  monthly: "月次",
  quarterly: "四半期",
};

const STATUS_BADGE: Record<Report["status"], string> = {
  queued:     "bg-muted text-muted-foreground border-border",
  generating: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  ready:      "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failed:     "bg-red-500/15 text-red-400 border-red-500/30",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

// 簡易マークダウンレンダラ（外部依存ゼロ）
function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (!listBuffer.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-1 my-2 text-sm">
        {listBuffer.map((it, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: inlineMd(it) }} />
        ))}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      flushList();
      blocks.push(
        <h2 key={`h2-${idx}`} className="text-base font-semibold mt-5 mb-2">{line.slice(3)}</h2>
      );
    } else if (line.startsWith("### ")) {
      flushList();
      blocks.push(
        <h3 key={`h3-${idx}`} className="text-sm font-semibold mt-3 mb-1.5">{line.slice(4)}</h3>
      );
    } else if (line.startsWith("# ")) {
      flushList();
      blocks.push(
        <h1 key={`h1-${idx}`} className="text-lg font-bold mt-6 mb-3">{line.slice(2)}</h1>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      listBuffer.push(line.slice(2));
    } else if (line === "") {
      flushList();
    } else {
      flushList();
      blocks.push(
        <p key={`p-${idx}`} className="text-sm leading-relaxed my-2" dangerouslySetInnerHTML={{ __html: inlineMd(line) }} />
      );
    }
  });
  flushList();
  return blocks;
}

function inlineMd(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code class="bg-muted/40 px-1 rounded text-[12px]">$1</code>');
}

export default function ReportsPage() {
  const [items, setItems] = useState<Report[]>([]);
  const [selected, setSelected] = useState<Report | null>(null);
  const [generating, setGenerating] = useState<ReportPeriod | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/reports");
    const data = await res.json();
    if (data.ok) {
      setItems(data.items);
      if (!selected && data.items.length > 0) setSelected(data.items[0]);
    }
    setLoading(false);
  }, [selected]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async (period: ReportPeriod) => {
    setGenerating(period);
    const res = await fetch("/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period }),
    });
    const data = await res.json();
    setGenerating(null);
    if (data.ok) {
      setSelected(data.report);
      fetchData();
    } else {
      alert(`生成に失敗しました: ${data.error}`);
    }
  };

  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-[1400px]">
        <PageHeader
          title="レポート"
          description="AI が KPI を解析し、エグゼクティブ向けナラティブレポートを自動生成。"
        />

        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">新しいレポートを生成</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["daily", "weekly", "monthly", "quarterly"] as const).map((p) => (
              <Button
                key={p}
                size="sm"
                variant="outline"
                onClick={() => generate(p)}
                disabled={generating !== null}
              >
                {generating === p ? (
                  <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />生成中...</>
                ) : (
                  <><Calendar className="w-3 h-3 mr-1.5" />{PERIOD_LABEL[p]}</>
                )}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Claude Sonnet 4.6 が期間内のKPIを解析し、マークダウン形式で要約・所感・次期アクションを出力します。
          </p>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* レポート一覧 */}
          <Card className="p-3 space-y-1.5 h-fit">
            <h4 className="text-xs font-semibold px-2 py-1 text-muted-foreground">レポート一覧 ({items.length})</h4>
            {loading && <p className="text-xs text-muted-foreground p-2">読み込み中...</p>}
            {!loading && items.length === 0 && (
              <p className="text-xs text-muted-foreground p-2">まだレポートがありません</p>
            )}
            <div className="space-y-1 max-h-[600px] overflow-y-auto">
              {items.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                    selected?.id === r.id
                      ? "bg-primary/10 border-primary/30"
                      : "border-transparent hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge variant="outline" className="text-[9px]">{PERIOD_LABEL[r.period]}</Badge>
                    <Badge className={`${STATUS_BADGE[r.status]} text-[9px]`}>{r.status}</Badge>
                  </div>
                  <div className="text-xs font-medium line-clamp-2">{r.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {formatDate(r.period_start)} 〜 {formatDate(r.period_end)}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* レポート詳細 */}
          <Card className="p-6">
            {!selected && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">左の一覧からレポートを選択してください</p>
              </div>
            )}
            {selected && (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/40">
                  <div>
                    <h2 className="text-xl font-bold">{selected.title}</h2>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {formatDate(selected.period_start)} 〜 {formatDate(selected.period_end)}
                      {selected.generated_at && (
                        <>
                          <span>·</span>
                          <span>生成: {new Date(selected.generated_at).toLocaleString("ja-JP")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge className={STATUS_BADGE[selected.status]}>{selected.status}</Badge>
                </div>

                {selected.status === "generating" && (
                  <div className="flex items-center gap-2 text-sm text-blue-400 py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI がレポートを生成しています...
                  </div>
                )}

                {selected.status === "failed" && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-lg p-3 text-sm">
                    生成に失敗しました: {selected.error_message ?? "不明なエラー"}
                  </div>
                )}

                {selected.status === "ready" && selected.summary_markdown && (
                  <div className="prose prose-invert max-w-none">
                    {renderMarkdown(selected.summary_markdown)}
                  </div>
                )}

                {selected.generation_cost_usd !== null && selected.generation_cost_usd !== undefined && (
                  <div className="text-[10px] text-muted-foreground pt-3 border-t border-border/40 tabular-nums">
                    生成コスト: ${selected.generation_cost_usd.toFixed(4)}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
