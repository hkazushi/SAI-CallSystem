"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockCallLogs, mockTranscripts } from "@/lib/mock-data";
import { ChevronLeft, Phone, Play, Download, Bot, User, CheckCircle2, Clock, PhoneIncoming, PhoneOutgoing } from "lucide-react";

const projectNames: Record<string, string> = {
  "proj-001": "クラウド会計ソフト アウトバウンド",
  "proj-002": "カスタマーサポート インバウンド",
  "proj-003": "保険商品 見込み客フォロー",
  "proj-005": "太陽光発電 アポ取得",
};

const outcomeConfig: Record<string, { label: string; color: string }> = {
  completed: { label: "完了", color: "text-emerald-400" },
  answered:  { label: "応答", color: "text-blue-400" },
  no_answer: { label: "不在", color: "text-amber-400" },
  busy:      { label: "話中", color: "text-orange-400" },
  failed:    { label: "失敗", color: "text-red-400" },
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `0:${String(sec).padStart(2, "0")}`;
}

export default function CallDetailPage() {
  const { id } = useParams();
  const call = mockCallLogs.find((c) => c.id === id) ?? mockCallLogs[0];
  const outcome = outcomeConfig[call.outcome as string] ?? { label: call.outcome as string, color: "text-muted-foreground" };
  const hasTranscript = call.outcome === "completed" || call.outcome === "answered";

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/calls">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" />通話ログ
          </Button>
        </Link>
      </div>
      <PageHeader title={`通話詳細 · ${call.id}`}>
        {call.has_recording && (
          <Button variant="outline" size="sm" className="border-border/40 h-8 text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" />録音ダウンロード
          </Button>
        )}
      </PageHeader>

      {/* Meta cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-border/40 bg-card/60">
          <p className="text-xs text-muted-foreground">結果</p>
          <p className={`text-lg font-bold mt-1 ${outcome.color}`}>{outcome.label}</p>
        </Card>
        <Card className="p-4 border-border/40 bg-card/60">
          <p className="text-xs text-muted-foreground">通話時間</p>
          <p className="text-lg font-bold mt-1">{call.duration_seconds}秒</p>
        </Card>
        <Card className="p-4 border-border/40 bg-card/60">
          <p className="text-xs text-muted-foreground">AI解決</p>
          <p className={`text-lg font-bold mt-1 ${call.ai_resolved ? "text-emerald-400" : "text-muted-foreground"}`}>
            {call.ai_resolved ? "解決済み" : "未解決"}
          </p>
        </Card>
        <Card className="p-4 border-border/40 bg-card/60">
          <p className="text-xs text-muted-foreground">リトライ</p>
          <p className="text-lg font-bold mt-1">{call.retry_count}回</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Call Info */}
        <Card className="p-5 border-border/40 bg-card/60 space-y-3">
          <h3 className="font-semibold text-sm">通話情報</h3>
          {[
            { label: "方向", value: call.direction === "inbound" ? "インバウンド (着信)" : "アウトバウンド (発信)" },
            { label: "発信番号", value: call.caller_number },
            { label: "着信番号", value: call.called_number },
            { label: "プロジェクト", value: projectNames[call.project_id] ?? call.project_id },
            { label: "開始時刻", value: formatDateTime(call.started_at) },
            { label: "終了時刻", value: formatDateTime(call.ended_at) },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-3 text-sm">
              <span className="text-muted-foreground text-xs shrink-0">{label}</span>
              <span className="text-xs text-right">{value}</span>
            </div>
          ))}
        </Card>

        {/* Summary */}
        <Card className="p-5 border-border/40 bg-card/60 lg:col-span-2">
          <h3 className="font-semibold text-sm mb-3">AIサマリー</h3>
          {call.summary ? (
            <div className="p-3 rounded-xl bg-white/3 border border-border/20 text-sm leading-relaxed">
              {call.summary}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-white/3 border border-border/20 text-sm text-muted-foreground">
              サマリーはありません（不在・話中の場合）
            </div>
          )}

          {call.has_recording && (
            <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3">
              <Button size="sm" className="gradient-bg border-0 hover:opacity-90 h-7 w-7 p-0 rounded-full shrink-0">
                <Play className="w-3 h-3" />
              </Button>
              <div className="flex-1">
                <div className="h-1 bg-white/10 rounded-full">
                  <div className="h-full bg-primary/60 rounded-full w-0" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0:00</span>
                  <span>{Math.floor(call.duration_seconds / 60)}:{String(call.duration_seconds % 60).padStart(2, "0")}</span>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Transcript */}
      {hasTranscript && (
        <Card className="border-border/40 bg-card/60">
          <div className="p-5 border-b border-border/30 flex items-center gap-2">
            <h3 className="font-semibold text-sm">通話トランスクリプト</h3>
            <Badge variant="outline" className="border-border/30 text-muted-foreground text-xs">
              {mockTranscripts.length} 発話
            </Badge>
          </div>
          <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
            {mockTranscripts.map((t) => (
              <div key={t.sequence} className={`flex gap-3 ${t.speaker === "ai" ? "" : "flex-row-reverse"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${t.speaker === "ai" ? "bg-primary/20" : "bg-white/10"}`}>
                  {t.speaker === "ai" ? <Bot className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className={`max-w-[70%] space-y-1 ${t.speaker !== "ai" ? "items-end" : ""}`}>
                  <div className={`flex items-center gap-2 text-xs text-muted-foreground ${t.speaker !== "ai" ? "justify-end" : ""}`}>
                    <span>{t.speaker === "ai" ? "AI エージェント" : "通話相手"}</span>
                    <span>{formatMs(t.timestamp_ms)}</span>
                  </div>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    t.speaker === "ai"
                      ? "bg-primary/10 border border-primary/20 rounded-tl-sm"
                      : "bg-white/8 border border-white/10 rounded-tr-sm"
                  }`}>
                    {t.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
