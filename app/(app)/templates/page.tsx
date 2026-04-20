"use client";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";
import { mockTemplates } from "@/lib/mock-data";
import { Zap, Bot, ArrowRight } from "lucide-react";
import { useState } from "react";

const industries = ["すべて", ...Array.from(new Set(mockTemplates.map((t) => t.industry)))];

export default function TemplatesPage() {
  const [filter, setFilter] = useState("すべて");
  const filtered = filter === "すべて" ? mockTemplates : mockTemplates.filter((t) => t.industry === filter);

  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-[1400px]">
        <PageHeader title="テンプレート" description="業種別のテンプレートからプロジェクトを素早く作成できます" />

        {/* Industry filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {industries.map((ind) => (
            <button
              key={ind}
              onClick={() => setFilter(ind)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                filter === ind
                  ? "bg-primary/15 text-primary border border-primary/25"
                  : "text-muted-foreground/50 hover:text-muted-foreground/80 border border-transparent hover:border-white/8"
              }`}
            >
              {ind}
            </button>
          ))}
        </div>

        <StaggerContainer className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((tpl) => (
            <StaggerItem key={tpl.id}>
              <Link href={`/templates/${tpl.slug}`} className="block h-full group">
                <div className="h-full rounded-xl border border-white/6 bg-card/40 hover:border-white/12 hover:bg-card/60 transition-all p-5 relative overflow-hidden">
                  {/* Provider indicator */}
                  <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-[40px] ${
                    tpl.default_provider === "vapi" ? "bg-amber-500/5" : "bg-blue-500/5"
                  }`} />

                  <div className="relative">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        tpl.default_provider === "vapi" ? "bg-amber-500/10" : "bg-blue-500/10"
                      }`}>
                        {tpl.default_provider === "vapi"
                          ? <Zap className="w-3.5 h-3.5 text-amber-400" />
                          : <Bot className="w-3.5 h-3.5 text-blue-400" />
                        }
                      </div>
                      <span className="text-[10px] tracking-wide font-semibold text-muted-foreground/40 uppercase">
                        {tpl.default_provider === "vapi" ? "柔軟型 / Vapi" : "厳格型 / DFCX"}
                      </span>
                    </div>

                    <h3 className="text-[14px] font-bold group-hover:text-white transition-colors leading-snug">{tpl.name}</h3>
                    <p className="text-[12px] text-muted-foreground/45 mt-1.5 leading-relaxed line-clamp-2">{tpl.description}</p>

                    {/* Industry tag + CTA */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                      <span className="text-[11px] text-muted-foreground/35 font-medium">{tpl.industry}</span>
                      <span className="flex items-center gap-1 text-[11px] text-primary/60 group-hover:text-primary font-medium transition-colors">
                        詳細を見る <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </PageTransition>
  );
}
