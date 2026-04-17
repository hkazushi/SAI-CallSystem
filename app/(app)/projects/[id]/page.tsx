"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockProjects, mockCallLogs } from "@/lib/mock-data";
import { Play, Pause, Settings, GitBranch, FileText, Calendar, Phone, Bot, Zap, PhoneIncoming, PhoneOutgoing, Wand2 } from "lucide-react";

const statusConfig = {
  active:    { label: "稼働中", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  paused:    { label: "一時停止", color: "text-amber-400", bg: "bg-amber-400/10" },
  draft:     { label: "下書き", color: "text-muted-foreground", bg: "bg-white/5" },
  completed: { label: "完了", color: "text-blue-400", bg: "bg-blue-400/10" },
};

const outcomeLabels: Record<string, { label: string; color: string }> = {
  completed: { label: "完了", color: "text-emerald-400" },
  answered:  { label: "応答", color: "text-blue-400" },
  no_answer: { label: "不在", color: "text-amber-400" },
  busy:      { label: "話中", color: "text-orange-400" },
  failed:    { label: "失敗", color: "text-red-400" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const project = mockProjects.find((p) => p.id === id) ?? mockProjects[0];
  const status = statusConfig[project.status];
  const recentCalls = mockCallLogs.filter((c) => c.project_id === project.id).slice(0, 10);

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <PageHeader title={project.name} description={project.description ?? undefined}>
        <Link href={`/projects/${project.id}/schedule`}>
          <Button variant="outline" size="sm" className="border-border/40 h-8 text-xs">
            <Calendar className="w-3.5 h-3.5 mr-1.5" />スケジュール
          </Button>
        </Link>
        <Link href={`/projects/${project.id}/content`}>
          <Button variant="outline" size="sm" className="border-border/40 h-8 text-xs">
            <FileText className="w-3.5 h-3.5 mr-1.5" />コール対応設定
          </Button>
        </Link>
        <Link href={`/projects/${project.id}/builder`}>
          <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/5 h-8 text-xs">
            <Wand2 className="w-3.5 h-3.5 mr-1.5" />AIビルダー
          </Button>
        </Link>
        <Link href={`/projects/${project.id}/flow`}>
          <Button variant="outline" size="sm" className="border-border/40 h-8 text-xs">
            <GitBranch className="w-3.5 h-3.5 mr-1.5" />フロー編集
          </Button>
        </Link>
        {project.status === "active" ? (
          <Button size="sm" className="bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 h-8 text-xs">
            <Pause className="w-3.5 h-3.5 mr-1.5" />一時停止
          </Button>
        ) : (
          <Button size="sm" className="gradient-bg border-0 hover:opacity-90 h-8 text-xs">
            <Play className="w-3.5 h-3.5 mr-1.5" />開始
          </Button>
        )}
      </PageHeader>

      {/* Info cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-border/40 bg-card/60">
          <p className="text-xs text-muted-foreground">ステータス</p>
          <div className={`inline-flex items-center gap-1.5 mt-2 px-2 py-1 rounded-lg ${status.bg}`}>
            <div className="w-1.5 h-1.5 rounded-full bg-current" />
            <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
          </div>
        </Card>
        <Card className="p-4 border-border/40 bg-card/60">
          <p className="text-xs text-muted-foreground">種別</p>
          <div className="flex items-center gap-1.5 mt-2">
            {project.direction === "inbound"
              ? <><PhoneIncoming className="w-4 h-4 text-blue-400" /><span className="text-sm font-medium">インバウンド</span></>
              : <><PhoneOutgoing className="w-4 h-4 text-violet-400" /><span className="text-sm font-medium">アウトバウンド</span></>
            }
          </div>
        </Card>
        <Card className="p-4 border-border/40 bg-card/60">
          <p className="text-xs text-muted-foreground">AIプロバイダー</p>
          <div className="flex items-center gap-1.5 mt-2">
            {project.ai_provider === "vapi"
              ? <><Zap className="w-4 h-4 text-amber-400" /><span className="text-sm font-medium">Vapi.ai</span></>
              : <><Bot className="w-4 h-4 text-blue-400" /><span className="text-sm font-medium">Dialogflow CX</span></>
            }
          </div>
        </Card>
        <Card className="p-4 border-border/40 bg-card/60">
          <p className="text-xs text-muted-foreground">総通話数</p>
          <p className="text-2xl font-bold mt-1">{project._stats.total_calls.toLocaleString()}</p>
        </Card>
      </div>

      {/* Stats */}
      {project._stats.total_calls > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "AI解決率", value: `${project._stats.ai_resolution_rate}%`, color: "text-violet-400" },
            { label: "成功率", value: `${project._stats.success_rate}%`, color: "text-emerald-400" },
            { label: "失敗率", value: `${100 - project._stats.success_rate - (100 - project._stats.ai_resolution_rate)}%`, color: "text-red-400" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="p-5 border-border/40 bg-card/60">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Product info */}
        <Card className="p-5 border-border/40 bg-card/60">
          <h3 className="font-semibold text-sm mb-4">商材・製品情報</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">製品名</p>
              <p className="mt-0.5 font-medium">{project.product_info.product_name}</p>
            </div>
            {project.product_info.pricing && (
              <div>
                <p className="text-xs text-muted-foreground">価格</p>
                <p className="mt-0.5">{project.product_info.pricing}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">特長</p>
              <ul className="mt-1.5 space-y-1">
                {project.product_info.key_features.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ターゲット顧客</p>
              <p className="mt-0.5 text-xs">{project.product_info.target_customer}</p>
            </div>
          </div>
        </Card>

        {/* Voice settings + first message */}
        <Card className="p-5 border-border/40 bg-card/60">
          <h3 className="font-semibold text-sm mb-4">音声設定</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">音声ID</p>
              <p className="mt-0.5 font-mono text-xs">{project.voice_settings.voice_id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">性別</p>
              <p className="mt-0.5">{project.voice_settings.gender === "female" ? "女性" : "男性"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">話速</p>
              <p className="mt-0.5">{project.voice_settings.speed}x</p>
            </div>
            <div className="pt-2 border-t border-border/20">
              <p className="text-xs text-muted-foreground mb-1.5">オープニングメッセージ</p>
              <p className="text-xs leading-relaxed bg-white/3 rounded-lg p-3 border border-border/20">
                {project.first_message}
              </p>
            </div>
          </div>
        </Card>

        {/* Quick links */}
        <Card className="p-5 border-border/40 bg-card/60">
          <h3 className="font-semibold text-sm mb-4">設定メニュー</h3>
          <div className="space-y-2">
            {[
              { href: `/projects/${project.id}/content`, icon: FileText, label: "コール対応設定", desc: "シナリオ・FAQ・エスカレーション" },
              { href: `/projects/${project.id}/builder`, icon: Wand2, label: "AIビルダー", desc: "設定をAIに構築・デプロイ" },
              { href: `/projects/${project.id}/flow`, icon: GitBranch, label: "トークフローエディタ", desc: "会話フローを視覚的に設計" },
              { href: `/projects/${project.id}/schedule`, icon: Calendar, label: "スケジュール設定", desc: "発信日時・リスト設定" },
            ].map(({ href, icon: Icon, label, desc }) => (
              <Link key={href} href={href}>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-border/20">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent calls */}
      {recentCalls.length > 0 && (
        <Card className="border-border/40 bg-card/60">
          <div className="p-5 border-b border-border/30">
            <h3 className="font-semibold text-sm">直近の通話ログ</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/20">
                  {["発着信番号", "方向", "結果", "通話時間", "日時"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentCalls.map((call) => {
                  const outcome = outcomeLabels[call.outcome as string] ?? { label: call.outcome as string, color: "text-muted-foreground" };
                  return (
                    <Link key={call.id} href={`/calls/${call.id}`} legacyBehavior>
                      <tr className="border-b border-border/10 hover:bg-white/2 cursor-pointer">
                        <td className="px-5 py-3 font-mono text-xs">{call.direction === "inbound" ? call.caller_number : call.called_number}</td>
                        <td className="px-5 py-3">
                          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 border-border/30 ${call.direction === "inbound" ? "text-blue-400" : "text-violet-400"}`}>
                            {call.direction === "inbound" ? "IB" : "OB"}
                          </Badge>
                        </td>
                        <td className={`px-5 py-3 text-xs font-medium ${outcome.color}`}>{outcome.label}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{call.duration_seconds}秒</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{formatDate(call.started_at)}</td>
                      </tr>
                    </Link>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
