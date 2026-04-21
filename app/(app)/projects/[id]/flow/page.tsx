"use client";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockProjects } from "@/lib/mock-data";
import { DEFAULT_SCENARIOS, DEFAULT_ESCALATIONS } from "@/lib/ai-builder";
import type { CallSettings } from "@/lib/ai-builder";
import { buildDfcxAgent } from "@/lib/dfcx-compiler";
import type { DfcxPage } from "@/lib/dfcx-compiler";
import {
  ChevronLeft, Save, Phone, GitBranch, MessageSquare,
  CheckCircle2, XCircle, Users, Layers, Code, Zap,
} from "lucide-react";

// Page種別に応じた視覚設定
const PAGE_VISUAL: Record<string, { icon: typeof Phone; color: string; bg: string; border: string }> = {
  Opening:        { icon: Phone,         color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30" },
  Qualify:        { icon: GitBranch,     color: "text-primary",     bg: "bg-primary/10",     border: "border-primary/30" },
  Proposal:       { icon: MessageSquare, color: "text-violet-400",  bg: "bg-violet-400/10",  border: "border-violet-400/30" },
  Human_Transfer: { icon: Users,         color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/30" },
  End_Success:    { icon: CheckCircle2,  color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30" },
  End_Fail:       { icon: XCircle,       color: "text-red-400",     bg: "bg-red-400/10",     border: "border-red-400/30" },
};

interface Positioned {
  page: DfcxPage;
  x: number;
  y: number;
}

// 静的レイアウト: DFCXエージェントの6ページを2D配置
const LAYOUT: Record<string, { x: number; y: number }> = {
  Opening:        { x: 380, y: 60 },
  Qualify:        { x: 380, y: 200 },
  Proposal:       { x: 200, y: 340 },
  Human_Transfer: { x: 580, y: 340 },
  End_Success:    { x: 200, y: 480 },
  End_Fail:       { x: 400, y: 480 },
};

export default function FlowEditorPage() {
  const { id } = useParams();
  const project = mockProjects.find((p) => p.id === id) ?? mockProjects[0];

  const settings: CallSettings = useMemo(() => ({
    persona: { agentName: "田中", speakingStyle: "polite", language: "ja", introSelf: "田中と申します" },
    companyName: "株式会社サンプル",
    productName: project.product_info.product_name,
    pricing: project.product_info.pricing,
    targetCustomer: project.product_info.target_customer,
    keyFeatures: project.product_info.key_features,
    firstMessage: project.first_message,
    scenarios: DEFAULT_SCENARIOS,
    faqs: [],
    escalations: DEFAULT_ESCALATIONS,
    successCondition: "アポイントメントの取得または資料送付の合意",
    maxCallDuration: 300,
    voice: {
      voiceId: project.voice_settings.voice_id,
      speed: project.voice_settings.speed,
      gender: project.voice_settings.gender as "male" | "female",
    },
  }), [project]);

  const agent = useMemo(() => buildDfcxAgent(settings), [settings]);
  const pages = agent.startFlow.pages;

  const positioned: Positioned[] = useMemo(
    () => pages.map((page) => ({
      page,
      x: LAYOUT[page.displayName]?.x ?? 300,
      y: LAYOUT[page.displayName]?.y ?? 300,
    })),
    [pages],
  );

  const [selected, setSelected] = useState<string | null>("Opening");
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaved(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaved(false);
  }

  const selectedPage = pages.find((p) => p.displayName === selected);

  // エッジを計算: 各Pageのtarget → 配置座標
  const edges: { from: string; to: string; label?: string; kind: "intent" | "condition" | "flow" }[] = [];
  for (const p of pages) {
    p.transitionRoutes?.forEach((route) => {
      const target = route.targetPage ?? route.targetFlow;
      if (!target) return;
      if (!LAYOUT[target]) return;
      edges.push({
        from: p.displayName,
        to: target,
        label: route.intent ?? route.condition ?? undefined,
        kind: route.intent ? "intent" : route.condition ? "condition" : "flow",
      });
    });
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-card/40 backdrop-blur-sm shrink-0">
        <Link href={`/projects/${id}`}>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" />{project.name}
          </Button>
        </Link>
        <div className="w-px h-5 bg-white/10" />
        <span className="text-sm font-medium">DFCX フローエディタ</span>
        <Badge variant="outline" className="border-white/10 text-muted-foreground text-[10px] font-mono">
          {agent.startFlow.displayName}
        </Badge>
        <Badge variant="outline" className="border-white/10 text-muted-foreground text-[10px]">
          {pages.length} Pages · {agent.intents.length} Intents
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <Link href={`/projects/${id}/dfcx`}>
            <Button variant="outline" size="sm" className="border-white/10 h-7 text-xs gap-1">
              <Code className="w-3 h-3" />Agent設定
            </Button>
          </Link>
          <Button size="sm" className="gradient-bg border-0 hover:opacity-90 h-7 text-xs" onClick={handleSave} disabled={saved}>
            <Save className="w-3.5 h-3.5 mr-1" />{saved ? "保存済み" : "保存"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Page Palette (Read-only list) */}
        <aside className="w-56 border-r border-white/5 bg-card/20 p-3 shrink-0 overflow-y-auto">
          <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Layers className="w-3 h-3" />Pages
          </p>
          <div className="space-y-1">
            {pages.map((p) => {
              const vis = PAGE_VISUAL[p.displayName] ?? { icon: Layers, color: "text-muted-foreground", bg: "bg-white/5", border: "border-white/10" };
              const Icon = vis.icon;
              const active = selected === p.displayName;
              return (
                <button
                  key={p.displayName}
                  onClick={() => setSelected(p.displayName)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all ${
                    active ? `${vis.bg} border ${vis.border}` : "hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${vis.color}`} />
                  <span className={`text-[11px] font-mono font-medium ${active ? vis.color : "text-muted-foreground/70"}`}>
                    {p.displayName}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mt-6 mb-3 flex items-center gap-1.5">
            <Zap className="w-3 h-3" />Legend
          </p>
          <div className="space-y-1.5 text-[10px] text-muted-foreground/60">
            <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-primary/60" />intent route</div>
            <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-amber-400/60 border-dashed" style={{ borderBottom: "1px dashed currentColor", background: "none" }} />condition route</div>
            <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-emerald-400/60" />flow transition</div>
          </div>
        </aside>

        {/* Canvas */}
        <div
          className="flex-1 relative overflow-auto bg-[oklch(0.07_0_0)]"
          style={{ backgroundImage: "radial-gradient(circle, oklch(1 0 0 / 4%) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        >
          <div style={{ position: "relative", width: 900, height: 620 }}>
            <svg className="absolute inset-0 pointer-events-none" width="900" height="620">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="oklch(0.5 0.22 264 / 70%)" />
                </marker>
                <marker id="arrow-amber" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24aa" />
                </marker>
                <marker id="arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#34d399aa" />
                </marker>
              </defs>
              {edges.map((e, i) => {
                const a = LAYOUT[e.from];
                const b = LAYOUT[e.to];
                if (!a || !b) return null;
                // 端点調整（カード中心→端）
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const pad = 48;
                const x1 = a.x + (dx / len) * pad;
                const y1 = a.y + (dy / len) * pad + 20;
                const x2 = b.x - (dx / len) * pad;
                const y2 = b.y - (dy / len) * pad + 20;
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                const stroke = e.kind === "intent" ? "oklch(0.5 0.22 264 / 70%)" : e.kind === "condition" ? "#fbbf24aa" : "#34d399aa";
                const marker = e.kind === "intent" ? "url(#arrow)" : e.kind === "condition" ? "url(#arrow-amber)" : "url(#arrow-green)";
                return (
                  <g key={`edge-${i}`}>
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={stroke}
                      strokeWidth="1.5"
                      strokeDasharray={e.kind === "condition" ? "4 3" : undefined}
                      markerEnd={marker}
                    />
                    {e.label && e.label.length < 20 && (
                      <text
                        x={midX} y={midY - 4}
                        textAnchor="middle"
                        fontSize="9"
                        fill={e.kind === "intent" ? "oklch(0.75 0.18 264)" : e.kind === "condition" ? "#fbbf24" : "#34d399"}
                        className="font-mono"
                      >
                        {e.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {positioned.map(({ page, x, y }) => {
              const vis = PAGE_VISUAL[page.displayName] ?? { icon: Layers, color: "text-muted-foreground", bg: "bg-white/5", border: "border-white/10" };
              const Icon = vis.icon;
              const active = selected === page.displayName;
              const routeCount = page.transitionRoutes?.length ?? 0;
              return (
                <div
                  key={page.displayName}
                  style={{ position: "absolute", left: x, top: y, transform: "translateX(-50%)" }}
                  onClick={() => setSelected(page.displayName)}
                  className={`w-[140px] rounded-xl border ${vis.border} ${vis.bg} p-3 cursor-pointer transition-all ${
                    active ? "ring-2 ring-primary/50 shadow-lg shadow-primary/10 scale-[1.03]" : "hover:border-opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon className={`w-3.5 h-3.5 ${vis.color}`} />
                    <span className={`text-[11px] font-mono font-bold ${vis.color}`}>{page.displayName}</span>
                  </div>
                  {page.entryFulfillment?.messages[0]?.text && (
                    <p className="text-[9px] text-muted-foreground/60 leading-snug line-clamp-2">
                      {page.entryFulfillment.messages[0].text.text[0]}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-[9px] text-muted-foreground/40">
                    <span>{routeCount} routes</span>
                    {page.form && <span>· form</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Properties Panel */}
        {selectedPage && (
          <aside className="w-72 border-l border-white/5 bg-card/20 p-4 shrink-0 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Page設定</p>
              <button className="text-muted-foreground hover:text-foreground text-xs" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-muted-foreground/50 mb-1">Display Name</p>
                <p className="font-mono text-[12px] font-semibold">{selectedPage.displayName}</p>
              </div>

              {selectedPage.entryFulfillment?.messages[0]?.text && (
                <div>
                  <p className="text-[10px] text-muted-foreground/50 mb-1">Entry Message</p>
                  <p className="text-[11px] leading-relaxed bg-white/3 rounded-lg p-2 border border-white/5">
                    {selectedPage.entryFulfillment.messages[0].text.text[0]}
                  </p>
                </div>
              )}

              {selectedPage.form && selectedPage.form.parameters.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground/50 mb-1.5">Form Parameters</p>
                  <div className="space-y-1.5">
                    {selectedPage.form.parameters.map((param) => (
                      <div key={param.displayName} className="bg-white/3 rounded-lg p-2 border border-white/5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-semibold">{param.displayName}</span>
                          {param.required && <span className="text-[9px] px-1 rounded bg-red-400/15 text-red-300">required</span>}
                        </div>
                        <p className="text-[10px] text-violet-300/80 font-mono mt-0.5">{param.entityType}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPage.transitionRoutes && selectedPage.transitionRoutes.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground/50 mb-1.5">
                    Routes ({selectedPage.transitionRoutes.length})
                  </p>
                  <div className="space-y-1">
                    {selectedPage.transitionRoutes.map((route, i) => (
                      <div key={i} className="text-[10px] leading-tight border-l-2 border-primary/30 pl-2 py-1 font-mono">
                        {route.intent && <div className="text-primary/90">→ {route.intent}</div>}
                        {route.condition && <div className="text-amber-300/80">if {route.condition.slice(0, 40)}</div>}
                        {route.targetPage && <div className="text-emerald-300/70 mt-0.5">⇒ {route.targetPage}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPage.eventHandlers && selectedPage.eventHandlers.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground/50 mb-1.5">Event Handlers</p>
                  <div className="space-y-1">
                    {selectedPage.eventHandlers.map((ev, i) => (
                      <div key={i} className="text-[10px] font-mono border-l-2 border-amber-400/30 pl-2 py-1">
                        <span className="text-amber-300/80">{ev.event}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground/30 pt-3 border-t border-white/5 leading-relaxed">
                Phase Aでは閲覧のみ。編集はシナリオドラフトから再コンパイルしてください。
              </p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
