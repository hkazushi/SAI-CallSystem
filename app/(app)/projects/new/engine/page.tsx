"use client";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/ui/page-transition";
import { Zap, Bot, Layers, ArrowRight, Check, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const engines = [
  {
    id: "vapi",
    icon: Zap,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-400/10",
    title: "Vapi.ai",
    subtitle: "柔軟型 — LLMリアルタイム応答",
    description: "LLMがその場で応答を生成。想定外の質問にも自然に対応できる反面、ハルシネーションのリスクがあります。",
    pros: ["想定外の会話に柔軟に対応", "シナリオ設計がシンプル", "自然な会話体験"],
    cons: ["ハルシネーションリスク", "LLM料金が発生"],
    useCases: "ヒアリング系アウトバウンド、柔らかい一次対応、アポ取り",
    accentColor: "border-amber-400/25 hover:border-amber-400/40",
    accentBg: "bg-amber-500/3",
  },
  {
    id: "dialogflow_cx",
    icon: Bot,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-400/10",
    title: "Dialogflow CX",
    subtitle: "厳格型 — トークツリー制御",
    description: "事前設計のトークフロー通りに会話を進めます。絶対にブレない反面、想定外の質問には弱い面があります。",
    pros: ["応答が完全に制御可能", "コンプライアンス対応が容易", "LLM料金なし"],
    cons: ["想定外の質問に弱い", "シナリオ設計に労力が必要"],
    useCases: "コンプラ重視業種、アポ取り特化、定型問い合わせ応答",
    accentColor: "border-blue-400/25 hover:border-blue-400/40",
    accentBg: "bg-blue-500/3",
  },
  {
    id: "both",
    icon: Layers,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-400/10",
    title: "両方（並行）",
    subtitle: "Vapi & Dialogflow CX 同時生成",
    description: "1回のヒアリングから両方のエンジンに同時にデプロイし、A/B比較や用途別に使い分けることができます。",
    pros: ["A/B比較がしやすい", "用途別に切り替え可能", "壁打ち1回で両方完成"],
    cons: ["両方のコストが発生", "メンテナンス対象が2つになる"],
    useCases: "比較検証フェーズ、本番＋バックアップ、フェーズ別の使い分け",
    accentColor: "border-purple-400/25 hover:border-purple-400/40",
    accentBg: "bg-purple-500/3",
  },
];

export default function EngineSelectPage() {
  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-[900px]">
        <PageHeader title="AIエンジン選択" description="プロジェクトで使用するAIエンジンを選択してください" />

        <div className="grid md:grid-cols-3 gap-5">
          {engines.map((eng, i) => (
            <motion.div
              key={eng.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
            >
              <Link href={`/projects/new/chat?engine=${eng.id}`} className="block h-full group">
                <div className={`h-full rounded-xl border bg-card/40 hover:bg-card/60 transition-all p-6 relative overflow-hidden ${eng.accentColor}`}>
                  {/* Background accent */}
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full ${eng.accentBg} opacity-60`} />

                  <div className="relative space-y-4">
                    {/* Icon + Title */}
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${eng.iconBg}`}>
                        <eng.icon className={`w-5 h-5 ${eng.iconColor}`} />
                      </div>
                      <div>
                        <h3 className="text-[15px] font-bold">{eng.title}</h3>
                        <p className="text-[11px] text-muted-foreground/45">{eng.subtitle}</p>
                      </div>
                    </div>

                    <p className="text-[12px] text-muted-foreground/50 leading-relaxed">{eng.description}</p>

                    {/* Pros */}
                    <div className="space-y-1.5">
                      {eng.pros.map((p) => (
                        <div key={p} className="flex items-center gap-2 text-[11px] text-emerald-400/70">
                          <Check className="w-3 h-3 shrink-0" />
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>

                    {/* Cons */}
                    <div className="space-y-1.5">
                      {eng.cons.map((c) => (
                        <div key={c} className="flex items-center gap-2 text-[11px] text-amber-400/60">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>

                    {/* Use cases */}
                    <div className="pt-3 border-t border-white/5">
                      <p className="text-[10px] text-muted-foreground/35 tracking-wide uppercase font-medium mb-1">想定用途</p>
                      <p className="text-[12px] text-muted-foreground/55">{eng.useCases}</p>
                    </div>

                    {/* CTA */}
                    <div className="flex items-center gap-1 text-[12px] text-primary/50 group-hover:text-primary font-semibold transition-colors pt-1">
                      このエンジンで作成 <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
