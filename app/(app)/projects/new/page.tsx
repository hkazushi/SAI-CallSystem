"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight, ChevronLeft, CheckCircle2, Phone, Bot, Zap,
  PhoneIncoming, PhoneOutgoing, GitBranch, FileText, Calendar, Save,
} from "lucide-react";

const STEPS = ["基本情報", "AI選択", "フロー", "発話内容", "スケジュール", "確認"];

type Direction = "inbound" | "outbound";
type AIProvider = "vapi" | "dialogflow_cx";

export default function ProjectNewPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [direction, setDirection] = useState<Direction>("outbound");
  const [ai, setAI] = useState<AIProvider>("vapi");
  const [productName, setProductName] = useState("");
  const [pricing, setPricing] = useState("");
  const [firstMessage, setFirstMessage] = useState("");

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1200));
    router.push("/projects");
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <PageHeader title="新規プロジェクト作成" description="6ステップでAI電話プロジェクトを設定します" />

      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                i < step ? "text-emerald-400 cursor-pointer hover:bg-emerald-400/5" :
                i === step ? "text-primary bg-primary/10" :
                "text-muted-foreground"
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border shrink-0 ${
                i < step ? "bg-emerald-400 border-emerald-400 text-black" :
                i === step ? "border-primary text-primary" :
                "border-border/40"
              }`}>
                {i < step ? "✓" : i + 1}
              </div>
              {s}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-border/40 shrink-0" />}
          </div>
        ))}
      </div>

      {/* Step 0: 基本情報 */}
      {step === 0 && (
        <Card className="p-6 border-border/40 bg-card/60 space-y-5">
          <div className="space-y-2">
            <Label>プロジェクト名 <span className="text-red-400">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: クラウド会計ソフト アウトバウンド" className="bg-background/50 border-border/40 h-10" />
          </div>
          <div className="space-y-2">
            <Label>説明</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="プロジェクトの目的・内容" className="bg-background/50 border-border/40 h-10" />
          </div>
          <div className="space-y-2">
            <Label>発着信の方向 <span className="text-red-400">*</span></Label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: "outbound", icon: PhoneOutgoing, label: "アウトバウンド", desc: "リストに対して自動発信" },
                { value: "inbound", icon: PhoneIncoming, label: "インバウンド", desc: "着信を自動応答" },
              ] as const).map(({ value, icon: Icon, label, desc: d }) => (
                <button
                  key={value}
                  onClick={() => setDirection(value)}
                  className={`p-4 rounded-xl border text-left transition-all ${direction === value ? "border-primary/50 bg-primary/10" : "border-border/30 hover:border-border/60"}`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${direction === value ? "text-primary" : "text-muted-foreground"}`} />
                  <p className={`text-sm font-medium ${direction === value ? "text-primary" : ""}`}>{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{d}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="gradient-bg border-0 hover:opacity-90" disabled={!name} onClick={() => setStep(1)}>
              次へ <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 1: AI選択 */}
      {step === 1 && (
        <Card className="p-6 border-border/40 bg-card/60 space-y-5">
          <div className="space-y-3">
            <Label>AIプロバイダーを選択</Label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: "vapi", icon: Zap, label: "Vapi.ai", desc: "高品質な日本語音声AI。リアルタイム会話に最適。", color: "text-amber-400" },
                { value: "dialogflow_cx", icon: Bot, label: "Dialogflow CX", desc: "Google製エンタープライズ対話AI。複雑なフロー管理に強い。", color: "text-blue-400" },
              ] as const).map(({ value, icon: Icon, label, desc: d, color }) => (
                <button
                  key={value}
                  onClick={() => setAI(value)}
                  className={`p-5 rounded-xl border text-left transition-all ${ai === value ? "border-primary/50 bg-primary/10" : "border-border/30 hover:border-border/60"}`}
                >
                  <Icon className={`w-6 h-6 mb-3 ${ai === value ? "text-primary" : color}`} />
                  <p className={`font-semibold ${ai === value ? "text-primary" : ""}`}>{label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{d}</p>
                  {ai === value && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                      <CheckCircle2 className="w-3 h-3" />選択中
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" className="border-border/40" onClick={() => setStep(0)}>
              <ChevronLeft className="w-4 h-4 mr-1" />戻る
            </Button>
            <Button className="gradient-bg border-0 hover:opacity-90" onClick={() => setStep(2)}>
              次へ <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: フロー (simplified) */}
      {step === 2 && (
        <Card className="p-6 border-border/40 bg-card/60 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">トークフローエディタ</p>
              <p className="text-xs text-muted-foreground">プロジェクト作成後にフローエディタで詳細設定できます</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white/3 border border-border/20 text-sm text-muted-foreground leading-relaxed">
            テンプレートを選択するか、後からビジュアルエディタで会話フローを設計してください。フローはいつでも変更可能です。
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["シンプル案内", "FAQ対応", "アポ取得"].map((t) => (
              <button key={t} className="p-3 rounded-xl border border-border/30 hover:border-primary/30 hover:bg-primary/5 text-xs font-medium transition-all">
                {t}
              </button>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" className="border-border/40" onClick={() => setStep(1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />戻る
            </Button>
            <Button className="gradient-bg border-0 hover:opacity-90" onClick={() => setStep(3)}>
              次へ <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: 発話内容 */}
      {step === 3 && (
        <Card className="p-6 border-border/40 bg-card/60 space-y-5">
          <div className="space-y-2">
            <Label>製品・サービス名 <span className="text-red-400">*</span></Label>
            <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="例: クラウド会計ソフトA" className="bg-background/50 border-border/40 h-10" />
          </div>
          <div className="space-y-2">
            <Label>価格</Label>
            <Input value={pricing} onChange={(e) => setPricing(e.target.value)} placeholder="例: 月額3,000円〜" className="bg-background/50 border-border/40 h-10" />
          </div>
          <div className="space-y-2">
            <Label>オープニングメッセージ <span className="text-red-400">*</span></Label>
            <textarea
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              placeholder="AIが最初に発話するメッセージ..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-background/50 border border-border/40 text-sm resize-none focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex justify-between">
            <Button variant="outline" className="border-border/40" onClick={() => setStep(2)}>
              <ChevronLeft className="w-4 h-4 mr-1" />戻る
            </Button>
            <Button className="gradient-bg border-0 hover:opacity-90" disabled={!productName || !firstMessage} onClick={() => setStep(4)}>
              次へ <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: スケジュール */}
      {step === 4 && (
        <Card className="p-6 border-border/40 bg-card/60 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">スケジュール設定</p>
              <p className="text-xs text-muted-foreground">発信時間帯・リスト・間隔の設定</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">発信開始時刻</Label>
              <Input type="time" defaultValue="09:00" className="bg-background/50 border-border/40 h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">発信終了時刻</Label>
              <Input type="time" defaultValue="18:00" className="bg-background/50 border-border/40 h-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">発信間隔（秒）</Label>
            <Input type="number" defaultValue="30" min="5" className="bg-background/50 border-border/40 h-10" />
          </div>
          <p className="text-xs text-muted-foreground">詳細なスケジュール設定はプロジェクト作成後に変更できます。</p>
          <div className="flex justify-between">
            <Button variant="outline" className="border-border/40" onClick={() => setStep(3)}>
              <ChevronLeft className="w-4 h-4 mr-1" />戻る
            </Button>
            <Button className="gradient-bg border-0 hover:opacity-90" onClick={() => setStep(5)}>
              次へ <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 5: 確認 */}
      {step === 5 && (
        <Card className="p-6 border-border/40 bg-card/60 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <p className="font-semibold">設定内容の確認</p>
          </div>
          <div className="space-y-3 text-sm">
            {[
              { label: "プロジェクト名", value: name },
              { label: "方向", value: direction === "outbound" ? "アウトバウンド" : "インバウンド" },
              { label: "AIプロバイダー", value: ai === "vapi" ? "Vapi.ai" : "Dialogflow CX" },
              { label: "製品名", value: productName || "（未設定）" },
              { label: "価格", value: pricing || "（未設定）" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start justify-between gap-4 py-2.5 border-b border-border/20 last:border-0">
                <span className="text-muted-foreground shrink-0">{label}</span>
                <span className="font-medium text-right">{value}</span>
              </div>
            ))}
          </div>
          {firstMessage && (
            <div className="p-3 rounded-xl bg-white/3 border border-border/20 text-xs leading-relaxed text-muted-foreground">
              <span className="text-foreground font-medium">オープニング: </span>{firstMessage}
            </div>
          )}
          <div className="flex justify-between">
            <Button variant="outline" className="border-border/40" onClick={() => setStep(4)}>
              <ChevronLeft className="w-4 h-4 mr-1" />戻る
            </Button>
            <Button className="gradient-bg border-0 hover:opacity-90" disabled={saving} onClick={handleSave}>
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  作成中...
                </span>
              ) : (
                <><Save className="w-4 h-4 mr-1.5" />プロジェクトを作成</>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
