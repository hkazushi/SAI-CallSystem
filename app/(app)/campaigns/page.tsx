"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/ui/page-transition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, CheckCircle2, Clock, Plus } from "lucide-react";
import type { Campaign } from "@/lib/supabase/types";

const statusBadge: Record<Campaign["status"], { label: string; cls: string; icon: typeof Play }> = {
  draft:     { label: "下書き",   cls: "bg-muted text-muted-foreground border-border", icon: Clock },
  scheduled: { label: "予約中",   cls: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: Clock },
  running:   { label: "実行中",   cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: Play },
  paused:    { label: "一時停止", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Pause },
  completed: { label: "完了",     cls: "bg-primary/15 text-primary border-primary/30", icon: CheckCircle2 },
  archived:  { label: "アーカイブ", cls: "bg-muted text-muted-foreground border-border", icon: Clock },
  failed:    { label: "失敗",     cls: "bg-red-500/15 text-red-400 border-red-500/30", icon: Clock },
};

export default function CampaignsPage() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/campaigns?limit=100");
    const data = await res.json();
    if (data.ok) setItems(data.items);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (id: string, status: Campaign["status"]) => {
    await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-[1400px]">
        <PageHeader
          title="キャンペーン"
          description="アウトバウンド・インバウンドの一括架電キャンペーンを管理"
        >
          <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />新規キャンペーン</Button>
        </PageHeader>

        {loading && <Card className="p-6 text-center text-muted-foreground">読み込み中...</Card>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((c) => {
            const sb = statusBadge[c.status];
            const Icon = sb.icon;
            const connectRate = c.total_dialed ? Math.round((c.total_connected / c.total_dialed) * 100) : 0;
            const successRate = c.total_connected ? Math.round((c.total_success / c.total_connected) * 100) : 0;
            return (
              <Card key={c.id} className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={sb.cls}>
                        <Icon className="w-3 h-3 mr-1" />
                        {sb.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {c.direction === "outbound" ? "アウトバウンド" : "インバウンド"}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-base truncate">{c.name}</h3>
                    {c.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                  <div>
                    <div className="text-[10px] text-muted-foreground">対象</div>
                    <div className="text-lg font-semibold tabular-nums">{c.total_targets}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">接続率</div>
                    <div className="text-lg font-semibold tabular-nums">{connectRate}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">成功率</div>
                    <div className="text-lg font-semibold tabular-nums">{successRate}%</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-border/50">
                  {c.status === "draft" || c.status === "scheduled" || c.status === "paused" ? (
                    <Button size="sm" onClick={() => updateStatus(c.id, "running")}>
                      <Play className="w-3 h-3 mr-1" />開始
                    </Button>
                  ) : null}
                  {c.status === "running" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "paused")}>
                      <Pause className="w-3 h-3 mr-1" />一時停止
                    </Button>
                  )}
                  {(c.status === "running" || c.status === "paused") && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "completed")}>
                      <CheckCircle2 className="w-3 h-3 mr-1" />完了
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </PageTransition>
  );
}
