"use client";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { PageTransition, StaggerContainer, StaggerItem, MagneticButton } from "@/components/ui/page-transition";
import { mockLists } from "@/lib/mock-data";
import { Plus, List, Users, CheckCircle2, XCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function ListsPage() {
  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-[1400px]">
        <PageHeader title="ターゲットリスト" description="発信先の連絡先リストを管理します">
          <MagneticButton>
            <Link href="/lists/new">
              <Button size="sm" className="gradient-bg border-0 hover:opacity-90 h-8">
                <Plus className="w-4 h-4 mr-1.5" />新規リスト
              </Button>
            </Link>
          </MagneticButton>
        </PageHeader>

        <StaggerContainer className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {mockLists.map((list) => {
            const progress = list.total_count > 0
              ? Math.round((list._completed / list.total_count) * 100)
              : 0;
            return (
              <StaggerItem key={list.id}>
                <Link href={`/lists/${list.id}`} className="block group">
                  <SpotlightCard className="rounded-2xl border border-border/40 bg-card/60 hover:border-primary/30 hover:bg-card/80 transition-all duration-200 cursor-pointer p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <List className="w-5 h-5 text-primary" />
                      </div>
                      <Badge variant="outline" className="text-xs border-border/40 text-muted-foreground">
                        {new Date(list.created_at).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{list.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{list.description}</p>

                    <div className="mt-4 flex items-center gap-1 text-sm font-bold">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{list.total_count.toLocaleString()}</span>
                      <span className="text-xs font-normal text-muted-foreground ml-0.5">件</span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                        <span>進捗</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full gradient-bg rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />{list._completed.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />{list._pending.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1 text-red-400">
                        <XCircle className="w-3 h-3" />{list._failed.toLocaleString()}
                      </span>
                    </div>
                  </SpotlightCard>
                </Link>
              </StaggerItem>
            );
          })}

          {/* New list card */}
          <StaggerItem>
            <Link href="/lists/new" className="block">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="min-h-[200px] rounded-2xl border-dashed border border-border/30 hover:border-primary/30 hover:bg-primary/3 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl border border-dashed border-border/40 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">新しいリストを作成</p>
              </motion.div>
            </Link>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </PageTransition>
  );
}
