"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/ui/page-transition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ShieldCheck, AlertCircle } from "lucide-react";
import type { AuditLog } from "@/lib/supabase/types";

const statusBadge: Record<AuditLog["status"], string> = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failure: "bg-red-500/15 text-red-400 border-red-500/30",
  denied:  "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/audit-logs?limit=200");
    const data = await res.json();
    if (data.ok) setItems(data.items);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = items.filter((row) => {
    if (!filter) return true;
    const s = filter.toLowerCase();
    return (
      row.action.toLowerCase().includes(s) ||
      (row.actor_email ?? "").toLowerCase().includes(s) ||
      (row.resource_label ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-[1400px]">
        <PageHeader title="監査ログ" description="組織内のすべての操作・アクセスログ。改ざん不能・INSERT専用。" />

        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="アクション・ユーザー・リソースで絞り込み" className="pl-9" />
            </div>
            <Badge variant="outline" className="text-xs">
              <ShieldCheck className="w-3 h-3 mr-1" />
              {filtered.length} / {items.length} 件
            </Badge>
            <Button size="sm" onClick={fetchData} disabled={loading}>{loading ? "..." : "更新"}</Button>
          </div>

          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-normal whitespace-nowrap">日時</th>
                  <th className="py-2 pr-3 font-normal">実行者</th>
                  <th className="py-2 pr-3 font-normal">アクション</th>
                  <th className="py-2 pr-3 font-normal">リソース</th>
                  <th className="py-2 pr-3 font-normal">状態</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">該当するログはありません</td></tr>
                )}
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 pr-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">{formatDate(row.recorded_at)}</td>
                    <td className="py-2 pr-3">
                      <div className="text-xs">{row.actor_email ?? "(system)"}</div>
                      {row.actor_role && <Badge variant="outline" className="text-[9px] mt-0.5">{row.actor_role}</Badge>}
                    </td>
                    <td className="py-2 pr-3">
                      <code className="text-xs bg-muted/40 px-1.5 py-0.5 rounded">{row.action}</code>
                    </td>
                    <td className="py-2 pr-3">
                      {row.resource_label ? (
                        <div>
                          <div className="text-xs">{row.resource_label}</div>
                          {row.resource_type && <div className="text-[10px] text-muted-foreground">{row.resource_type}</div>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge className={statusBadge[row.status]}>
                        {row.status === "failure" || row.status === "denied" ? <AlertCircle className="w-3 h-3 mr-1" /> : null}
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
