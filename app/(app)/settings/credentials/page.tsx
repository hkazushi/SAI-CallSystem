"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockCredentials } from "@/lib/mock-data";
import { Plus, Zap, Bot, Phone, Eye, EyeOff, CheckCircle2, Trash2, AlertCircle, ExternalLink, Terminal } from "lucide-react";

const providerConfig = {
  vapi:         { icon: Zap, label: "Vapi.ai", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  dialogflow_cx:{ icon: Bot, label: "Dialogflow CX", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
  twilio:       { icon: Phone, label: "Twilio", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
};

export default function CredentialsPage() {
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [addingProvider, setAddingProvider] = useState<string | null>(null);
  const [dfcxStatus, setDfcxStatus] = useState<{
    configured: boolean;
    projectId?: string;
    location?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/dfcx/status")
      .then((r) => r.json())
      .then(setDfcxStatus)
      .catch(() => setDfcxStatus({ configured: false, error: "取得に失敗" }));
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <PageHeader title="AI認証情報" description="各AIプロバイダーのAPIキーを管理します">
        <Button size="sm" className="gradient-bg border-0 hover:opacity-90 h-8 text-xs" onClick={() => setAddingProvider("vapi")}>
          <Plus className="w-4 h-4 mr-1.5" />認証情報を追加
        </Button>
      </PageHeader>

      {/* DFCX (GCP Service Account) 実環境ステータス */}
      <Card className={`p-5 border-2 ${dfcxStatus?.configured ? "border-emerald-400/30 bg-emerald-400/5" : "border-amber-400/30 bg-amber-400/5"}`}>
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl ${dfcxStatus?.configured ? "bg-emerald-400/15 border border-emerald-400/30" : "bg-amber-400/15 border border-amber-400/30"} flex items-center justify-center shrink-0`}>
            <Bot className={`w-5 h-5 ${dfcxStatus?.configured ? "text-emerald-400" : "text-amber-400"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">Dialogflow CX（実環境）</h3>
              {dfcxStatus?.configured && (
                <Badge className="bg-emerald-400/15 text-emerald-400 border-0 text-[10px] h-4 px-1.5">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 inline" />接続可能
                </Badge>
              )}
              {dfcxStatus && !dfcxStatus.configured && (
                <Badge className="bg-amber-400/15 text-amber-400 border-0 text-[10px] h-4 px-1.5">
                  未設定
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">GCPサービスアカウントでDFCXエージェントに直接デプロイ・テスト会話します</p>

            {dfcxStatus?.configured ? (
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-background/50 border border-border/30 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-muted-foreground/60">GCPプロジェクト</p>
                  <p className="font-mono mt-0.5">{dfcxStatus.projectId}</p>
                </div>
                <div className="bg-background/50 border border-border/30 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-muted-foreground/60">リージョン</p>
                  <p className="font-mono mt-0.5">{dfcxStatus.location}</p>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2 text-[11px]">
                <p className="text-amber-400/80">{dfcxStatus?.error ?? "読み込み中..."}</p>
                <div className="bg-background/70 border border-border/30 rounded-lg p-3 space-y-2">
                  <p className="font-semibold text-[11px] flex items-center gap-1">
                    <Terminal className="w-3 h-3" />セットアップ手順
                  </p>
                  <ol className="space-y-1 text-muted-foreground/80 list-decimal list-inside">
                    <li>
                      <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                        GCPコンソール <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      でサービスアカウント作成（ロール: <span className="font-mono text-amber-300">Dialogflow API Admin</span>）
                    </li>
                    <li>JSON鍵をダウンロード → <span className="font-mono text-amber-300">jq -c . key.json</span> で1行化</li>
                    <li>
                      プロジェクトルートに <span className="font-mono text-primary">.env.local</span> を作成し以下を記入:
                    </li>
                  </ol>
                  <pre className="bg-black/40 border border-border/30 rounded px-2 py-1.5 text-[10px] font-mono overflow-x-auto leading-relaxed">
{`GCP_PROJECT_ID=your-gcp-project-id
GCP_LOCATION=asia-northeast1
GCP_SERVICE_ACCOUNT_JSON={"type":"service_account",...}`}
                  </pre>
                  <p className="text-muted-foreground/60 text-[10px] pt-1">設定後 <span className="font-mono">npm run dev</span> を再起動</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-400/5 border border-amber-400/20 text-xs text-amber-400">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>APIキーは暗号化して保存されます。セキュリティのため、登録後はキーの全文を表示できません。</span>
      </div>

      {/* Existing credentials */}
      <div className="space-y-4">
        {mockCredentials.map((cred) => {
          const provider = providerConfig[cred.provider as keyof typeof providerConfig];
          if (!provider) return null;
          const Icon = provider.icon;
          const visible = showKey[cred.id];

          return (
            <Card key={cred.id} className={`p-5 border-border/40 bg-card/60`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${provider.bg} border ${provider.border} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${provider.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{cred.label}</h3>
                    {cred.is_default && (
                      <Badge className="bg-emerald-400/10 text-emerald-400 border-0 text-[10px] h-4 px-1.5">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 inline" />デフォルト
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{provider.label}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-8 px-3 rounded-lg bg-background/50 border border-border/30 flex items-center font-mono text-xs text-muted-foreground">
                      {visible ? "sk-vapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" : "••••••••••••••••••••••••••••••••"}
                    </div>
                    <button
                      onClick={() => setShowKey({ ...showKey, [cred.id]: !visible })}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    登録日: {new Date(cred.created_at).toLocaleDateString("ja-JP")}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="border-border/40 h-7 text-xs">更新</Button>
                  <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-7 text-xs">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add new (Twilio placeholder) */}
      <Card className="p-5 border-dashed border-border/30 bg-transparent">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl ${providerConfig.twilio.bg} border ${providerConfig.twilio.border} flex items-center justify-center shrink-0`}>
            <Phone className={`w-5 h-5 ${providerConfig.twilio.color}`} />
          </div>
          <div>
            <p className="font-semibold text-sm">Twilio</p>
            <p className="text-xs text-muted-foreground">電話番号・通話インフラの設定</p>
          </div>
          <Button size="sm" variant="outline" className="ml-auto border-border/40 h-7 text-xs">
            <Plus className="w-3 h-3 mr-1" />設定
          </Button>
        </div>
      </Card>

      {/* Add modal (simplified inline) */}
      {addingProvider && (
        <Card className="p-5 border-primary/30 bg-card/80 space-y-4">
          <h3 className="font-semibold text-sm">新しい認証情報を追加</h3>
          <div className="space-y-2">
            <Label className="text-xs">プロバイダー</Label>
            <div className="flex gap-2">
              {Object.entries(providerConfig).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setAddingProvider(key)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${addingProvider === key ? `${cfg.bg} ${cfg.border} ${cfg.color}` : "border-border/30 text-muted-foreground"}`}
                  >
                    <Icon className="w-3.5 h-3.5" />{cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">ラベル</Label>
            <Input placeholder="例: Vapi本番アカウント" className="bg-background/50 border-border/40 h-9 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">APIキー <span className="text-red-400">*</span></Label>
            <Input type="password" placeholder="APIキーを入力..." className="bg-background/50 border-border/40 h-9 text-sm font-mono" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="border-border/40 h-8 text-xs" onClick={() => setAddingProvider(null)}>
              キャンセル
            </Button>
            <Button size="sm" className="gradient-bg border-0 hover:opacity-90 h-8 text-xs" onClick={() => setAddingProvider(null)}>
              保存
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
