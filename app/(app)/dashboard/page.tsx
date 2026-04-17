"use client";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";
import { mockDashboardKPI, mockCallTrend, mockCallLogs, mockProjects } from "@/lib/mock-data";
import { ArrowRight, Circle } from "lucide-react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}分${String(sec).padStart(2, "0")}秒`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const outcomeLabels: Record<string, { label: string; color: string; dot: string }> = {
  completed: { label: "完了", color: "text-emerald-400", dot: "bg-emerald-400" },
  answered:  { label: "応答", color: "text-blue-400", dot: "bg-blue-400" },
  no_answer: { label: "不在", color: "text-amber-400", dot: "bg-amber-400" },
  busy:      { label: "話中", color: "text-orange-400", dot: "bg-orange-400" },
  failed:    { label: "失敗", color: "text-red-400", dot: "bg-red-400" },
};

const projectName: Record<string, string> = {
  "proj-001": "クラウド会計 OB",
  "proj-002": "CSサポート IB",
  "proj-003": "保険フォロー OB",
  "proj-005": "太陽光 OB",
};

export default function DashboardPage() {
  const kpi = mockDashboardKPI;
  const recentCalls = mockCallLogs.slice(0, 8);
  const activeProjects = mockProjects.filter((p) => p.status === "active");

  return (
    <PageTransition>
      <div className="p-6 space-y-7 max-w-[1400px]">
        <PageHeader
          title="ダッシュボード"
          description="今月の通話実績とアクティブプロジェクトの状況"
        />

        {/* KPI Cards */}
        <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StaggerItem>
            <StatCard
              title="今月の総通話数"
              value={`${kpi.total_calls.toLocaleString()}件`}
              change={kpi.total_calls_change}
              changeLabel="先月比"
              accentColor="bg-primary"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              title="平均通話時間"
              value={formatDuration(kpi.avg_duration_seconds)}
              change={kpi.avg_duration_change}
              changeLabel="先月比"
              accentColor="bg-blue-400"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              title="AI 解決率"
              value={`${kpi.ai_resolution_rate}%`}
              change={kpi.ai_resolution_change}
              changeLabel="先月比"
              accentColor="bg-violet-400"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              title="稼働 / 全プロジェクト"
              value={`${kpi.active_projects} / ${kpi.total_projects}`}
              accentColor="bg-emerald-400"
            />
          </StaggerItem>
        </StaggerContainer>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Call Trend Chart */}
          <div className="lg:col-span-2 rounded-xl border border-white/6 bg-card/40 p-5">
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="text-[10px] tracking-[0.13em] uppercase text-muted-foreground/50 font-medium">通話トレンド</p>
                <p className="text-sm font-semibold mt-0.5">過去7日間</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={mockCallTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.6 0.22 264)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="oklch(0.6 0.22 264)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="oklch(1 0 0 / 4%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.50 0 0)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.50 0 0)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.13 0 0)", border: "1px solid oklch(1 0 0 / 7%)", borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: "oklch(0.80 0 0)" }}
                />
                <Area type="monotone" dataKey="calls" name="総通話数" stroke="oklch(0.6 0.22 264)" strokeWidth={1.5} fill="url(#gradCalls)" dot={false} />
                <Area type="monotone" dataKey="resolved" name="AI解決" stroke="#34d399" strokeWidth={1.5} fill="url(#gradResolved)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Active Projects */}
          <div className="rounded-xl border border-white/6 bg-card/40 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] tracking-[0.13em] uppercase text-muted-foreground/50 font-medium">稼働中</p>
                <p className="text-sm font-semibold mt-0.5">プロジェクト</p>
              </div>
              <Link href="/projects">
                <Button variant="ghost" size="sm" className="text-[11px] text-muted-foreground/50 hover:text-foreground h-7 px-2 gap-1">
                  すべて <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {activeProjects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <div className="group flex items-start gap-3 p-3 rounded-lg border border-transparent hover:border-white/7 hover:bg-white/3 transition-all cursor-pointer">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate group-hover:text-white transition-colors">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground/45">{p.ai_provider === "vapi" ? "Vapi.ai" : "Dialogflow"}</span>
                        <span className="text-[10px] text-muted-foreground/45">·</span>
                        <span className="text-[10px] text-muted-foreground/45 num">{p._stats.total_calls.toLocaleString()}件</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-400/80 shrink-0 num mt-0.5">{p._stats.ai_resolution_rate}%</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Calls */}
        <div className="rounded-xl border border-white/6 bg-card/40 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] tracking-[0.13em] uppercase text-muted-foreground/50 font-medium">最新</p>
                <p className="text-sm font-semibold leading-tight">通話ログ</p>
              </div>
            </div>
            <Link href="/calls">
              <Button variant="ghost" size="sm" className="text-[11px] text-muted-foreground/50 hover:text-foreground h-7 px-2 gap-1">
                すべて <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/4">
                <th className="text-left text-[10px] font-medium text-muted-foreground/40 tracking-wider px-5 py-2.5">番号</th>
                <th className="text-left text-[10px] font-medium text-muted-foreground/40 tracking-wider px-3 py-2.5">プロジェクト</th>
                <th className="text-left text-[10px] font-medium text-muted-foreground/40 tracking-wider px-3 py-2.5">方向</th>
                <th className="text-left text-[10px] font-medium text-muted-foreground/40 tracking-wider px-3 py-2.5">結果</th>
                <th className="text-left text-[10px] font-medium text-muted-foreground/40 tracking-wider px-3 py-2.5">時間</th>
                <th className="text-left text-[10px] font-medium text-muted-foreground/40 tracking-wider px-3 py-2.5">日時</th>
              </tr>
            </thead>
            <tbody>
              {recentCalls.map((call) => {
                const outcome = outcomeLabels[call.outcome as string] ?? { label: call.outcome as string, color: "text-muted-foreground", dot: "bg-muted-foreground" };
                return (
                  <tr key={call.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 font-mono text-[11px] text-muted-foreground/70">{call.direction === "inbound" ? call.caller_number : call.called_number}</td>
                    <td className="px-3 py-3 text-[12px] text-muted-foreground/55">{projectName[call.project_id] ?? call.project_id}</td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-semibold tracking-wide ${call.direction === "inbound" ? "text-blue-400/70" : "text-violet-400/70"}`}>
                        {call.direction === "inbound" ? "IB" : "OB"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`flex items-center gap-1.5 text-[12px] font-medium ${outcome.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${outcome.dot}`} />
                        {outcome.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[12px] text-muted-foreground/50 num">{call.duration_seconds}s</td>
                    <td className="px-3 py-3 text-[11px] text-muted-foreground/40 num">{formatDate(call.started_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PageTransition>
  );
}
