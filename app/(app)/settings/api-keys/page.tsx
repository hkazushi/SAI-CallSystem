"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/ui/page-transition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Plus, Trash2, Copy, Check, AlertTriangle, Loader2 } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  rate_limit_rpm: number | null;
  is_active: boolean;
  last_used_at: string | null;
  last_used_ip: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

const ALL_SCOPES = [
  { id: "calls.read", label: "通話 読み取り" },
  { id: "calls.write", label: "通話 書き込み" },
  { id: "contacts.read", label: "顧客 読み取り" },
  { id: "contacts.write", label: "顧客 書き込み" },
  { id: "campaigns.read", label: "キャンペーン 読み取り" },
  { id: "campaigns.write", label: "キャンペーン 書き込み" },
  { id: "transcripts.read", label: "文字起こし 読み取り" },
  { id: "webhooks.manage", label: "Webhook 管理" },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["calls.read"]);
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/api-keys?includeRevoked=1");
    const json = await res.json();
    if (json.ok) setKeys(json.items);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleScope = (id: string) => {
    setSelectedScopes((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  };

  const create = async () => {
    if (!name || selectedScopes.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, scopes: selectedScopes }),
      });
      const json = await res.json();
      if (json.ok) {
        setNewSecret(json.plainSecret);
        setName("");
        setSelectedScopes(["calls.read"]);
        await load();
      } else {
        alert(json.error ?? "作成に失敗しました");
      }
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("このキーを失効しますか？このアクションは取り消せません。")) return;
    const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.ok) await load();
    else alert(json.error ?? "失効に失敗しました");
  };

  const copy = async (secret: string) => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-5xl">
        <PageHeader
          title="API キー"
          description="外部システム連携用の API キーを発行・管理"
        >
          <Button onClick={() => { setShowCreate(true); setNewSecret(null); }}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />新しいキーを発行
          </Button>
        </PageHeader>

        {/* 新規発行モーダル風カード */}
        {showCreate && !newSecret && (
          <Card className="p-5 space-y-4 border-primary/30">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <KeyRound className="w-4 h-4" />新しい API キー
            </h3>
            <div className="space-y-1.5">
              <Label>名前</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 外部ダッシュボード連携"
              />
            </div>
            <div className="space-y-1.5">
              <Label>スコープ（最低1つ）</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_SCOPES.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-xs p-2 rounded border border-border/40 cursor-pointer hover:bg-muted/30">
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(s.id)}
                      onChange={() => toggleScope(s.id)}
                    />
                    <span className="font-mono text-[11px] text-muted-foreground">{s.id}</span>
                    <span className="ml-auto text-[11px]">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={create} disabled={creating || !name || selectedScopes.length === 0}>
                {creating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                発行
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>キャンセル</Button>
            </div>
          </Card>
        )}

        {/* 一度だけ表示される平文secret */}
        {newSecret && (
          <Card className="p-5 space-y-3 border-amber-500/40 bg-amber-500/5">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              この値は二度と表示されません
            </h3>
            <p className="text-xs text-muted-foreground">
              安全な場所（パスワードマネージャー等）に保存してください。閉じた後に再表示はできません。
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
        <Card className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">読み込み中...</div>
          ) : keys.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              まだ API キーがありません
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">名前</th>
                  <th className="text-left px-4 py-2.5 font-medium">プレフィックス</th>
                  <th className="text-left px-4 py-2.5 font-medium">スコープ</th>
                  <th className="text-left px-4 py-2.5 font-medium">最終使用</th>
                  <th className="text-left px-4 py-2.5 font-medium">状態</th>
                  <th className="text-right px-4 py-2.5 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {keys.map((k) => (
                  <tr key={k.id} className={k.revoked_at ? "opacity-50" : ""}>
                    <td className="px-4 py-2.5 font-medium">{k.name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{k.prefix}...</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.slice(0, 3).map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px] font-mono">{s}</Badge>
                        ))}
                        {k.scopes.length > 3 && (
                          <Badge variant="outline" className="text-[10px]">+{k.scopes.length - 3}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleString("ja-JP") : "未使用"}
                    </td>
                    <td className="px-4 py-2.5">
                      {k.revoked_at ? (
                        <Badge variant="outline" className="text-[10px] border-red-500/40 text-red-400">失効</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400">有効</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {!k.revoked_at && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                          onClick={() => revoke(k.id)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />失効
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </PageTransition>
  );
}
