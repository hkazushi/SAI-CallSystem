"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/ui/page-transition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Webhook, Plus, Trash2, Copy, Check, AlertTriangle, Loader2, ExternalLink } from "lucide-react";

interface WebhookRow {
  id: string;
  name: string;
  url: string;
  events: string[];
  signing_secret_prefix: string;
  is_active: boolean;
  total_delivered: number;
  total_failed: number;
  last_delivered_at: string | null;
  last_error: string | null;
  created_at: string;
}

const ALL_EVENTS = [
  { id: "call.started", label: "通話開始" },
  { id: "call.completed", label: "通話完了" },
  { id: "call.failed", label: "通話失敗" },
  { id: "call.transferred", label: "オペレーター転送" },
  { id: "appointment.booked", label: "アポ取得" },
  { id: "appointment.canceled", label: "アポキャンセル" },
  { id: "contact.opted_out", label: "オプトアウト" },
  { id: "campaign.completed", label: "キャンペーン完了" },
  { id: "ai_eval.completed", label: "AI 評価完了" },
];

export default function WebhooksPage() {
  const [hooks, setHooks] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["appointment.booked"]);
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/webhooks");
    const json = await res.json();
    if (json.ok) setHooks(json.items);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleEvent = (id: string) => {
    setSelectedEvents((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  };

  const create = async () => {
    if (!name || !url || selectedEvents.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, url, events: selectedEvents }),
      });
      const json = await res.json();
      if (json.ok) {
        setNewSecret(json.signingSecret);
        setName(""); setUrl(""); setSelectedEvents(["appointment.booked"]);
        await load();
      } else {
        alert(json.error ?? "作成に失敗しました");
      }
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (id: string, active: boolean) => {
    const res = await fetch(`/api/webhooks/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ is_active: active }),
    });
    const json = await res.json();
    if (json.ok) await load();
  };

  const remove = async (id: string) => {
    if (!confirm("この Webhook を削除しますか？")) return;
    const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.ok) await load();
  };

  const copy = async (s: string) => {
    await navigator.clipboard.writeText(s);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-5xl">
        <PageHeader
          title="Webhook"
          description="イベント発生時に外部URLへPOST通知。Slack / Discord / 自社システム連携用"
        >
          <Button onClick={() => { setShowCreate(true); setNewSecret(null); }}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />新しい Webhook
          </Button>
        </PageHeader>

        {/* 新規作成 */}
        {showCreate && !newSecret && (
          <Card className="p-5 space-y-4 border-primary/30">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Webhook className="w-4 h-4" />新しい Webhook
            </h3>
            <div className="space-y-1.5">
              <Label>名前</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: Slack 営業チーム通知" />
            </div>
            <div className="space-y-1.5">
              <Label>送信先 URL（https のみ）</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>購読イベント（最低1つ）</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_EVENTS.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-xs p-2 rounded border border-border/40 cursor-pointer hover:bg-muted/30">
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(e.id)}
                      onChange={() => toggleEvent(e.id)}
                    />
                    <span className="font-mono text-[11px] text-muted-foreground">{e.id}</span>
                    <span className="ml-auto text-[11px]">{e.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={create} disabled={creating || !name || !url || selectedEvents.length === 0}>
                {creating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                作成
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>キャンセル</Button>
            </div>
          </Card>
        )}

        {/* 一度だけ表示される署名キー */}
        {newSecret && (
          <Card className="p-5 space-y-3 border-amber-500/40 bg-amber-500/5">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              署名検証用シークレットは二度と表示されません
            </h3>
            <p className="text-xs text-muted-foreground">
              受信側で <code className="font-mono text-primary">X-SAI-Signature</code> ヘッダーを HMAC-SHA256 で検証するために必要です。
            </p>
            <div className="flex items-center gap-2 p-3 bg-background rounded border border-border/60">
              <code className="text-xs font-mono flex-1 break-all">{newSecret}</code>
              <Button size="sm" variant="outline" onClick={() => copy(newSecret)}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setNewSecret(null); setShowCreate(false); }}
            >
              保存しました（閉じる）
            </Button>
          </Card>
        )}

        {/* 一覧 */}
        {loading ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">読み込み中...</Card>
        ) : hooks.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            まだ Webhook が登録されていません
          </Card>
        ) : (
          <div className="space-y-3">
            {hooks.map((h) => (
              <Card key={h.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                    <Webhook className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold">{h.name}</h3>
                      <Badge
                        variant="outline"
                        className={
                          h.is_active
                            ? "text-[10px] border-emerald-500/40 text-emerald-400"
                            : "text-[10px] border-muted-foreground/40 text-muted-foreground"
                        }
                      >
                        {h.is_active ? "有効" : "停止"}
                      </Badge>
                    </div>
                    <a
                      href={h.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono text-muted-foreground hover:text-primary flex items-center gap-1 truncate"
                    >
                      {h.url}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {h.events.map((e) => (
                        <Badge key={e} variant="outline" className="text-[10px] font-mono">{e}</Badge>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-3 mt-3 text-[11px]">
                      <div>
                        <div className="text-muted-foreground">配信成功</div>
                        <div className="font-mono text-emerald-400">{h.total_delivered.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">失敗</div>
                        <div className="font-mono text-red-400">{h.total_failed.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">最終配信</div>
                        <div className="font-mono">
                          {h.last_delivered_at ? new Date(h.last_delivered_at).toLocaleString("ja-JP") : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">署名 prefix</div>
                        <div className="font-mono">{h.signing_secret_prefix}</div>
                      </div>
                    </div>
                    {h.last_error && (
                      <div className="mt-2 p-2 rounded bg-red-500/10 text-[11px] text-red-400 font-mono">
                        最後のエラー: {h.last_error}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Switch
                      checked={h.is_active}
                      onCheckedChange={(v) => toggle(h.id, v)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                      onClick={() => remove(h.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
