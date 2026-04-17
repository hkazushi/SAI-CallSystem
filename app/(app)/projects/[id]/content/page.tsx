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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageTransition } from "@/components/ui/page-transition";
import { mockProjects } from "@/lib/mock-data";
import {
  DEFAULT_SCENARIOS, DEFAULT_ESCALATIONS,
  type ScenarioRule, type EscalationRule,
} from "@/lib/ai-builder";
import {
  Save, ChevronLeft, Plus, Trash2, Volume2, Bot, Zap,
  ArrowRight, GitBranch, AlertCircle, CheckCircle2, Phone,
  MessageSquare, ChevronDown, ChevronUp, Wand2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  continue:            { label: "会話を続ける", color: "text-blue-400" },
  propose_appointment: { label: "アポを提案", color: "text-emerald-400" },
  transfer:            { label: "有人転送", color: "text-amber-400" },
  end_success:         { label: "成功終話", color: "text-emerald-400" },
  end_fail:            { label: "終話", color: "text-muted-foreground" },
};

const ESCALATION_ACTIONS = [
  { value: "transfer", label: "有人転送" },
  { value: "callback", label: "折り返し約束" },
  { value: "end",      label: "通話終了" },
];

export default function ContentPage() {
  const { id } = useParams();
  const project = mockProjects.find((p) => p.id === id) ?? mockProjects[0];
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── 基本設定 ─────────────────────────────────────────────────────────────
  const [agentName, setAgentName] = useState("田中");
  const [companyName, setCompanyName] = useState("株式会社サンプル");
  const [speakingStyle, setSpeakingStyle] = useState<"polite" | "casual" | "formal">("polite");
  const [maxDuration, setMaxDuration] = useState(180);
  const [successCondition, setSuccessCondition] = useState("アポイントメントの取得または資料送付への同意");

  // ── 商材設定 ─────────────────────────────────────────────────────────────
  const [productName, setProductName] = useState(project.product_info.product_name);
  const [pricing, setPricing] = useState(project.product_info.pricing);
  const [targetCustomer, setTargetCustomer] = useState(project.product_info.target_customer);
  const [features, setFeatures] = useState(project.product_info.key_features);
  const [firstMessage, setFirstMessage] = useState(project.first_message);

  // ── シナリオ ──────────────────────────────────────────────────────────────
  const [scenarios, setScenarios] = useState<ScenarioRule[]>(DEFAULT_SCENARIOS);
  const [expandedScenario, setExpandedScenario] = useState<string | null>("s1");

  // ── FAQ ───────────────────────────────────────────────────────────────────
  const [faqs, setFaqs] = useState([
    { q: "料金はいくらですか？", a: `${pricing}でご利用いただけます。` },
    { q: "無料試用期間はありますか？", a: "14日間の無料トライアルをご用意しています。" },
    { q: "解約はいつでもできますか？", a: "はい、いつでも解約可能です。" },
    { q: "サポートはありますか？", a: "メール・チャット・電話でのサポートを提供しています。" },
  ]);

  // ── エスカレーション ───────────────────────────────────────────────────────
  const [escalations, setEscalations] = useState<EscalationRule[]>(DEFAULT_ESCALATIONS);

  // ── 音声設定 ──────────────────────────────────────────────────────────────
  const [voiceId, setVoiceId] = useState(project.voice_settings.voice_id);
  const [speed, setSpeed] = useState(project.voice_settings.speed);
  const [gender, setGender] = useState(project.voice_settings.gender);

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addScenario() {
    const newId = `s${Date.now()}`;
    setScenarios([...scenarios, {
      id: newId,
      trigger: "",
      triggerKeywords: [],
      response: "",
      action: "continue",
      actionLabel: "会話を続ける",
    }]);
    setExpandedScenario(newId);
  }

  function addEscalation() {
    setEscalations([...escalations, {
      id: `e${Date.now()}`,
      condition: "",
      keywords: [],
      action: "transfer",
      transferNumber: "",
      message: "",
    }]);
  }

  return (
    <PageTransition>
      <div className="p-6 max-w-4xl space-y-5">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${id}`}>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4 mr-1" />プロジェクト
            </Button>
          </Link>
        </div>

        <div className="flex items-start justify-between gap-4">
          <PageHeader
            title="コール対応設定"
            description="AIエージェントの詳細な対応方法を設定します"
          />
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/projects/${id}/builder`}>
              <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/5 h-8 text-xs">
                <Wand2 className="w-3.5 h-3.5 mr-1.5" />AIに構築させる
              </Button>
            </Link>
            <Button
              size="sm"
              className={`h-8 text-xs ${saved ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "gradient-bg border-0 hover:opacity-90"}`}
              disabled={saving}
              onClick={handleSave}
            >
              {saving
                ? <span className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />保存中</span>
                : saved ? "保存済み ✓"
                : <><Save className="w-3.5 h-3.5 mr-1.5" />保存</>
              }
            </Button>
          </div>
        </div>

        <Tabs defaultValue="basic">
          <TabsList variant="line" className="w-full justify-start border-b border-border/30 rounded-none pb-0 h-auto gap-0">
            {[
              { value: "basic",      label: "基本設定" },
              { value: "product",    label: "商材・発話" },
              { value: "scenarios",  label: `シナリオ (${scenarios.length})` },
              { value: "faq",        label: `FAQ (${faqs.length})` },
              { value: "escalation", label: "エスカレーション" },
              { value: "voice",      label: "音声設定" },
            ].map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="px-4 py-2.5 text-sm rounded-none border-b-2 border-transparent data-[selected]:border-primary data-[selected]:text-primary text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── 基本設定 ─────────────────────────────────────────── */}
          <TabsContent value="basic" className="mt-5 space-y-4">
            <Card className="p-5 border-border/40 bg-card/60 space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">AIエージェント</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">エージェント名（自己紹介で使用）</Label>
                  <Input value={agentName} onChange={(e) => setAgentName(e.target.value)}
                    placeholder="例: 田中、鈴木" className="bg-background/50 border-border/40 h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">会社名</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-background/50 border-border/40 h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">話し方のスタイル</Label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: "polite", label: "丁寧・親しみやすい", desc: "「ございます」「いただく」" },
                    { value: "formal", label: "フォーマル・かたい", desc: "ビジネス文書調" },
                    { value: "casual", label: "フレンドリー", desc: "「です」「ます」程度" },
                  ] as const).map(({ value, label, desc }) => (
                    <button key={value} onClick={() => setSpeakingStyle(value)}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${speakingStyle === value ? "border-primary/50 bg-primary/8 text-primary" : "border-border/30 text-muted-foreground hover:border-border/60"}`}>
                      <p className="font-medium">{label}</p>
                      <p className="opacity-70 mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </Card>
            <Card className="p-5 border-border/40 bg-card/60 space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">通話ルール</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">最大通話時間（秒）</Label>
                  <Input type="number" value={maxDuration} onChange={(e) => setMaxDuration(Number(e.target.value))}
                    min={30} max={600} className="bg-background/50 border-border/40 h-9 text-sm" />
                  <p className="text-[10px] text-muted-foreground">{Math.floor(maxDuration / 60)}分{maxDuration % 60}秒</p>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-xs">通話成功の定義</Label>
                  <Input value={successCondition} onChange={(e) => setSuccessCondition(e.target.value)}
                    placeholder="例: アポイントメントの取得" className="bg-background/50 border-border/40 h-9 text-sm" />
                  <p className="text-[10px] text-muted-foreground">AIがどの状態を「成功」と判断するかの基準です</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* ── 商材・発話 ─────────────────────────────────────────── */}
          <TabsContent value="product" className="mt-5 space-y-4">
            <Card className="p-5 border-border/40 bg-card/60 space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">商材情報</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">製品・サービス名 <span className="text-red-400">*</span></Label>
                  <Input value={productName} onChange={(e) => setProductName(e.target.value)}
                    className="bg-background/50 border-border/40 h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">価格・料金</Label>
                  <Input value={pricing} onChange={(e) => setPricing(e.target.value)}
                    placeholder="例: 月額3,000円〜" className="bg-background/50 border-border/40 h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">ターゲット顧客</Label>
                <Input value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)}
                  className="bg-background/50 border-border/40 h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">製品の特長・セールスポイント</Label>
                <div className="space-y-2">
                  {features.map((f, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={f}
                        onChange={(e) => setFeatures(features.map((x, j) => j === i ? e.target.value : x))}
                        placeholder={`特長 ${i + 1}`} className="bg-background/50 border-border/40 h-8 text-sm flex-1" />
                      <Button variant="outline" size="sm" onClick={() => setFeatures(features.filter((_, j) => j !== i))}
                        className="border-border/30 text-muted-foreground hover:text-red-400 h-8 px-2">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setFeatures([...features, ""])}
                    className="border-dashed border-border/40 text-muted-foreground text-xs h-8">
                    <Plus className="w-3 h-3 mr-1" />特長を追加
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-5 border-border/40 bg-card/60 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">発話設定</h3>
              <div className="space-y-2">
                <Label className="text-xs">オープニングメッセージ（第一声） <span className="text-red-400">*</span></Label>
                <textarea value={firstMessage} onChange={(e) => setFirstMessage(e.target.value)} rows={4}
                  className="w-full px-3 py-2.5 rounded-lg bg-background/50 border border-border/40 text-sm resize-none focus:outline-none focus:border-primary/40 leading-relaxed" />
                <p className="text-[10px] text-muted-foreground">{firstMessage.length} 文字 · 読み上げ約 {Math.ceil(firstMessage.length / 6)}秒</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
                <p className="font-medium text-primary mb-1">💡 効果的なオープニングのポイント</p>
                <ul className="space-y-0.5">
                  <li>• 社名・名前・目的を冒頭で明確に伝える</li>
                  <li>• 「少しお時間よろしいでしょうか？」で相手の状況を確認</li>
                  <li>• 15〜20秒以内（80〜120文字目安）に収める</li>
                </ul>
              </div>
            </Card>
          </TabsContent>

          {/* ── シナリオ設定 ─────────────────────────────────────────── */}
          <TabsContent value="scenarios" className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">会話シナリオ</p>
                <p className="text-xs text-muted-foreground mt-0.5">「こう言われたらこうする」という条件別の対応を定義します</p>
              </div>
              <Button size="sm" onClick={addScenario}
                className="gradient-bg border-0 hover:opacity-90 h-8 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" />シナリオ追加
              </Button>
            </div>

            <div className="space-y-3">
              {scenarios.map((s, idx) => (
                <Card key={s.id} className="border-border/40 bg-card/60 overflow-hidden">
                  <button
                    className="w-full flex items-center gap-3 p-4 hover:bg-white/3 transition-colors text-left"
                    onClick={() => setExpandedScenario(expandedScenario === s.id ? null : s.id)}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.trigger || "（未設定）"}</p>
                      {s.triggerKeywords.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          キーワード: {s.triggerKeywords.slice(0, 4).join("・")}{s.triggerKeywords.length > 4 ? "…" : ""}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className={`text-[10px] h-5 px-2 border-border/30 shrink-0 ${ACTION_LABELS[s.action]?.color}`}>
                      {ACTION_LABELS[s.action]?.label}
                    </Badge>
                    {expandedScenario === s.id ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>

                  <AnimatePresence>
                    {expandedScenario === s.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-0 border-t border-border/20 space-y-3">
                          <div className="space-y-1.5 mt-3">
                            <Label className="text-xs">条件・トリガー（「〇〇の場合」）</Label>
                            <Input value={s.trigger}
                              onChange={(e) => setScenarios(scenarios.map((x) => x.id === s.id ? { ...x, trigger: e.target.value } : x))}
                              placeholder="例: 価格・料金について聞いてきた場合" className="bg-background/50 border-border/40 h-8 text-sm" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">トリガーキーワード（カンマ区切り）</Label>
                            <Input
                              value={s.triggerKeywords.join(", ")}
                              onChange={(e) => setScenarios(scenarios.map((x) => x.id === s.id
                                ? { ...x, triggerKeywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) }
                                : x))}
                              placeholder="料金, 価格, いくら, 費用" className="bg-background/50 border-border/40 h-8 text-sm" />
                            <p className="text-[10px] text-muted-foreground">AIがこれらの言葉を認識した場合にこのシナリオを適用します</p>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">AIの応答内容 <span className="text-red-400">*</span></Label>
                            <textarea value={s.response}
                              onChange={(e) => setScenarios(scenarios.map((x) => x.id === s.id ? { ...x, response: e.target.value } : x))}
                              rows={3} placeholder="このシナリオでAIが発話する内容..."
                              className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border/40 text-sm resize-none focus:outline-none focus:border-primary/40" />
                            <p className="text-[10px] text-muted-foreground">
                              {"{{pricing}}"} {"{{product_name}}"} {"{{key_features}}"} などの変数が使えます
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">応答後のアクション</Label>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(ACTION_LABELS).map(([val, cfg]) => (
                                <button key={val}
                                  onClick={() => setScenarios(scenarios.map((x) => x.id === s.id
                                    ? { ...x, action: val as ScenarioRule["action"], actionLabel: cfg.label }
                                    : x))}
                                  className={`px-3 py-1 rounded-lg text-xs border transition-all ${s.action === val ? `${cfg.color} border-current/40 bg-current/5` : "border-border/30 text-muted-foreground hover:border-border/60"}`}>
                                  {cfg.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button variant="outline" size="sm"
                              onClick={() => setScenarios(scenarios.filter((x) => x.id !== s.id))}
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-7 text-xs">
                              <Trash2 className="w-3 h-3 mr-1" />削除
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-blue-400/5 border border-blue-400/15 text-xs text-blue-400/80">
              <p className="font-medium mb-1">シナリオの優先順位について</p>
              <p className="text-muted-foreground">シナリオは上から順に評価されます。複数のキーワードが一致した場合は最初にマッチしたシナリオが適用されます。ドラッグで並び替えができます（準備中）。</p>
            </div>
          </TabsContent>

          {/* ── FAQ ─────────────────────────────────────────── */}
          <TabsContent value="faq" className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">よくある質問（FAQ）</p>
                <p className="text-xs text-muted-foreground mt-0.5">質問を受けた際の回答を事前に定義します</p>
              </div>
              <Button size="sm" onClick={() => setFaqs([...faqs, { q: "", a: "" }])}
                className="gradient-bg border-0 hover:opacity-90 h-8 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" />FAQ追加
              </Button>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <Card key={i} className="p-4 border-border/40 bg-card/60 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">Q</span>
                    <Input value={faq.q}
                      onChange={(e) => setFaqs(faqs.map((x, j) => j === i ? { ...x, q: e.target.value } : x))}
                      placeholder="質問内容を入力..." className="bg-background/50 border-border/40 h-8 text-sm flex-1" />
                    <Button variant="ghost" size="sm" onClick={() => setFaqs(faqs.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-red-400 h-8 px-2 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="flex gap-2 pl-7">
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-1">A</span>
                    <textarea value={faq.a}
                      onChange={(e) => setFaqs(faqs.map((x, j) => j === i ? { ...x, a: e.target.value } : x))}
                      rows={2} placeholder="回答内容を入力..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-background/50 border border-border/40 text-sm resize-none focus:outline-none focus:border-primary/40" />
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── エスカレーション ─────────────────────────────────────────── */}
          <TabsContent value="escalation" className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">エスカレーション設定</p>
                <p className="text-xs text-muted-foreground mt-0.5">AIが対応できない場合の有人転送・終話ルールを定義します</p>
              </div>
              <Button size="sm" onClick={addEscalation}
                className="gradient-bg border-0 hover:opacity-90 h-8 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" />ルール追加
              </Button>
            </div>

            <div className="space-y-3">
              {escalations.map((e, idx) => (
                <Card key={e.id} className="p-4 border-border/40 bg-card/60 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      e.action === "transfer" ? "bg-amber-400/10 text-amber-400" :
                      e.action === "callback" ? "bg-blue-400/10 text-blue-400" :
                      "bg-red-400/10 text-red-400"
                    }`}>
                      {idx + 1}
                    </div>
                    <Input value={e.condition}
                      onChange={(e2) => setEscalations(escalations.map((x) => x.id === e.id ? { ...x, condition: e2.target.value } : x))}
                      placeholder="例: 強い怒り・クレームが発生した場合" className="bg-background/50 border-border/40 h-8 text-sm flex-1" />
                    <Button variant="ghost" size="sm" onClick={() => setEscalations(escalations.filter((x) => x.id !== e.id))}
                      className="text-muted-foreground hover:text-red-400 h-8 px-2 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="pl-9 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">検知キーワード（カンマ区切り）</Label>
                      <Input value={e.keywords.join(", ")}
                        onChange={(e2) => setEscalations(escalations.map((x) => x.id === e.id
                          ? { ...x, keywords: e2.target.value.split(",").map((k) => k.trim()).filter(Boolean) }
                          : x))}
                        placeholder="クレーム, 怒り, 責任者, 詐欺" className="bg-background/50 border-border/40 h-8 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">アクション</Label>
                        <div className="flex gap-1.5">
                          {ESCALATION_ACTIONS.map(({ value, label }) => (
                            <button key={value}
                              onClick={() => setEscalations(escalations.map((x) => x.id === e.id
                                ? { ...x, action: value as EscalationRule["action"] }
                                : x))}
                              className={`flex-1 py-1.5 rounded-lg text-xs border transition-all ${e.action === value ? "border-primary/40 bg-primary/8 text-primary" : "border-border/30 text-muted-foreground"}`}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {e.action === "transfer" && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">転送先電話番号</Label>
                          <Input value={e.transferNumber ?? ""}
                            onChange={(e2) => setEscalations(escalations.map((x) => x.id === e.id ? { ...x, transferNumber: e2.target.value } : x))}
                            placeholder="0120-000-001" className="bg-background/50 border-border/40 h-8 text-sm" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">エスカレーション前にAIが言う言葉</Label>
                      <textarea value={e.message}
                        onChange={(e2) => setEscalations(escalations.map((x) => x.id === e.id ? { ...x, message: e2.target.value } : x))}
                        rows={2} placeholder="例: 大変失礼いたしました。担当の者に代わります。"
                        className="w-full px-3 py-1.5 rounded-lg bg-background/50 border border-border/40 text-sm resize-none focus:outline-none focus:border-primary/40" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── 音声設定 ─────────────────────────────────────────── */}
          <TabsContent value="voice" className="mt-5 space-y-4">
            <Card className="p-5 border-border/40 bg-card/60 space-y-5">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">音声パラメータ</h3>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">音声モデル</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "ja-JP-Neural2-B", label: "Neural2-B", desc: "女性・落ち着いた声", gender: "female" },
                    { id: "ja-JP-Neural2-C", label: "Neural2-C", desc: "女性・明るい声", gender: "female" },
                    { id: "ja-JP-Neural2-D", label: "Neural2-D", desc: "男性・落ち着いた声", gender: "male" },
                    { id: "ja-JP-Neural2-A", label: "Neural2-A", desc: "男性・標準", gender: "male" },
                  ].map((v) => (
                    <button key={v.id} onClick={() => { setVoiceId(v.id); setGender(v.gender as "male" | "female"); }}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${voiceId === v.id ? "border-primary/50 bg-primary/8" : "border-border/30 hover:border-border/60"}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`font-medium ${voiceId === v.id ? "text-primary" : ""}`}>{v.label}</span>
                        <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-border/40">
                          {v.gender === "female" ? "女性" : "男性"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{v.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">話速（0.5〜2.0）</Label>
                  <div className="flex items-center gap-3">
                    <input type="range" min="0.5" max="2.0" step="0.05" value={speed}
                      onChange={(e) => setSpeed(parseFloat(e.target.value))}
                      className="flex-1 accent-primary" />
                    <span className="text-sm font-mono w-10 text-right">{speed.toFixed(2)}x</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {speed < 0.9 ? "ゆっくり・聞き取りやすい" : speed > 1.2 ? "速め・テキパキした印象" : "標準速度"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">無音タイムアウト（秒）</Label>
                  <Input type="number" defaultValue={10} min={3} max={30}
                    className="bg-background/50 border-border/40 h-9 text-sm" />
                  <p className="text-[10px] text-muted-foreground">相手が無音のままこの秒数経過すると確認メッセージを送出</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">通話終了フレーズ</Label>
                <Input defaultValue="ありがとうございました。失礼いたします。"
                  className="bg-background/50 border-border/40 h-9 text-sm" />
              </div>
            </Card>

            <Card className="p-5 border-border/40 bg-card/60 space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">バックグラウンド設定</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "office", label: "オフィス", desc: "静かなオフィス環境音" },
                  { value: "none", label: "なし", desc: "無音" },
                  { value: "nature", label: "自然音", desc: "落ち着いた自然音" },
                ].map(({ value, label, desc }) => (
                  <button key={value}
                    className="p-3 rounded-xl border border-border/30 text-left text-xs hover:border-border/60 transition-all">
                    <p className="font-medium">{label}</p>
                    <p className="text-muted-foreground mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}
