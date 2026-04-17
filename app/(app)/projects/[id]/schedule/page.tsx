"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockProjects, mockLists } from "@/lib/mock-data";
import { Save, ChevronLeft, Calendar, Clock, List, AlertCircle, CheckCircle2 } from "lucide-react";

const DAYS = ["月", "火", "水", "木", "金", "土", "日"];

export default function SchedulePage() {
  const { id } = useParams();
  const project = mockProjects.find((p) => p.id === id) ?? mockProjects[0];
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [selectedList, setSelectedList] = useState(mockLists[0].id);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [activeDays, setActiveDays] = useState([0, 1, 2, 3, 4]); // Mon-Fri
  const [interval, setInterval] = useState(30);
  const [maxRetry, setMaxRetry] = useState(2);
  const [retryDelay, setRetryDelay] = useState(3600);
  const [concurrent, setConcurrent] = useState(5);

  const selectedListData = mockLists.find((l) => l.id === selectedList);

  function toggleDay(i: number) {
    setActiveDays(
      activeDays.includes(i) ? activeDays.filter((d) => d !== i) : [...activeDays, i].sort()
    );
  }

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <Link href={`/projects/${id}`}>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" />プロジェクト
          </Button>
        </Link>
      </div>
      <PageHeader title="スケジュール設定" description="自動発信のスケジュールとターゲットリストを設定します">
        <Button
          size="sm"
          className={`h-8 text-xs ${saved ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "gradient-bg border-0 hover:opacity-90"}`}
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />保存中
            </span>
          ) : saved ? "保存済み ✓" : <><Save className="w-3.5 h-3.5 mr-1.5" />保存</>}
        </Button>
      </PageHeader>

      {project.direction === "inbound" && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-400/5 border border-blue-400/20 text-xs text-blue-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          インバウンドプロジェクトはスケジュール設定が不要です。着信を常時受け付けます。
        </div>
      )}

      {/* ターゲットリスト選択 */}
      <Card className="p-5 border-border/40 bg-card/60 space-y-4">
        <div className="flex items-center gap-2">
          <List className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">ターゲットリスト</h3>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">発信先リストを選択</Label>
          <div className="space-y-2">
            {mockLists.map((list) => (
              <button
                key={list.id}
                onClick={() => setSelectedList(list.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedList === list.id ? "border-primary/40 bg-primary/5" : "border-border/20 hover:border-border/40"}`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedList === list.id ? "border-primary" : "border-border/40"}`}>
                  {selectedList === list.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{list.name}</p>
                  <p className="text-xs text-muted-foreground">{list.total_count.toLocaleString()} 件 · 未対応 {list._pending.toLocaleString()} 件</p>
                </div>
                {selectedList === list.id && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </div>
        {selectedListData && (
          <div className="p-3 rounded-xl bg-white/3 border border-border/20 text-xs">
            <p className="text-muted-foreground">選択中: <span className="text-foreground font-medium">{selectedListData.name}</span></p>
            <p className="text-muted-foreground mt-0.5">未対応件数: <span className="text-foreground font-medium">{selectedListData._pending.toLocaleString()} 件</span></p>
          </div>
        )}
      </Card>

      {/* 発信時間帯 */}
      <Card className="p-5 border-border/40 bg-card/60 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">発信時間帯</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">開始時刻</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-background/50 border-border/40 h-9 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">終了時刻</Label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-background/50 border-border/40 h-9 text-sm" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">発信曜日</Label>
          <div className="flex gap-2">
            {DAYS.map((day, i) => (
              <button
                key={day}
                onClick={() => toggleDay(i)}
                className={`w-9 h-9 rounded-lg text-xs font-medium transition-all border ${activeDays.includes(i) ? "gradient-bg border-0 text-white" : "border-border/30 text-muted-foreground hover:border-border/60"}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* 発信設定 */}
      <Card className="p-5 border-border/40 bg-card/60 space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">発信設定</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">発信間隔（秒）</Label>
            <Input type="number" min="5" value={interval} onChange={(e) => setInterval(Number(e.target.value))} className="bg-background/50 border-border/40 h-9 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">同時発信数</Label>
            <Input type="number" min="1" max="50" value={concurrent} onChange={(e) => setConcurrent(Number(e.target.value))} className="bg-background/50 border-border/40 h-9 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">最大リトライ回数</Label>
            <Input type="number" min="0" max="5" value={maxRetry} onChange={(e) => setMaxRetry(Number(e.target.value))} className="bg-background/50 border-border/40 h-9 text-sm" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">リトライ間隔（秒）</Label>
          <Input type="number" min="300" value={retryDelay} onChange={(e) => setRetryDelay(Number(e.target.value))} className="bg-background/50 border-border/40 h-9 text-sm" />
          <p className="text-xs text-muted-foreground">{Math.round(retryDelay / 3600 * 10) / 10} 時間後にリトライ</p>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-4 border-border/40 bg-amber-400/5 border-amber-400/20">
        <p className="text-xs font-medium text-amber-400 mb-2">発信スケジュール概要</p>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>• 発信時間: <span className="text-foreground">{startTime} 〜 {endTime}</span></p>
          <p>• 曜日: <span className="text-foreground">{activeDays.map((d) => DAYS[d]).join("・")}</span></p>
          <p>• 間隔 {interval}秒 · 同時 {concurrent}件 → 最大 <span className="text-foreground">{Math.floor(3600 / interval) * concurrent} 件/時</span></p>
        </div>
      </Card>
    </div>
  );
}
