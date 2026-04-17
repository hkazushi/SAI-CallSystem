"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockProjects } from "@/lib/mock-data";
import { ChevronLeft, Plus, Save, Trash2, MessageSquare, GitBranch, Phone, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { useState } from "react";

type NodeType = "start" | "message" | "branch" | "end_success" | "end_fail";

interface FlowNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
}

const DEFAULT_NODES: FlowNode[] = [
  { id: "n1", type: "start", label: "通話開始", x: 300, y: 40 },
  { id: "n2", type: "message", label: "オープニング\nメッセージ", x: 300, y: 140 },
  { id: "n3", type: "branch", label: "興味あり？", x: 300, y: 260 },
  { id: "n4", type: "message", label: "詳細案内", x: 180, y: 380 },
  { id: "n5", type: "end_fail", label: "不要\n終了", x: 440, y: 380 },
  { id: "n6", type: "message", label: "アポ取得\nフロー", x: 180, y: 480 },
  { id: "n7", type: "end_success", label: "アポ確定\n終了", x: 180, y: 580 },
];

const nodeConfig: Record<NodeType, { icon: typeof MessageSquare; color: string; bg: string; border: string }> = {
  start:       { icon: Phone, color: "text-emerald-400", bg: "bg-emerald-400/15", border: "border-emerald-400/30" },
  message:     { icon: MessageSquare, color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
  branch:      { icon: GitBranch, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30" },
  end_success: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30" },
  end_fail:    { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30" },
};

export default function FlowEditorPage() {
  const { id } = useParams();
  const project = mockProjects.find((p) => p.id === id) ?? mockProjects[0];
  const [nodes, setNodes] = useState<FlowNode[]>(DEFAULT_NODES);
  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaved(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaved(false);
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-card/40 backdrop-blur-sm shrink-0">
        <Link href={`/projects/${id}`}>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" />{project.name}
          </Button>
        </Link>
        <div className="w-px h-5 bg-border/40" />
        <span className="text-sm font-medium">トークフローエディタ</span>
        <Badge variant="outline" className="border-border/30 text-muted-foreground text-xs">{nodes.length} ノード</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="border-border/40 h-7 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />ノード追加
          </Button>
          <Button size="sm" className="gradient-bg border-0 hover:opacity-90 h-7 text-xs" onClick={handleSave} disabled={saved}>
            <Save className="w-3.5 h-3.5 mr-1" />{saved ? "保存済み" : "保存"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Node Palette */}
        <div className="w-48 border-r border-border/30 bg-card/20 p-3 space-y-2 shrink-0 overflow-y-auto">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3">ノードパレット</p>
          {(Object.entries(nodeConfig) as [NodeType, typeof nodeConfig.start][]).map(([type, cfg]) => {
            const Icon = cfg.icon;
            const labels: Record<NodeType, string> = {
              start: "開始", message: "メッセージ", branch: "分岐", end_success: "成功終了", end_fail: "失敗終了"
            };
            return (
              <div
                key={type}
                draggable
                className={`flex items-center gap-2 p-2.5 rounded-lg border ${cfg.border} ${cfg.bg} text-xs cursor-grab hover:opacity-80 transition-opacity`}
              >
                <Icon className={`w-3.5 h-3.5 ${cfg.color} shrink-0`} />
                <span className={cfg.color}>{labels[type]}</span>
              </div>
            );
          })}
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-auto bg-[oklch(0.07_0_0)]" style={{ backgroundImage: "radial-gradient(circle, oklch(1 0 0 / 4%) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
          <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
            {/* Edges */}
            <line x1="324" y1="80" x2="324" y2="140" stroke="oklch(0.5 0.22 264 / 40%)" strokeWidth="2" />
            <line x1="324" y1="190" x2="324" y2="260" stroke="oklch(0.5 0.22 264 / 40%)" strokeWidth="2" />
            <line x1="300" y1="310" x2="204" y2="380" stroke="#34d399aa" strokeWidth="2" />
            <text x="228" y="365" fill="#34d399" fontSize="10">はい</text>
            <line x1="348" y1="310" x2="464" y2="380" stroke="#f87171aa" strokeWidth="2" />
            <text x="406" y="355" fill="#f87171" fontSize="10">いいえ</text>
            <line x1="204" y1="440" x2="204" y2="480" stroke="oklch(0.5 0.22 264 / 40%)" strokeWidth="2" />
            <line x1="204" y1="540" x2="204" y2="580" stroke="#34d399aa" strokeWidth="2" />
          </svg>
          {nodes.map((node) => {
            const cfg = nodeConfig[node.type];
            const Icon = cfg.icon;
            return (
              <div
                key={node.id}
                style={{ position: "absolute", left: node.x, top: node.y, transform: "translateX(-50%)" }}
                onClick={() => setSelected(node.id)}
                className={`w-28 min-h-[40px] rounded-xl border ${cfg.border} ${cfg.bg} flex flex-col items-center justify-center gap-1 cursor-pointer transition-all p-2 ${selected === node.id ? "ring-2 ring-primary/50 shadow-lg shadow-primary/10" : "hover:border-opacity-60"}`}
              >
                <Icon className={`w-4 h-4 ${cfg.color}`} />
                <span className={`text-[10px] font-medium text-center leading-snug whitespace-pre-line ${cfg.color}`}>{node.label}</span>
              </div>
            );
          })}
        </div>

        {/* Properties Panel */}
        {selected && (
          <div className="w-56 border-l border-border/30 bg-card/20 p-4 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ノード設定</p>
              <button className="text-muted-foreground hover:text-foreground" onClick={() => setSelected(null)}>✕</button>
            </div>
            {(() => {
              const node = nodes.find((n) => n.id === selected);
              if (!node) return null;
              return (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">ラベル</p>
                    <input
                      value={node.label}
                      onChange={(e) => setNodes(nodes.map((n) => n.id === selected ? { ...n, label: e.target.value } : n))}
                      className="w-full px-2 py-1.5 rounded-lg bg-background/50 border border-border/40 text-xs focus:outline-none focus:border-primary/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">タイプ</p>
                    <p className="text-xs font-medium">{node.type}</p>
                  </div>
                  {node.type === "message" && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">メッセージ</p>
                      <textarea
                        rows={4}
                        placeholder="AIが発話するテキスト..."
                        className="w-full px-2 py-1.5 rounded-lg bg-background/50 border border-border/40 text-xs resize-none focus:outline-none focus:border-primary/40"
                      />
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs h-7"
                    onClick={() => { setNodes(nodes.filter((n) => n.id !== selected)); setSelected(null); }}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />削除
                  </Button>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
