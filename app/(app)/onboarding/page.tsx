"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageTransition } from "@/components/ui/page-transition";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Rocket, Users, Sparkles, Check, ArrowRight, ArrowLeft, Phone, Layers,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS = [
  { n: 1, label: "ようこそ", icon: Sparkles },
  { n: 2, label: "組織情報", icon: Building2 },
  { n: 3, label: "最初のプロジェクト", icon: Rocket },
  { n: 4, label: "チーム招待", icon: Users },
  { n: 5, label: "完了", icon: Check },
];

const USE_CASES = [
  { id: "outbound_sales", label: "アウトバウンド営業", desc: "リードへの架電・アポ獲得" },
  { id: "inbound_support", label: "インバウンドサポート", desc: "問い合わせ受付・1次対応" },
  { id: "appointment_reminder", label: "予約リマインダー", desc: "予約確認・キャンセル防止" },
  { id: "survey", label: "アンケート・調査", desc: "顧客満足度・市場調査" },
  { id: "collections", label: "債権回収・督促", desc: "支払いリマインダー" },
  { id: "other", label: "その他", desc: "上記以外の用途" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [useCase, setUseCase] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [inviteEmails, setInviteEmails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const next = () => setStep((s) => (s < 5 ? ((s + 1) as Step) : s));
  const prev = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s));

  const finish = async () => {
    setSubmitting(true);
    // 本来はここで /api/onboarding/complete を呼ぶが、まずはモックで先へ
    await new Promise((r) => setTimeout(r, 600));
    router.push("/dashboard");
  };

  const canNext =
    (step === 1) ||
    (step === 2 && orgName.trim().length > 0) ||
    (step === 3 && useCase !== null && projectName.trim().length > 0) ||
    (step === 4) ||
    (step === 5);

  return (
    <PageTransition>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* プログレス */}
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = s.n === step;
            const isDone = s.n < step;
            return (
              <div key={s.n} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      isDone
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : isActive
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] ${isActive ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 ${isDone ? "bg-emerald-500/40" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* ステップ本体 */}
        <Card className="p-8 min-h-[420px]">
          {step === 1 && (
            <div className="text-center space-y-5 py-8">
              <div className="inline-flex w-16 h-16 rounded-2xl gradient-bg items-center justify-center shadow-lg shadow-primary/30">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">VoiceAI Pro へようこそ</h1>
                <p className="text-muted-foreground mt-2">
                  音声AIで通話業務を自動化。3分のセットアップで運用を開始できます。
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto pt-4">
                <div className="bg-muted/30 rounded-lg p-3 text-left">
                  <Building2 className="w-4 h-4 text-primary mb-1.5" />
                  <p className="text-xs font-semibold">組織情報</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">基本情報を登録</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-left">
                  <Rocket className="w-4 h-4 text-primary mb-1.5" />
                  <p className="text-xs font-semibold">プロジェクト</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">最初の用途を選択</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-left">
                  <Users className="w-4 h-4 text-primary mb-1.5" />
                  <p className="text-xs font-semibold">チーム招待</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">メンバーを追加</p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">組織の基本情報</h2>
                <p className="text-sm text-muted-foreground mt-1">どんな組織で使うかを教えてください。</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>組織名 <span className="text-red-400">*</span></Label>
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="株式会社○○"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>業種</Label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-3 h-10 text-sm"
                  >
                    <option value="">選択してください</option>
                    <option value="saas">SaaS / IT</option>
                    <option value="finance">金融・保険</option>
                    <option value="real_estate">不動産</option>
                    <option value="healthcare">医療・ヘルスケア</option>
                    <option value="retail">小売・EC</option>
                    <option value="education">教育</option>
                    <option value="energy">エネルギー・通信</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>チーム規模</Label>
                  <select
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-3 h-10 text-sm"
                  >
                    <option value="">選択してください</option>
                    <option value="1-5">1-5名</option>
                    <option value="6-20">6-20名</option>
                    <option value="21-50">21-50名</option>
                    <option value="51-200">51-200名</option>
                    <option value="200+">200名超</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">最初のプロジェクトを作成</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  プロジェクトはユースケースごとに作ります。後で追加・変更できます。
                </p>
              </div>
              <div className="space-y-2">
                <Label>用途 <span className="text-red-400">*</span></Label>
                <div className="grid grid-cols-2 gap-2">
                  {USE_CASES.map((uc) => (
                    <button
                      key={uc.id}
                      onClick={() => setUseCase(uc.id)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        useCase === uc.id
                          ? "bg-primary/10 border-primary/40"
                          : "bg-muted/20 border-border/40 hover:bg-muted/30"
                      }`}
                    >
                      <div className="text-sm font-semibold flex items-center gap-2">
                        {uc.label}
                        {useCase === uc.id && <Check className="w-3 h-3 text-primary" />}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{uc.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>プロジェクト名 <span className="text-red-400">*</span></Label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="例: クラウド会計 OB (2026Q2)"
                />
              </div>
              <div className="space-y-1.5">
                <Label>説明（任意）</Label>
                <Textarea
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="このプロジェクトの目的・対象セグメントなど"
                  rows={3}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">チームメンバーを招待</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  メールアドレスを改行区切りで入力（スキップ可・後で追加できます）。
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>メールアドレス（複数可）</Label>
                <Textarea
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  placeholder="taro@example.com&#10;hanako@example.com"
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  招待されたメンバーには 72時間有効な確認リンクが送信されます。役割（ロール）は後で個別に設定できます。
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <Layers className="w-3 h-3" />ロールについて
                </p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <div><Badge variant="outline" className="text-[9px] mr-1">マネージャー</Badge>運用責任者</div>
                  <div><Badge variant="outline" className="text-[9px] mr-1">オペレーター</Badge>日常運用</div>
                  <div><Badge variant="outline" className="text-[9px] mr-1">監査人</Badge>閲覧と監査</div>
                  <div><Badge variant="outline" className="text-[9px] mr-1">経理</Badge>請求関連</div>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="text-center space-y-5 py-8">
              <div className="inline-flex w-16 h-16 rounded-full bg-emerald-500/15 items-center justify-center">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">準備完了！</h1>
                <p className="text-muted-foreground mt-2">
                  これで <span className="text-foreground font-semibold">{orgName || "あなたの組織"}</span> のセットアップが完了しました。
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 max-w-md mx-auto space-y-2 text-left">
                <p className="text-xs font-semibold text-muted-foreground">次のステップ</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>テンプレートから業種別の会話設計を選ぶ</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>顧客リストをアップロード（CSV対応）</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>テスト通話で動作を確認</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* ナビゲーション */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={prev} disabled={step === 1}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />戻る
          </Button>
          {step < 5 ? (
            <Button onClick={next} disabled={!canNext}>
              {step === 4 ? "スキップして完了" : "次へ"}
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={submitting}>
              {submitting ? "起動中..." : "ダッシュボードへ"}
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
