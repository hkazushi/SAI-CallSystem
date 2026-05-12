"use client";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Download, Phone } from "lucide-react";

const outcomeConfig: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: "完了", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  answered:  { label: "応答", color: "text-blue-400", bg: "bg-blue-400/10" },
  no_answer: { label: "不在", color: "text-amber-400", bg: "bg-amber-400/10" },
  busy:      { label: "話中", color: "text-orange-400", bg: "bg-orange-400/10" },
  failed:    { label: "失敗", color: "text-red-400", bg: "bg-red-400/10" },
};

export default function CallsPage() {
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<string | null>(null);
  const [dirFilter, setDirFilter] = useState<string | null>(null);

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
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground/40">
                    <Phone className="w-10 h-10" />
                    <p className="text-sm">まだ通話ログはありません。Twilioを接続すると、着信・発信の履歴がここに表示されます。</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border/20 text-xs text-muted-foreground">
          0 件表示
        </div>
      </Card>
    </div>
  );
}
