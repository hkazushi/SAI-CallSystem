"use client";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/ui/page-transition";
import { FileText, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const methods = [
  {
    href: "/templates",
    icon: FileText,
    title: "テンプレートから作成",
    description: "業種別のテンプレートを選んで、壁打ちで内容をカスタマイズします。光回線、ウォーターサーバー、FAQ応答など5種類のテンプレートを用意。",
    tag: "おすすめ",
    tagColor: "text-emerald-400 bg-emerald-400/8 border-emerald-400/20",
  },
  {
    href: "/projects/new/engine",
    icon: Sparkles,
    title: "ゼロから新規作成",
    description: "AIエンジンを選択し、チャッピー（AI構築アシスタント）と対話しながらゼロからコールシナリオを構築します。",
    tag: "カスタム",
    tagColor: "text-violet-400 bg-violet-400/8 border-violet-400/20",
  },
];

export default function ProjectNewPage() {
  return (
    <PageTransition>
      <div className="p-6 space-y-8 max-w-[800px]">
        <PageHeader title="新規プロジェクト" description="作成方法を選択してください" />

        <div className="grid md:grid-cols-2 gap-4">
          {methods.map((m, i) => (
            <motion.div
              key={m.href}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
            >
              <Link href={m.href} className="block h-full group">
                <div className="h-full rounded-xl border border-white/6 bg-card/40 hover:border-white/14 hover:bg-card/60 transition-all p-6 relative overflow-hidden">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                    <m.icon className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </div>

                  {/* Tag */}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border mb-3 ${m.tagColor}`}>
                    {m.tag}
                  </span>

                  <h3 className="text-[15px] font-bold group-hover:text-white transition-colors">{m.title}</h3>
                  <p className="text-[12px] text-muted-foreground/45 mt-2 leading-relaxed">{m.description}</p>

                  {/* CTA */}
                  <div className="flex items-center gap-1 mt-4 text-[11px] text-primary/50 group-hover:text-primary font-medium transition-colors">
                    選択する <ArrowRight className="w-3 h-3" />
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
