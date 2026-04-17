"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/page-transition";
import { mockTemplates } from "@/lib/mock-data";
import { Zap, Bot, ArrowRight, Play, MessageSquare } from "lucide-react";

export default function TemplateDetailPage() {
  const { slug } = useParams();
  const tpl = mockTemplates.find((t) => t.slug === slug) ?? mockTemplates[0];
  const scenario = tpl.scenario as {
    purpose: string;
    industry: string;
    product: { name: string; price: string; features: string[] };
    first_message: string;
    goals: string[];
    faq: { question: string; answer: string }[];
  };

  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-[900px]">
        <PageHeader title={tpl.name} description={tpl.description ?? undefined}>
          <Link href={`/projects/new/chat?template=${tpl.slug}`}>
            <Button className="gradient-bg border-0 hover:opacity-85 h-9 px-5 text-[13px] font-semibold gap-2">
              <MessageSquare className="w-3.5 h-3.5" />
              このテンプレートから作成
            </Button>
          </Link>
        </PageHeader>

        <div className="grid md:grid-cols-2 gap-5">
          {/* 基本情報 */}
          <div className="rounded-xl border border-white/6 bg-card/40 p-5 space-y-4">
            <h3 className="text-[13px] font-bold">基本情報</h3>
            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground/50">目的</span>
                <span className="font-medium">{scenario.purpose}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground/50">業種</span>
                <span className="font-medium">{scenario.industry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground/50">エンジン</span>
                <span className="flex items-center gap-1.5 font-medium">
                  {tpl.default_provider === "vapi"
                    ? <><Zap className="w-3 h-3 text-amber-400" />Vapi.ai（柔軟型）</>
                    : <><Bot className="w-3 h-3 text-blue-400" />Dialogflow CX（厳格型）</>
                  }
                </span>
              </div>
            </div>
          </div>

          {/* 商材情報 */}
          <div className="rounded-xl border border-white/6 bg-card/40 p-5 space-y-4">
            <h3 className="text-[13px] font-bold">商材テンプレート</h3>
            <div className="space-y-3 text-[13px]">
              <div>
                <span className="text-muted-foreground/50 text-[11px]">商品名</span>
                <p className="font-medium mt-0.5">{scenario.product.name}</p>
              </div>
              {scenario.product.price && (
                <div>
                  <span className="text-muted-foreground/50 text-[11px]">価格</span>
                  <p className="mt-0.5">{scenario.product.price}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground/50 text-[11px]">特長</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {scenario.product.features.map((f) => (
                    <span key={f} className="px-2 py-0.5 rounded-md bg-white/5 text-[11px] text-muted-foreground/60">{f}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 冒頭メッセージ */}
        <div className="rounded-xl border border-white/6 bg-card/40 p-5 space-y-3">
          <h3 className="text-[13px] font-bold">冒頭メッセージ</h3>
          <p className="text-[13px] text-muted-foreground/60 leading-relaxed bg-white/3 rounded-lg p-3 border border-white/5">
            {scenario.first_message}
          </p>
        </div>

        {/* FAQ */}
        {scenario.faq.length > 0 && (
          <div className="rounded-xl border border-white/6 bg-card/40 p-5 space-y-3">
            <h3 className="text-[13px] font-bold">FAQ テンプレート</h3>
            <div className="space-y-3">
              {scenario.faq.map((f, i) => (
                <div key={i} className="border-l-2 border-primary/20 pl-3 space-y-1">
                  <p className="text-[12px] font-medium">Q. {f.question}</p>
                  <p className="text-[12px] text-muted-foreground/50">A. {f.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ゴール */}
        <div className="rounded-xl border border-white/6 bg-card/40 p-5 space-y-3">
          <h3 className="text-[13px] font-bold">達成ゴール</h3>
          <div className="flex items-center gap-2">
            {scenario.goals.map((g) => (
              <span key={g} className="px-3 py-1 rounded-lg bg-primary/8 text-primary text-[12px] font-medium border border-primary/15">{g}</span>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="flex items-center gap-3 pt-2">
          <Link href={`/projects/new/chat?template=${tpl.slug}`}>
            <Button className="gradient-bg border-0 hover:opacity-85 h-10 px-6 text-[13px] font-semibold gap-2">
              <MessageSquare className="w-4 h-4" />
              チャッピーで構築を始める <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Link href="/templates">
            <Button variant="ghost" className="h-10 text-[13px] text-muted-foreground/50 hover:text-foreground">
              テンプレート一覧に戻る
            </Button>
          </Link>
        </div>
      </div>
    </PageTransition>
  );
}
