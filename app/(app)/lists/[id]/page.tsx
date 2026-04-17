"use client";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { mockLists } from "@/lib/mock-data";
import { Download, Trash2, CheckCircle2, XCircle, Clock, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const CONTACTS = Array.from({ length: 20 }, (_, i) => ({
  id: `contact-${String(i + 1).padStart(4, "0")}`,
  name: ["田中 太郎", "山田 花子", "鈴木 一郎", "佐藤 美咲", "高橋 健太", "渡辺 洋子", "伊藤 浩二", "中村 由美"][i % 8],
  company: ["株式会社ABC", "山田商事", "鈴木工業", "佐藤産業", "高橋物産", "渡辺製作所", "伊藤食品", "中村ハウス"][i % 8],
  phone: `0${String(3 + (i % 8))}-${String(1000 + i * 37)}-${String(4000 + i * 73)}`,
  status: ["pending", "completed", "failed", "pending", "pending", "completed", "pending", "no_answer"][i % 8] as string,
}));

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: "未対応", color: "text-muted-foreground" },
  completed: { label: "完了", color: "text-emerald-400" },
  failed:    { label: "失敗", color: "text-red-400" },
  no_answer: { label: "不在", color: "text-amber-400" },
};

export default function ListDetailPage() {
  const { id } = useParams();
  const list = mockLists.find((l) => l.id === id) ?? mockLists[0];
  const [search, setSearch] = useState("");

  const filtered = CONTACTS.filter(
    (c) =>
      c.name.includes(search) ||
      c.company.includes(search) ||
      c.phone.includes(search)
  );
  const progress = list.total_count > 0 ? Math.round((list._completed / list.total_count) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <PageHeader title={list.name} description={list.description ?? undefined}>
        <Button variant="outline" size="sm" className="border-border/40 h-8 text-xs">
          <Download className="w-3.5 h-3.5 mr-1.5" />エクスポート
        </Button>
        <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 text-xs">
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />削除
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "総件数", value: list.total_count.toLocaleString(), icon: null, color: "text-foreground" },
          { label: "完了", value: list._completed.toLocaleString(), icon: CheckCircle2, color: "text-emerald-400" },
          { label: "未対応", value: list._pending.toLocaleString(), icon: Clock, color: "text-muted-foreground" },
          { label: "失敗", value: list._failed.toLocaleString(), icon: XCircle, color: "text-red-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-4 border-border/40 bg-card/60">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Progress */}
      <Card className="p-4 border-border/40 bg-card/60">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>発信進捗</span>
          <span>{progress}% 完了</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full gradient-bg rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </Card>

      {/* Contacts Table */}
      <Card className="border-border/40 bg-card/60">
        <div className="flex items-center gap-3 p-4 border-b border-border/30">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="名前・会社・電話番号で検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 bg-background/50 border-border/40 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" className="border-border/40 h-8 text-xs">
            <Filter className="w-3.5 h-3.5 mr-1.5" />フィルター
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/20">
                {["氏名", "会社名", "電話番号", "ステータス"].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-muted-foreground px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const s = statusConfig[c.status] ?? { label: c.status, color: "text-muted-foreground" };
                return (
                  <tr key={c.id} className="border-b border-border/10 hover:bg-white/2">
                    <td className="px-5 py-3 font-medium text-sm">{c.name}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{c.company}</td>
                    <td className="px-5 py-3 font-mono text-xs">{c.phone}</td>
                    <td className={`px-5 py-3 text-xs font-medium ${s.color}`}>{s.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border/20 text-xs text-muted-foreground">
          {filtered.length} 件表示 (全 {list.total_count.toLocaleString()} 件)
        </div>
      </Card>
    </div>
  );
}
