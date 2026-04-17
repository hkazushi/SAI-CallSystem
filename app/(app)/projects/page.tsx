"use client";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { PageTransition, StaggerContainer, StaggerItem, MagneticButton } from "@/components/ui/page-transition";
import { mockProjects } from "@/lib/mock-data";
import { Plus, PhoneIncoming, PhoneOutgoing, Bot, Zap } from "lucide-react";
import { motion } from "framer-motion";

const statusConfig = {
  active:    { label: "稼働中", color: "text-emerald-400", dot: "bg-emerald-400" },
  paused:    { label: "一時停止", color: "text-amber-400", dot: "bg-amber-400" },
  draft:     { label: "下書き", color: "text-muted-foreground", dot: "bg-white/20" },
  completed: { label: "完了", color: "text-blue-400", dot: "bg-blue-400" },
};

export default function ProjectsPage() {
  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-[1400px]">
        <PageHeader title="プロジェクト" description="音声AIエージェントの通話プロジェクトを管理します">
          <MagneticButton>
            <Link href="/projects/new">
              <Button size="sm" className="gradient-bg border-0 hover:opacity-90 h-8">
                <Plus className="w-4 h-4 mr-1.5" />新規プロジェクト
              </Button>
            </Link>
          </MagneticButton>
        </PageHeader>

        <StaggerContainer className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {mockProjects.map((p) => {
            const status = statusConfig[p.status];
            return (
              <StaggerItem key={p.id}>
                <Link href={`/projects/${p.id}`} className="block h-full group">
                  <SpotlightCard className="h-full rounded-xl border border-white/6 bg-card/40 hover:border-white/12 hover:bg-card/60 transition-all duration-200 cursor-pointer p-5 relative overflow-hidden">
                    {/* Status indicator top-left edge */}
                    <div className={`absolute top-0 left-0 w-[3px] h-full rounded-l-xl ${status.dot} opacity-40 group-hover:opacity-70 transition-opacity`} />

                    {/* Header */}
                    <div className="flex items-start justify-between mb-3.5">
                      <div className="flex items-center gap-1.5">
                        <motion.div
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`}
                          animate={p.status === "active" ? { opacity: [1, 0.35, 1] } : {}}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <span className={`text-[11px] font-medium ${status.color}`}>{status.label}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-semibold tracking-wide ${p.direction === "outbound" ? "text-violet-400/60" : "text-blue-400/60"}`}>
                          {p.direction === "outbound" ? "OB" : "IB"}
                        </span>
                        <span className="text-white/15">·</span>
                        <span className="text-[10px] text-muted-foreground/40">
                          {p.ai_provider === "vapi" ? "Vapi" : "Dialogflow"}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-bold text-[14px] group-hover:text-white transition-colors leading-snug">{p.name}</h3>
                    <p className="text-[12px] text-muted-foreground/50 mt-1.5 line-clamp-2 leading-relaxed">{p.description}</p>

                    {p._stats.total_calls > 0 ? (
                      <div className="mt-4 pt-3.5 border-t border-white/5 flex items-end justify-between">
                        <div>
                          <p className="text-[10px] text-muted-foreground/40 tracking-wide">通話数</p>
                          <p className="num text-[1.4rem] font-extrabold leading-tight mt-0.5">{p._stats.total_calls.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground/40">AI解決率</p>
                          <p className="num text-[1.4rem] font-extrabold leading-tight mt-0.5 text-violet-400/80">{p._stats.ai_resolution_rate}%</p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 pt-3.5 border-t border-white/5">
                        <p className="text-[11px] text-muted-foreground/35">まだ通話データがありません</p>
                      </div>
                    )}
                  </SpotlightCard>
                </Link>
              </StaggerItem>
            );
          })}

          {/* New project card */}
          <StaggerItem>
            <Link href="/projects/new" className="block h-full">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="h-full min-h-[200px] rounded-xl border border-dashed border-white/8 hover:border-primary/25 hover:bg-primary/3 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg border border-dashed border-white/12 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white/25" />
                </div>
                <p className="text-[12px] text-white/25">新しいプロジェクトを作成</p>
              </motion.div>
            </Link>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </PageTransition>
  );
}
