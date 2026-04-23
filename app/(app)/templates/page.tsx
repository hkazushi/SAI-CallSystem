"use client";

/**
 * テンプレート選択ウィザード
 *
 * 3 ステップ:
 *   1. 業界を選ぶ (光回線 / ウォーターサーバー / 保険 / 不動産 / 人材)
 *   2. 方向を選ぶ (アウトバウンド / インバウンド)
 *   3. 一意に決まったテンプレート詳細を表示 → 「このテンプレで壁打ちを始める」
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/ui/page-transition";
import { Button } from "@/components/ui/button";
import {
  ALL_TEMPLATES,
  getTemplateByIndustryAndDirection,
  type Industry,
  type CallDirection,
} from "@/lib/templates";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  PhoneOutgoing,
  PhoneIncoming,
  Wifi,
  Droplet,
  Shield,
  Home,
  Users,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LucideIcon } from "lucide-react";

type Step = "industry" | "direction" | "review";

const INDUSTRY_OPTIONS: Array<{
  value: Industry;
  label: string;
  description: string;
  icon: LucideIcon;
  colorClass: string;
}> = [
  {
    value: "hikari",
    label: "光回線",
    description: "光コラボ・光コラボ代理店の新規/サポート",
    icon: Wifi,
    colorClass: "text-sky-400 bg-sky-400/10",
  },
  {
    value: "water_server",
    label: "ウォーターサーバー",
    description: "宅配水の新規獲得・解約阻止",
    icon: Droplet,
    colorClass: "text-cyan-400 bg-cyan-400/10",
  },
  {
    value: "insurance",
    label: "保険",
    description: "保険見直し・FP面談予約・事故受付",
    icon: Shield,
    colorClass: "text-emerald-400 bg-emerald-400/10",
  },
  {
    value: "real_estate",
    label: "不動産",
    description: "反響追客・物件問い合わせ対応",
    icon: Home,
    colorClass: "text-amber-400 bg-amber-400/10",
  },
  {
    value: "hr",
    label: "人材",
    description: "転職エージェント・求人応募対応",
    icon: Users,
    colorClass: "text-violet-400 bg-violet-400/10",
  },
];

const DIRECTION_OPTIONS: Array<{
  value: CallDirection;
  label: string;
  description: string;
  icon: LucideIcon;
  colorClass: string;
}> = [
  {
    value: "outbound",
    label: "アウトバウンド",
    description: "こちらからお客さまへ架電する（新規営業・追客など）",
    icon: PhoneOutgoing,
    colorClass: "text-orange-400 bg-orange-400/10",
  },
  {
    value: "inbound",
    label: "インバウンド",
    description: "お客さまからの問い合わせ・申込を受ける",
    icon: PhoneIncoming,
    colorClass: "text-blue-400 bg-blue-400/10",
  },
];

export default function TemplatesWizardPage() {
  const [step, setStep] = useState<Step>("industry");
  const [industry, setIndustry] = useState<Industry | null>(null);
  const [direction, setDirection] = useState<CallDirection | null>(null);

  const template = useMemo(() => {
    if (!industry || !direction) return null;
    return getTemplateByIndustryAndDirection(industry, direction);
  }, [industry, direction]);

  function handleReset() {
    setStep("industry");
    setIndustry(null);
    setDirection(null);
  }

  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-[900px]">
        <PageHeader
          title="テンプレートから作成"
          description="業界と通話方向を選ぶと、最適なテンプレートが自動で選ばれます"
        />

        {/* ステッパー */}
        <div className="flex items-center gap-2 text-[11px] font-medium">
          <StepPill label="1. 業界" active={step === "industry"} done={!!industry} />
          <div className="h-px flex-1 bg-white/8" />
          <StepPill label="2. 方向" active={step === "direction"} done={!!direction} />
          <div className="h-px flex-1 bg-white/8" />
          <StepPill label="3. 確認" active={step === "review"} done={step === "review"} />
        </div>

        <AnimatePresence mode="wait">
          {step === "industry" && (
            <motion.div
              key="step-industry"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-[15px] font-bold">どんな業界ですか？</h2>
                <p className="text-[12px] text-muted-foreground/50 mt-1">
                  あなたの会社が扱っている商材に最も近いものを選んでください
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {INDUSTRY_OPTIONS.map((opt) => {
                  const hasTemplates = ALL_TEMPLATES.some((t) => t.industry === opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        if (!hasTemplates) return;
                        setIndustry(opt.value);
                        setStep("direction");
                      }}
                      disabled={!hasTemplates}
                      className={`group text-left rounded-xl border p-5 transition-all ${
                        hasTemplates
                          ? "border-white/6 bg-card/40 hover:border-white/15 hover:bg-card/60 cursor-pointer"
                          : "border-white/4 bg-card/20 opacity-40 cursor-not-allowed"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${opt.colorClass}`}
                      >
                        <opt.icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-[14px] font-bold">{opt.label}</h3>
                      <p className="text-[12px] text-muted-foreground/45 mt-1 leading-relaxed">
                        {opt.description}
                      </p>
                      {hasTemplates && (
                        <div className="flex items-center gap-1 mt-3 text-[11px] text-primary/50 group-hover:text-primary transition-colors">
                          選択 <ArrowRight className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === "direction" && industry && (
            <motion.div
              key="step-direction"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[15px] font-bold">通話の方向は？</h2>
                  <p className="text-[12px] text-muted-foreground/50 mt-1">
                    電話はこちらから架けますか？それとも受けますか？
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep("industry");
                    setIndustry(null);
                  }}
                  className="text-[11px] text-muted-foreground/50 hover:text-foreground gap-1 h-7"
                >
                  <ArrowLeft className="w-3 h-3" />
                  業界を選び直す
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {DIRECTION_OPTIONS.map((opt) => {
                  const hasTemplate = !!getTemplateByIndustryAndDirection(industry, opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        if (!hasTemplate) return;
                        setDirection(opt.value);
                        setStep("review");
                      }}
                      disabled={!hasTemplate}
                      className={`group text-left rounded-xl border p-5 transition-all ${
                        hasTemplate
                          ? "border-white/6 bg-card/40 hover:border-white/15 hover:bg-card/60 cursor-pointer"
                          : "border-white/4 bg-card/20 opacity-40 cursor-not-allowed"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${opt.colorClass}`}
                      >
                        <opt.icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-[14px] font-bold">{opt.label}</h3>
                      <p className="text-[12px] text-muted-foreground/45 mt-1 leading-relaxed">
                        {opt.description}
                      </p>
                      {hasTemplate && (
                        <div className="flex items-center gap-1 mt-3 text-[11px] text-primary/50 group-hover:text-primary transition-colors">
                          このパターンで進める <ArrowRight className="w-3 h-3" />
                        </div>
                      )}
                      {!hasTemplate && (
                        <p className="text-[11px] text-muted-foreground/40 mt-3">
                          この組み合わせのテンプレートはまだありません
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === "review" && template && (
            <motion.div
              key="step-review"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[15px] font-bold">このテンプレートで進めましょう</h2>
                  <p className="text-[12px] text-muted-foreground/50 mt-1">
                    Chappie との壁打ちで、あなたの会社向けに細かくカスタマイズします
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-[11px] text-muted-foreground/50 hover:text-foreground gap-1 h-7"
                >
                  <ArrowLeft className="w-3 h-3" />
                  最初からやり直す
                </Button>
              </div>

              {/* テンプレカード */}
              <div className="rounded-xl border border-white/8 bg-card/40 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold">{template.displayName}</h3>
                    <p className="text-[11px] text-muted-foreground/40">
                      テンプレートID: <code className="font-mono">{template.id}</code>
                    </p>
                  </div>
                </div>
                <p className="text-[13px] text-muted-foreground/70 leading-relaxed">
                  {template.description}
                </p>
              </div>

              {/* 業界ブリーフ */}
              <div className="rounded-xl border border-white/6 bg-card/30 p-5 space-y-2">
                <h4 className="text-[12px] font-bold text-muted-foreground/70 uppercase tracking-wide">
                  業界ノウハウ（Chappie が自動で活用します）
                </h4>
                <p className="text-[12px] text-muted-foreground/60 leading-relaxed whitespace-pre-wrap">
                  {template.industryKnowledgeBrief}
                </p>
              </div>

              {/* 3 列プレビュー */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-white/6 bg-card/30 p-4 space-y-2">
                  <h4 className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wide">
                    よくある反論 ({template.typicalObjections.length} 件)
                  </h4>
                  <ul className="space-y-1.5 text-[11px] text-muted-foreground/70">
                    {template.typicalObjections.slice(0, 4).map((o) => (
                      <li key={o.trigger} className="flex items-start gap-1.5">
                        <span className="text-primary/40 mt-0.5">・</span>
                        <span className="line-clamp-2">{o.trigger}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-white/6 bg-card/30 p-4 space-y-2">
                  <h4 className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wide">
                    ヒアリング項目 ({template.defaultHearingFields.length} 件)
                  </h4>
                  <ul className="space-y-1.5 text-[11px] text-muted-foreground/70">
                    {template.defaultHearingFields.slice(0, 5).map((f) => (
                      <li key={f.key} className="flex items-center gap-1.5">
                        <Check
                          className={`w-2.5 h-2.5 ${f.required ? "text-emerald-400" : "text-muted-foreground/30"}`}
                        />
                        <span className="truncate">{f.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-white/6 bg-card/30 p-4 space-y-2">
                  <h4 className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wide">
                    人間へ転送する条件
                  </h4>
                  <ul className="space-y-1.5 text-[11px] text-muted-foreground/70">
                    {template.transferConditions.slice(0, 4).map((c) => (
                      <li key={c} className="flex items-start gap-1.5">
                        <span className="text-orange-400/40 mt-0.5">▸</span>
                        <span className="line-clamp-2">{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* CTA */}
              <div className="flex items-center gap-3 pt-2">
                <Link href={`/projects/new/chat?template=${template.id}`}>
                  <Button className="gradient-bg border-0 hover:opacity-85 h-11 px-6 text-[13px] font-semibold gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Chappie と壁打ちを始める <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  onClick={handleReset}
                  className="h-11 text-[13px] text-muted-foreground/50 hover:text-foreground"
                >
                  テンプレートを選び直す
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}

function StepPill({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${
        done && !active
          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
          : active
            ? "border-primary/30 bg-primary/15 text-primary"
            : "border-white/8 text-muted-foreground/50"
      }`}
    >
      {done && !active && <Check className="w-2.5 h-2.5" />}
      {label}
    </span>
  );
}
