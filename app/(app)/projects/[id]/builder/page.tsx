"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";
import { mockProjects } from "@/lib/mock-data";
import {
  buildVapiSystemPrompt,
  buildVapiAssistantConfig,
  buildDialogflowConfig,
  DEFAULT_SCENARIOS,
  DEFAULT_ESCALATIONS,
  type CallSettings,
} from "@/lib/ai-builder";
import {
  ChevronLeft, Wand2, Zap, Bot, CheckCircle2, Copy, Eye, EyeOff,
  RefreshCw, Play, Settings, AlertTriangle, ArrowRight, Code2,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type BuildStatus = "idle" | "building" | "success" | "error";
type Tab = "prompt" | "config" | "dialogflow";

// Mock settings from saved content page
function buildMockSettings(project: typeof mockProjects[0]): CallSettings {
  return {
    persona: {
      agentName: "田中",
      speakingStyle: "polite",
      language: "ja",
      introSelf: "田中と申します",
    },
    companyName: "株式会社サンプル",
    productName: project.product_info.product_name,
    pricing: project.product_info.pricing,
    targetCustomer: project.product_info.target_customer,
    keyFeatures: project.product_info.key_features,
    firstMessage: project.first_message,
    scenarios: DEFAULT_SCENARIOS,
    faqs: [
      { q: "料金はいくらですか？", a: `${project.product_info.pricing}でご利用いただけます。` },
      { q: "無料試用期間はありますか？", a: "14日間の無料トライアルをご用意しています。" },
      { q: "解約はいつでもできますか？", a: "はい、いつでも解約可能です。" },
    ],
    escalations: DEFAULT_ESCALATIONS,
    successCondition: "アポイントメントの取得または資料送付への同意",
    maxCallDuration: 180,
    voice: {
      voiceId: project.voice_settings.voice_id,
      speed: project.voice_settings.speed,
      gender: project.voice_settings.gender as "male" | "female",
    },
  };
}

const BUILD_STEPS = [
  { label: "設定を読み込み中", duration: 600 },
  { label: "システムプロンプトを生成中", duration: 900 },
  { label: "シナリオをコンパイル中", duration: 700 },
  { label: "APIコンフィグを構築中", duration: 800 },
  { label: "デプロイ準備完了", duration: 500 },
];

export default function BuilderPage() {
  const { id } = useParams();
  const project = mockProjects.find((p) => p.id === id) ?? mockProjects[0];
  const settings = buildMockSettings(project);

  const [status, setStatus] = useState<BuildStatus>("idle");
  const [buildProgress, setBuildProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("prompt");
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [deployStatus, setDeployStatus] = useState<"idle" | "deploying" | "deployed">("idle");

  const systemPrompt = buildVapiSystemPrompt(settings);
  const vapiConfig = buildVapiAssistantConfig(settings, systemPrompt);
  const dialogflowConfig = buildDialogflowConfig(settings);
  const isVapi = project.ai_provider === "vapi";

  async function handleBuild() {
    setStatus("building");
    setBuildProgress(0);

    for (let i = 0; i < BUILD_STEPS.length; i++) {
      setCurrentStep(BUILD_STEPS[i].label);
      await new Promise((r) => setTimeout(r, BUILD_STEPS[i].duration));
      setBuildProgress(Math.round(((i + 1) / BUILD_STEPS.length) * 100));
    }

    setStatus("success");
  }

  async function handleDeploy() {
    setDeployStatus("deploying");
    await new Promise((r) => setTimeout(r, 2000));
    setDeployStatus("deployed");
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const configJson = JSON.stringify(isVapi ? vapiConfig : dialogflowConfig, null, 2);

  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href={`/projects/${id}/content`}>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4 mr-1" />コール対応設定
            </Button>
          </Link>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              AIビルダー
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              設定内容をもとに{isVapi ? "Vapi.ai" : "Dialogflow CX"}用のコンフィグを自動生成・デプロイします
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs border-border/30 ${isVapi ? "text-amber-400" : "text-blue-400"}`}>
              {isVapi ? <><Zap className="w-3 h-3 mr-1 inline" />Vapi.ai</> : <><Bot className="w-3 h-3 mr-1 inline" />Dialogflow CX</>}
            </Badge>
          </div>
        </div>

        {/* Status Overview */}
        <StaggerContainer className="grid grid-cols-3 gap-4">
          {[
            {
              label: "設定ステータス",
              value: "設定済み",
              sub: `${DEFAULT_SCENARIOS.length} シナリオ · ${DEFAULT_ESCALATIONS.length} エスカレーション`,
              color: "text-emerald-400",
              icon: CheckCircle2,
              iconColor: "text-emerald-400",
              bg: "bg-emerald-400/10",
            },
            {
              label: "ビルドステータス",
              value: status === "success" ? "構築済み" : status === "building" ? "構築中..." : "未構築",
              sub: status === "success" ? "最終ビルド: 今" : "設定から自動生成",
              color: status === "success" ? "text-emerald-400" : status === "building" ? "text-primary" : "text-muted-foreground",
              icon: status === "building" ? Loader2 : Wand2,
              iconColor: status === "success" ? "text-emerald-400" : "text-primary",
              bg: "bg-primary/10",
            },
            {
              label: "デプロイステータス",
              value: deployStatus === "deployed" ? "デプロイ済み" : deployStatus === "deploying" ? "デプロイ中..." : "未デプロイ",
              sub: deployStatus === "deployed" ? `${isVapi ? "Vapi.ai" : "Dialogflow CX"} に適用済み` : "ビルド後にデプロイ可能",
              color: deployStatus === "deployed" ? "text-emerald-400" : "text-muted-foreground",
              icon: deployStatus === "deployed" ? CheckCircle2 : Play,
              iconColor: deployStatus === "deployed" ? "text-emerald-400" : "text-muted-foreground",
              bg: "bg-white/5",
            },
          ].map(({ label, value, sub, color, icon: Icon, iconColor, bg }) => (
            <StaggerItem key={label}>
              <Card className="p-4 border-border/40 bg-card/60">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-base font-bold mt-1 ${color}`}>{value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${iconColor} ${Icon === Loader2 ? "animate-spin" : ""}`} />
                  </div>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Build Button */}
        {status !== "success" && (
          <Card className="p-6 border-border/40 bg-card/60">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center shrink-0">
                <Wand2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">AIコンフィグをビルド</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  コール対応設定ページで入力した内容を解析し、{isVapi ? "Vapi.aiのシステムプロンプト・アシスタント設定" : "Dialogflow CXのインテント・フロー設定"}を自動生成します
                </p>
              </div>
              <Button
                size="lg"
                className="gradient-bg border-0 hover:opacity-90 shrink-0"
                onClick={handleBuild}
                disabled={status === "building"}
              >
                {status === "building" ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />ビルド中...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4" />ビルド開始
                  </span>
                )}
              </Button>
            </div>

            {/* Progress */}
            <AnimatePresence>
              {status === "building" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-5 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{currentStep}</span>
                    <span>{buildProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full gradient-bg rounded-full"
                      animate={{ width: `${buildProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        )}

        {/* Generated Output */}
        {status === "success" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Success banner */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-400/5 border border-emerald-400/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-400">ビルド完了</p>
                <p className="text-xs text-muted-foreground">
                  {DEFAULT_SCENARIOS.length} シナリオ、{DEFAULT_ESCALATIONS.length} エスカレーション、3 FAQ を処理しました
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline"
                  className="border-border/40 h-8 text-xs"
                  onClick={handleBuild}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />再ビルド
                </Button>
                <Button
                  size="sm"
                  className={`h-8 text-xs ${deployStatus === "deployed" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "gradient-bg border-0 hover:opacity-90"}`}
                  onClick={handleDeploy}
                  disabled={deployStatus === "deploying"}
                >
                  {deployStatus === "deploying" ? (
                    <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />デプロイ中</span>
                  ) : deployStatus === "deployed" ? (
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" />デプロイ済み</span>
                  ) : (
                    <span className="flex items-center gap-1.5"><Play className="w-3 h-3" />{isVapi ? "Vapi.ai" : "Dialogflow CX"} にデプロイ</span>
                  )}
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Card className="border-border/40 bg-card/60 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
                <div className="flex gap-1">
                  {([
                    { key: "prompt" as Tab, label: "システムプロンプト", icon: MessageSquareIcon },
                    { key: "config" as Tab, label: isVapi ? "Vapi.ai Config" : "Dialogflow Config", icon: Code2 },
                  ]).map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setActiveTab(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${activeTab === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                      <Icon className="w-3.5 h-3.5" />{label}
                    </button>
                  ))}
                </div>
                <Button size="sm" variant="ghost"
                  className="text-xs text-muted-foreground h-7"
                  onClick={() => copyToClipboard(activeTab === "prompt" ? systemPrompt : configJson)}>
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  {copied ? "コピー済み!" : "コピー"}
                </Button>
              </div>

              <div className="max-h-[500px] overflow-y-auto">
                {activeTab === "prompt" && (
                  <pre className="p-4 text-xs leading-relaxed font-mono text-foreground/80 whitespace-pre-wrap">
                    {systemPrompt}
                  </pre>
                )}
                {activeTab === "config" && (
                  <pre className="p-4 text-xs leading-relaxed font-mono text-foreground/80 whitespace-pre-wrap">
                    {configJson}
                  </pre>
                )}
              </div>
            </Card>

            {/* Deploy info */}
            {deployStatus === "deployed" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-emerald-400/5 border border-emerald-400/15 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm font-medium text-emerald-400">{isVapi ? "Vapi.ai" : "Dialogflow CX"} へのデプロイ完了</p>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>アシスタントID</span>
                    <span className="font-mono text-foreground">{project.ai_assistant_id ?? "asst_" + id?.slice(5, 13)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>デプロイ日時</span>
                    <span className="font-mono text-foreground">{new Date().toLocaleString("ja-JP")}</span>
                  </div>
                </div>
                <Link href={`/projects/${id}`}>
                  <Button size="sm" className="gradient-bg border-0 hover:opacity-90 h-8 text-xs mt-1">
                    プロジェクトに戻る <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </motion.div>
            )}

            {/* Checklist */}
            <Card className="p-5 border-border/40 bg-card/40">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">生成内容サマリー</p>
              <div className="space-y-2">
                {[
                  { label: "システムプロンプト", detail: `${systemPrompt.length.toLocaleString()} 文字`, ok: true },
                  { label: "商材情報", detail: `${settings.keyFeatures.length} 特長`, ok: true },
                  { label: "オープニングメッセージ", detail: `${settings.firstMessage.length} 文字`, ok: true },
                  { label: "会話シナリオ", detail: `${settings.scenarios.length} 件`, ok: settings.scenarios.length > 0 },
                  { label: "FAQ", detail: `${settings.faqs.length} 件`, ok: settings.faqs.length > 0 },
                  { label: "エスカレーションルール", detail: `${settings.escalations.length} 件`, ok: settings.escalations.length > 0 },
                  { label: "音声設定", detail: `${settings.voice.voiceId} / ${settings.voice.speed}x`, ok: true },
                ].map(({ label, detail, ok }) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${ok ? "text-emerald-400" : "text-muted-foreground"}`} />
                      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                    </div>
                    <span className="text-muted-foreground font-mono">{detail}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}

function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}
