"use client";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AlertCircle, Phone } from "lucide-react";

export default function TwilioSettingsPage() {
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    alert("設定を保存しました（Twilio接続時に有効になります）");
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <PageHeader title="Twilio 設定" description="電話番号・通話インフラの設定" />

      {/* Notice banner */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-400/5 border border-blue-400/20 text-xs text-blue-400">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Twilio アカウントと電話番号を取得後、こちらで設定してください。設定後は実際の電話着信がDFCXエージェントに接続されます。
        </span>
      </div>

      <Card className="p-6 border-border/40 bg-card/60 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-red-400/10 border border-red-400/20 flex items-center justify-center">
            <Phone className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">Twilio アカウント</p>
            <p className="text-xs text-muted-foreground">APIキーと発信元電話番号を設定します</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Account SID</label>
          <Input
            type="text"
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={accountSid}
            onChange={(e) => setAccountSid(e.target.value)}
            className="bg-background/50 border-border/40 h-9 text-sm font-mono"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Auth Token</label>
          <Input
            type="password"
            placeholder="Auth Tokenを入力..."
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            className="bg-background/50 border-border/40 h-9 text-sm font-mono"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">発信元電話番号</label>
          <Input
            type="text"
            placeholder="+81312345678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="bg-background/50 border-border/40 h-9 text-sm font-mono"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Webhook URL（読み取り専用）</label>
          <div className="h-9 px-3 rounded-lg bg-background/30 border border-border/30 flex items-center font-mono text-xs text-muted-foreground select-all overflow-x-auto whitespace-nowrap">
            https://[your-domain]/api/projects/[id]/voice-orchestrator
          </div>
          <p className="text-[10px] text-muted-foreground/60">TwilioのWebhook URLにこのURLを設定してください（プロジェクトIDに応じて変更）</p>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            className="gradient-bg border-0 hover:opacity-90 h-8 text-xs px-5"
            onClick={handleSave}
            disabled={saved}
          >
            {saved ? "保存済み" : "保存"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
