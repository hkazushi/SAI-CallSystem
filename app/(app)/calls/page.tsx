"use client";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockCallLogs } from "@/lib/mock-data";
import { Search, Filter, Download, Phone, PhoneIncoming, PhoneOutgoing } from "lucide-react";

const outcomeConfig: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: "完了", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  answered:  { label: "応答", color: "text-blue-400", bg: "bg-blue-400/10" },
  no_answer: { label: "不在", color: "text-amber-400", bg: "bg-amber-400/10" },
  busy:      { label: "話中", color: "text-orange-400", bg: "bg-orange-400/10" },
  failed:    { label: "失敗", color: "text-red-400", bg: "bg-red-400/10" },
};

const projectNames: Record<string, string> = {
  "proj-001": "クラウド会計 OB",
  "proj-002": "CSサポート IB",
  "proj-003": "保険フォロー OB",
  "proj-005": "太陽光 OB",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDuration(s: number) {
  if (s < 60) return `${s}秒`;
  return `${Math.floor(s / 60)}分${s % 60}秒`;
}

export default function CallsPage() {
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<string | null>(null);
  const [dirFilter, setDirFilter] = useState<string | null>(null);

  const filtered = mockCallLogs.filter((c) => {
    if (search && !c.caller_number.includes(search) && !c.called_number.includes(search)) return false;
    if (outcomeFilter && c.outcome !== outcomeFilter) return false;
    if (dirFilter && c.direction !== dirFilter) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <PageHeader title="通話ログ" description="すべての通話履歴を確認・分析できます">
        <Button variant="outline" size="sm" className="border-border/40 h-8 text-xs">
          <Download className="w-3.5 h-3.5 mr-1.5" />エクスポート
        </Button>
      </PageHeader>

      {/* Filters */}
      <Card className="p-4 border-border/40 bg-card/60">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="電話番号で検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 bg-background/50 border-border/40 text-sm"
            />
          </div>

          {/* Direction filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">方向:</span>
            {[null, "inbound", "outbound"].map((d) => (
              <button
                key={String(d)}
                onClick={() => setDirFilter(d)}
                className={`h-7 px-2.5 rounded-lg text-xs transition-all border ${dirFilter === d ? "gradient-bg border-0 text-white" : "border-border/30 text-muted-foreground hover:text-foreground"}`}
              >
                {d === null ? "すべて" : d === "inbound" ? "着信" : "発信"}
              </button>
            ))}
          </div>

          {/* Outcome filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">結果:</span>
            <button
              onClick={() => setOutcomeFilter(null)}
              className={`h-7 px-2.5 rounded-lg text-xs transition-all border ${outcomeFilter === null ? "gradient-bg border-0 text-white" : "border-border/30 text-muted-foreground hover:text-foreground"}`}
            >
              すべて
            </button>
            {Object.entries(outcomeConfig).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setOutcomeFilter(key)}
                className={`h-7 px-2.5 rounded-lg text-xs transition-all border ${outcomeFilter === key ? `${cfg.bg} ${cfg.color} border-current/30` : "border-border/30 text-muted-foreground hover:text-foreground"}`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="border-border/40 bg-card/60">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                {["発着信番号", "プロジェクト", "方向", "結果", "AI解決", "通話時間", "開始時刻", "サマリー"].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((call) => {
                const outcome = outcomeConfig[call.outcome as string] ?? { label: call.outcome as string, color: "text-muted-foreground", bg: "" };
                return (
                  <tr key={call.id} className="border-b border-border/10 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/calls/${call.id}`} className="font-mono text-xs hover:text-primary transition-colors">
                        {call.direction === "inbound" ? call.caller_number : call.called_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{projectNames[call.project_id] ?? call.project_id}</td>
                    <td className="px-4 py-3">
                      {call.direction === "inbound"
                        ? <span className="flex items-center gap-1 text-xs text-blue-400"><PhoneIncoming className="w-3 h-3" />着信</span>
                        : <span className="flex items-center gap-1 text-xs text-violet-400"><PhoneOutgoing className="w-3 h-3" />発信</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${outcome.bg} ${outcome.color}`}>
                        {outcome.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {call.ai_resolved ? <span className="text-emerald-400">✓</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDuration(call.duration_seconds)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(call.started_at)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs">
                      <span className="line-clamp-1">{call.summary ?? "—"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border/20 text-xs text-muted-foreground">
          {filtered.length} 件表示 (全 {mockCallLogs.length} 件)
        </div>
      </Card>
    </div>
  );
}
