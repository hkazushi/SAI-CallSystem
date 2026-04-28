"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { PageTransition, StaggerContainer, StaggerItem, MagneticButton } from "@/components/ui/page-transition";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface SavedProject {
  id: string;
  name: string;
  template_id: string | null;
  dfcx_agent_id: string | null;
  dfcx_agent_name: string | null;
  dfcx_deploy_status: string | null;
  dfcx_deployed_at: string | null;
  created_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<SavedProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch("/api/projects-store");
        const data = (await resp.json()) as { projects?: SavedProject[]; error?: string };
        if (cancelled) return;
        if (!resp.ok) throw new Error(data.error ?? `読み込み失敗 (${resp.status})`);
        setProjects(data.projects ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "読み込み失敗");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const statusBadge = (s: string | null) => {
    if (s === "ready") return { label: "稼働中", color: "text-emerald-400", dot: "bg-emerald-400" };
    if (s === "training") return { label: "学習中", color: "text-amber-400", dot: "bg-amber-400" };
    if (s === "deploying") return { label: "デプロイ中", color: "text-blue-400", dot: "bg-blue-400" };
    if (s === "error") return { label: "エラー", color: "text-red-400", dot: "bg-red-400" };
    return { label: "下書き", color: "text-muted-foreground", dot: "bg-white/20" };
  };

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

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-[12px] text-red-200">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <StaggerContainer className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects === null && !error && (
            <div className="col-span-full flex items-center gap-2 text-[12px] text-muted-foreground/60">
              <Loader2 className="w-3 h-3 animate-spin" /> 読み込み中…
            </div>
          )}
          {projects?.map((p) => {
            const status = statusBadge(p.dfcx_deploy_status);
            return (
              <StaggerItem key={p.id}>
                <Link href={`/projects/${p.id}`} className="block h-full group">
                  <SpotlightCard className="h-full rounded-xl border border-white/6 bg-card/40 hover:border-white/12 hover:bg-card/60 transition-all duration-200 cursor-pointer p-5 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-[3px] h-full rounded-l-xl ${status.dot} opacity-40 group-hover:opacity-70 transition-opacity`} />

                    <div className="flex items-start justify-between mb-3.5">
                      <div className="flex items-center gap-1.5">
                        <motion.div
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`}
                          animate={p.dfcx_deploy_status === "ready" ? { opacity: [1, 0.35, 1] } : {}}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <span className={`text-[11px] font-medium ${status.color}`}>{status.label}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground/40">DFCX</span>
                    </div>

                    <h3 className="font-bold text-[14px] group-hover:text-white transition-colors leading-snug">{p.name}</h3>
                    {p.template_id && (
                      <p className="text-[12px] text-muted-foreground/50 mt-1.5 line-clamp-2 leading-relaxed">テンプレ: {p.template_id}</p>
                    )}

                    <div className="mt-4 pt-3.5 border-t border-white/5 flex items-end justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground/40 tracking-wide">作成</p>
                        <p className="text-[11px] font-medium leading-tight mt-0.5">{new Date(p.created_at).toLocaleString("ja-JP")}</p>
                      </div>
                      {p.dfcx_agent_id && (
                        <p className="text-[9px] font-mono text-muted-foreground/40 truncate max-w-[120px]">{p.dfcx_agent_id.slice(0, 8)}…</p>
                      )}
                    </div>
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
