"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/ui/page-transition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, UserX, ShieldAlert, Users as UsersIcon } from "lucide-react";
import type { Contact } from "@/lib/supabase/types";

const consentBadge: Record<Contact["consent_status"], { label: string; cls: string }> = {
  opted_in:  { label: "同意済み",  cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  opted_out: { label: "拒否",      cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  revoked:   { label: "撤回",      cls: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  unknown:   { label: "未確認",    cls: "bg-muted text-muted-foreground border-border" },
};

export default function ContactsPage() {
  const [items, setItems] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDncOnly, setShowDncOnly] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (showDncOnly) params.set("dnc", "true");
    params.set("limit", "100");
    const res = await fetch(`/api/contacts?${params.toString()}`);
    const data = await res.json();
    if (data.ok) {
      setItems(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }, [q, showDncOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const dncCount = items.filter((c) => c.do_not_call).length;
  const optInCount = items.filter((c) => c.consent_status === "opted_in").length;

  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-[1400px]">
        <PageHeader title="顧客リスト" description="連絡先・同意状況・DNC（架電拒否）を一元管理" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><UsersIcon className="w-4 h-4 text-primary" /></div>
              <div>
                <div className="text-xs text-muted-foreground">総顧客数</div>
                <div className="text-2xl font-semibold">{total}</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10"><ShieldAlert className="w-4 h-4 text-emerald-400" /></div>
              <div>
                <div className="text-xs text-muted-foreground">同意済み（オプトイン）</div>
                <div className="text-2xl font-semibold">{optInCount}</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10"><UserX className="w-4 h-4 text-red-400" /></div>
              <div>
                <div className="text-xs text-muted-foreground">DNC（架電拒否）</div>
                <div className="text-2xl font-semibold">{dncCount}</div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="名前・会社・電話番号で検索" className="pl-9" />
            </div>
            <Button variant={showDncOnly ? "default" : "outline"} size="sm" onClick={() => setShowDncOnly((v) => !v)}>
              DNCのみ表示
            </Button>
            <Button size="sm" onClick={fetchData} disabled={loading}>{loading ? "読み込み中..." : "再読み込み"}</Button>
          </div>

          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-normal">名前</th>
                  <th className="py-2 pr-3 font-normal">会社</th>
                  <th className="py-2 pr-3 font-normal">電話番号</th>
                  <th className="py-2 pr-3 font-normal">タグ</th>
                  <th className="py-2 pr-3 font-normal">同意</th>
                  <th className="py-2 pr-3 font-normal">通話回数</th>
                  <th className="py-2 pr-3 font-normal">DNC</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">該当する顧客はありません</td></tr>
                )}
                {items.map((c) => {
                  const cb = consentBadge[c.consent_status];
                  return (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 pr-3 font-medium">{c.full_name ?? "（未設定）"}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{c.company ?? "—"}</td>
                      <td className="py-2 pr-3 tabular-nums">{c.phone_number ?? "—"}</td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-1">
                          {c.tags.map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 pr-3"><Badge className={cb.cls}>{cb.label}</Badge></td>
                      <td className="py-2 pr-3 tabular-nums">{c.total_calls}</td>
                      <td className="py-2 pr-3">
                        {c.do_not_call ? <Badge className="bg-red-500/15 text-red-400 border-red-500/30">拒否</Badge> : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
