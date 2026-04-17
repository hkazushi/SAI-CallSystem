"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/page-transition";
import { mockProjects } from "@/lib/mock-data";
import { buildVapiSystemPrompt, buildVapiAssistantConfig, DEFAULT_SCENARIOS, DEFAULT_ESCALATIONS } from "@/lib/ai-builder";
import type { CallSettings } from "@/lib/ai-builder";
import { Save, Copy, Check, RotateCcw, ArrowLeft } from "lucide-react";

export default function SystemPromptPage() {
  const { id } = useParams();
  const project = mockProjects.find((p) => p.id === id) ?? mockProjects[0];

  const settings: CallSettings = {
    persona: { agentName: "田中", speakingStyle: "polite", language: "ja", introSelf: "田中と申します" },
    companyName: "株式会社サンプル",
    productName: project.product_info.product_name,
    pricing: project.product_info.pricing,
    targetCustomer: project.product_info.target_customer,
    keyFeatures: project.product_info.key_features,
    firstMessage: project.first_message,
    scenarios: DEFAULT_SCENARIOS,
    faqs: [
      { q: "料金はいくらですか？", a: `${project.product_info.pricing}でご利用いただけます。` },
      { q: "無料トライアルはありますか？", a: "はい、14日間の無料トライアルをご用意しております。" },
    ],
    escalations: DEFAULT_ESCALATIONS,
    successCondition: "アポイントメントの取得または資料送付の合意",
    maxCallDuration: 300,
    voice: {
      voiceId: project.voice_settings.voice_id,
      speed: project.voice_settings.speed,
      gender: project.voice_settings.gender as "male" | "female",
    },
  };

  const generatedPrompt = buildVapiSystemPrompt(settings);
  const [prompt, setPrompt] = useState(generatedPrompt);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"prompt" | "config">("prompt");

  const config = buildVapiAssistantConfig(settings, prompt);
  const configJson = JSON.stringify(config, null, 2);

  function handleCopy() {
    navigator.clipboard.writeText(activeTab === "prompt" ? prompt : configJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    setPrompt(generatedPrompt);
  }

  return (
    <PageTransition>
      <div className="p-6 space-y-5 max-w-[1200px]">
        <PageHeader title="システムプロンプト編集" description={`${project.name} — Vapi.ai`}>
          <Link href={`/projects/${project.id}`}>
            <Button variant="ghost" size="sm" className="h-8 text-[12px] text-muted-foreground/50 gap-1">
              <ArrowLeft className="w-3 h-3" />戻る
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleReset} className="border-white/10 h-8 text-[12px] gap-1">
            <RotateCcw className="w-3 h-3" />再生成
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy} className="border-white/10 h-8 text-[12px] gap-1">
            {copied ? <><Check className="w-3 h-3 text-emerald-400" />コピー済み</> : <><Copy className="w-3 h-3" />コピー</>}
          </Button>
          <Button size="sm" onClick={handleSave} className="gradient-bg border-0 hover:opacity-85 h-8 text-[12px] gap-1">
            {saved ? <><Check className="w-3 h-3" />保存済み</> : <><Save className="w-3 h-3" />保存</>}
          </Button>
        </PageHeader>

        {/* Tab */}
        <div className="flex items-center gap-1 border-b border-white/5 pb-px">
          {([
            { key: "prompt", label: "システムプロンプト" },
            { key: "config", label: "Vapi設定JSON" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-[12px] font-medium border-b-2 transition-all ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground/40 hover:text-muted-foreground/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Editor */}
        {activeTab === "prompt" ? (
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full min-h-[600px] px-5 py-4 rounded-xl bg-card/40 border border-white/6 text-[13px] font-mono leading-relaxed resize-y focus:outline-none focus:border-primary/20 placeholder:text-muted-foreground/30"
            spellCheck={false}
          />
        ) : (
          <pre className="w-full min-h-[600px] px-5 py-4 rounded-xl bg-card/40 border border-white/6 text-[12px] font-mono leading-relaxed overflow-auto text-muted-foreground/70">
            {configJson}
          </pre>
        )}
      </div>
    </PageTransition>
  );
}
