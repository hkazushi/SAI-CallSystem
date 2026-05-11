"use client";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/ui/page-transition";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, ExternalLink, Info, KeyRound, ShieldCheck } from "lucide-react";

export default function TwilioSettingsPage() {
  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-3xl">
        <PageHeader
          title="Twilio 設定"
          description="発信元電話番号・SMS・通話録音の保管先"
        >
          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">
            未接続 — 登録が必要
          </Badge>
        </PageHeader>

        {/* 状態カード */}
        <Card className="p-5 space-y-3 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <h3 className="text-sm font-semibold text-amber-400">Twilio アカウントが必要です</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                発信・SMS・録音は Twilio Programmable Voice / Messaging API を使用します。Twilio で新規アカウントを取得し、Account SID / Auth Token / 電話番号を登録してください。
              </p>
              <a
                href="https://www.twilio.com/try-twilio"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Twilio で新規登録
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </Card>

        {/* 必要な情報 */}
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <KeyRound className="w-4 h-4" />接続に必要な情報
          </h3>
          <div className="space-y-2.5 text-xs">
            {[
              { key: "TWILIO_ACCOUNT_SID", desc: "アカウントを一意に識別する ID（AC...）" },
              { key: "TWILIO_AUTH_TOKEN", desc: "API 認証トークン（秘匿）" },
              { key: "TWILIO_PHONE_NUMBER", desc: "発信元として使用する電話番号（+819...）" },
              { key: "TWILIO_TWIML_APP_SID", desc: "Voice 用 TwiML アプリ SID（AP...）" },
              { key: "TWILIO_RECORDING_BUCKET", desc: "録音保管先 S3 バケット名" },
            ].map((x) => (
              <div key={x.key} className="flex items-start gap-3 p-2 rounded border border-border/40">
                <code className="font-mono text-[11px] text-primary w-56 flex-shrink-0">{x.key}</code>
                <span className="text-muted-foreground">{x.desc}</span>
              </div>
            ))}
          </div>
          <Button disabled className="w-full" variant="outline">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
            Twilio アカウント登録後に接続
          </Button>
        </Card>

        {/* 機能プレビュー */}
        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-semibold">接続後に有効になる機能</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {[
              { icon: Phone, title: "発信通話", desc: "AI エージェントから自動発信" },
              { icon: Phone, title: "SMS 通知", desc: "アポ取得時の自動 SMS" },
              { icon: Phone, title: "録音保管", desc: "通話録音の自動アーカイブ" },
            ].map((f) => (
              <div key={f.title} className="p-3 rounded border border-border/40 space-y-1">
                <div className="flex items-center gap-2">
                  <f.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-semibold">{f.title}</span>
                </div>
                <p className="text-muted-foreground text-[11px]">{f.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
