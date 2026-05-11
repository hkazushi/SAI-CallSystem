"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/ui/page-transition";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlaskConical, Trophy, TrendingUp, Plus } from "lucide-react";
import type { Experiment, ExperimentArm } from "@/lib/data/experiments";

type ExpWithArms = Experiment & { arms: ExperimentArm[] };

const statusBadge: Record<Experiment["status"], { label: string; cls: string }> = {
  draft:     { label: "下書き",   cls: "bg-muted text-muted-foreground border-border" },
  running:   { label: "実行中",   cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  paused:    { label: "一時停止", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  completed: { label: "完了",     cls: "bg-primary/15 text-primary border-primary/30" },
  archived:  { label: "アーカイブ", cls: "bg-muted text-muted-foreground border-border" },
};

const METRIC_LABEL: Record<string, string> = {
  appointment_rate: "アポ獲得率",
  completion_rate: "完了率",
  avg_duration_seconds: "平均通話時間",
  positive_sentiment_rate: "ポジティブ反応率",
};

// 95%信頼区間（Wilson score）を簡易計算
function wilsonInterval(success: number, total: number): { lower: number; upper: number; rate: number } {
  if (!total) return { lower: 0, upper: 0, rate: 0 };
  const p = success / total;
  const z = 1.96;
  const n = total;
  const center = (p + (z * z) / (2 * n)) / (1 + (z * z) / n);
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / (1 + (z * z) / n);
  return { lower: Math.max(0, center - margin), upper: Math.min(1, center + margin), rate: p };
}

export default function ExperimentsPage() {
  const [items, setItems] = useState<ExpWithArms[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/experiments");
    const data = await res.json();
    if (data.ok) setItems(data.items);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-[1400px]">
        <PageHeader
          title="A/B テスト"
          description="プロンプト・オープニング・音声を比較して、最適なバリエーションをデータで決定する。"
        >
          <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />新規実験</Button>
        </PageHeader>

        {loading && <Card className="p-6 text-center text-muted-foreground">読み込み中...</Card>}
        {!loading && items.length === 0 && (
          <Card className="p-10 text-center space-y-2">
            <FlaskConical className="w-8 h-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">実験はまだありません</p>
            <p className="text-xs text-muted-foreground/70">「新規実験」から最初の A/B テストを作成しましょう</p>
          </Card>
        )}

        <div className="space-y-5">
          {items.map((exp) => {
            // 勝率の比較用に各アームの95%信頼区間を計算
            const armResults = exp.arms.map((a) => ({
              arm: a,
              wilson: wilsonInterval(a.total_success, a.total_completed),
            }));
            const best = armResults.reduce((b, r) => (r.wilson.rate > b.wilson.rate ? r : b), armResults[0]);
            const isControl = best?.arm.is_control ?? false;

            return (
              <Card key={exp.id} className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge className={statusBadge[exp.status].cls}>{statusBadge[exp.status].label}</Badge>
                      <Badge variant="outline" className="text-[10px]">
                        主指標: {METRIC_LABEL[exp.primary_metric] ?? exp.primary_metric}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-base">{exp.name}</h3>
                    {exp.hypothesis && (
                      <p className="text-xs text-muted-foreground mt-1">仮説: {exp.hypothesis}</p>
                    )}
                  </div>
                  {exp.winner_arm_id && (
                    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">
                      <Trophy className="w-3 h-3 mr-1" />勝者確定
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {armResults.map(({ arm, wilson }) => {
                    const isBest = arm.id === best?.arm.id && exp.arms.length > 1;
                    return (
                      <div
                        key={arm.id}
                        className={`p-4 rounded-lg border ${
                          isBest
                            ? "bg-emerald-500/5 border-emerald-500/30"
                            : "bg-muted/20 border-border/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{arm.name}</span>
                            {arm.is_control && (
                              <Badge variant="outline" className="text-[9px]">対照</Badge>
                            )}
                            {isBest && (
                              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px]">
                                <TrendingUp className="w-2.5 h-2.5 mr-0.5" />リード
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            割当 {(arm.allocation_weight * 100).toFixed(0)}%
                          </span>
                        </div>
                        {arm.description && (
                          <p className="text-xs text-muted-foreground mb-3">{arm.description}</p>
                        )}
                        {arm.first_message_override && (
                          <div className="text-[11px] bg-background/50 border border-border/50 rounded p-2 mb-3 leading-relaxed">
                            <span className="text-muted-foreground">冒頭: </span>{arm.first_message_override}
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40">
                          <div>
                            <div className="text-[10px] text-muted-foreground">配信</div>
                            <div className="text-sm font-semibold tabular-nums">{arm.total_assigned}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground">完了</div>
                            <div className="text-sm font-semibold tabular-nums">{arm.total_completed}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground">成功</div>
                            <div className="text-sm font-semibold tabular-nums text-emerald-400">
                              {arm.total_success}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-t border-border/40">
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="text-[10px] text-muted-foreground">主指標 ({METRIC_LABEL[exp.primary_metric] ?? exp.primary_metric})</span>
                            <span className="text-lg font-bold tabular-nums">
                              {(wilson.rate * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground tabular-nums">
                            95% 信頼区間: {(wilson.lower * 100).toFixed(1)}% 〜 {(wilson.upper * 100).toFixed(1)}%
                          </div>
                          {/* バー */}
                          <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                isBest ? "bg-emerald-400" : "bg-primary/70"
                              }`}
                              style={{ width: `${Math.min(100, wilson.rate * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 統計的有意性の簡易判定 */}
                {exp.arms.length === 2 && armResults.length === 2 && (() => {
                  const a = armResults[0].wilson;
                  const b = armResults[1].wilson;
                  const overlap = !(a.upper < b.lower || b.upper < a.lower);
                  return (
                    <div className={`p-3 rounded-lg text-xs ${
                      overlap
                        ? "bg-amber-500/10 border border-amber-500/30 text-amber-200"
                        : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-200"
                    }`}>
                      {overlap
                        ? "📊 信頼区間が重なっています — まだ統計的に有意な差は出ていません。サンプルを増やしましょう。"
                        : "✨ 信頼区間が分離しています — 統計的に有意な差が確認できます（95%水準）。"}
                    </div>
                  );
                })()}
              </Card>
            );
          })}
        </div>
      </div>
    </PageTransition>
  );
}
