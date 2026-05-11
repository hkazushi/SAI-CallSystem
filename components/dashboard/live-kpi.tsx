"use client";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, CheckCircle2, Calendar, TrendingUp, Clock, RefreshCw } from "lucide-react";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";

interface Kpi {
  totalCalls: number;
  completedCalls: number;
  appointments: number;
  totalDurationSec: number;
  avgScore: number | null;
  avgDurationSec: number | null;
  connectRate: number | null;
  appointmentRate: number | null;
  costUsd: number;
  byHour: Array<{ hour: string; count: number }>;
  byOutcome: Array<{ label: string; count: number }>;
  bySentiment: Array<{ label: string; count: number }>;
}

const RANGES = [
  { value: "1d", label: "24時間" },
  { value: "7d", label: "7日" },
  { value: "30d", label: "30日" },
  { value: "90d", label: "90日" },
];

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#10b981",
  neutral:  "#94a3b8",
  negative: "#ef4444",
  未分類:    "#64748b",
};

export function LiveKpi() {
  const [range, setRange] = useState("7d");
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchKpi = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/dashboard?range=${range}`);
    const data = await res.json();
    if (data.ok) {
      setKpi(data.kpi);
      setLastFetched(new Date());
    }
    setLoading(false);
  }, [range]);

  useEffect(() => { fetchKpi(); }, [fetchKpi]);

  // 30秒オートリフレッシュ
  useEffect(() => {
    const id = setInterval(fetchKpi, 30000);
    return () => clearInterval(id);
  }, [fetchKpi]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              variant={range === r.value ? "default" : "outline"}
              size="sm"
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {lastFetched && <span>最終更新: {lastFetched.toLocaleTimeString("ja-JP")}</span>}
          <Button size="sm" variant="ghost" onClick={fetchKpi} disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {kpi && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard icon={Phone} label="通話数" value={kpi.totalCalls.toString()} sub={`${kpi.completedCalls}件完了`} />
            <KpiCard
              icon={CheckCircle2}
              label="接続率"
              value={kpi.connectRate !== null ? `${Math.round(kpi.connectRate * 100)}%` : "—"}
              sub={`${kpi.completedCalls}/${kpi.totalCalls}`}
              accent="emerald"
            />
            <KpiCard
              icon={Calendar}
              label="アポ獲得"
              value={kpi.appointments.toString()}
              sub={kpi.appointmentRate !== null ? `${Math.round(kpi.appointmentRate * 100)}% 獲得率` : "—"}
              accent="primary"
            />
            <KpiCard
              icon={TrendingUp}
              label="平均スコア"
              value={kpi.avgScore !== null ? `${Math.round(kpi.avgScore)}点` : "—"}
              sub={kpi.avgDurationSec !== null ? `平均 ${Math.round(kpi.avgDurationSec / 60)}分` : "—"}
              accent="amber"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />時間帯別 通話数
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={kpi.byHour}>
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "rgba(15,15,15,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    labelStyle={{ color: "#fafafa" }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-3">感情分析</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={kpi.bySentiment}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {kpi.bySentiment.map((entry) => (
                      <Cell key={entry.label} fill={SENTIMENT_COLORS[entry.label] ?? "#64748b"} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-3">結果別 内訳</h3>
            <div className="flex flex-wrap gap-2">
              {kpi.byOutcome.map((o) => (
                <Badge key={o.label} variant="outline" className="text-xs">
                  {o.label}: <span className="ml-1 font-semibold">{o.count}</span>
                </Badge>
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-4">
              累計コスト: <span className="font-semibold tabular-nums">${kpi.costUsd.toFixed(4)}</span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, accent = "default",
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  sub?: string;
  accent?: "default" | "primary" | "emerald" | "amber";
}) {
  const accentMap = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber:   "bg-amber-500/10 text-amber-400",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold mt-1">{value}</div>
          {sub && <div className="text-[10px] text-muted-foreground mt-1">{sub}</div>}
        </div>
        <div className={`p-2 rounded-lg ${accentMap[accent]}`}><Icon className="w-4 h-4" /></div>
      </div>
    </Card>
  );
}
