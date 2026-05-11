"use client";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/ui/page-transition";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, ExternalLink, Info, TrendingUp, Calendar, FileText } from "lucide-react";

const PLANS = [
  {
    name: "Starter",
    price: "¥29,000",
    cycle: "/月",
    minutes: "1,000 分",
    seats: "3 席",
    features: ["基本通話", "基本AI評価", "メールサポート"],
    current: false,
  },
  {
    name: "Pro",
    price: "¥98,000",
    cycle: "/月",
    minutes: "5,000 分",
    seats: "10 席",
    features: ["全機能", "高度AI評価", "A/B テスト", "Chat サポート"],
    current: true,
  },
  {
    name: "Enterprise",
    price: "応相談",
    cycle: "",
    minutes: "無制限",
    seats: "無制限",
    features: ["SLA保証", "専任CSM", "オンプレ対応", "SSO/SAML"],
    current: false,
  },
];

export default function BillingSettingsPage() {
  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-5xl">
        <PageHeader
          title="請求・プラン"
          description="プラン管理・使用量・請求書ダウンロード"
        >
          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">
            Stripe 未接続 — 登録が必要
          </Badge>
        </PageHeader>

        {/* Stripe 未接続案内 */}
        <Card className="p-5 space-y-3 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <h3 className="text-sm font-semibold text-amber-400">Stripe アカウントが必要です</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                月額課金・従量課金（通話分・SMS）は Stripe Billing で処理します。Stripe アカウント取得後、Publishable Key と Secret Key を環境変数に設定してください。
              </p>
              <a
                href="https://stripe.com/jp"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Stripe アカウント開設
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </Card>

        {/* 現在のプラン */}
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5" />現在のプラン
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PLANS.map((p) => (
              <Card
                key={p.name}
                className={`p-4 space-y-3 ${p.current ? "border-primary/60 bg-primary/5" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{p.name}</h3>
                  {p.current && (
                    <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                      利用中
                    </Badge>
                  )}
                </div>
                <div>
                  <span className="text-2xl font-bold">{p.price}</span>
                  <span className="text-xs text-muted-foreground ml-1">{p.cycle}</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>通話分: {p.minutes}</div>
                  <div>席数: {p.seats}</div>
                </div>
                <ul className="text-xs space-y-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <span className="text-primary">·</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={p.current ? "outline" : "default"}
                  size="sm"
                  className="w-full"
                  disabled
                >
                  {p.current ? "現在のプラン" : "プラン変更（Stripe連携後）"}
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* 使用量サマリ */}
        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" />今月の使用量
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { label: "通話分", value: "1,247 / 5,000", color: "primary" },
              { label: "SMS", value: "152 / 1,000", color: "primary" },
              { label: "AI 評価", value: "892 件", color: "muted-foreground" },
              { label: "ストレージ", value: "8.4 / 100 GB", color: "muted-foreground" },
            ].map((m) => (
              <div key={m.label} className="p-3 rounded border border-border/40">
                <div className="text-xs text-muted-foreground">{m.label}</div>
                <div className="text-sm font-mono mt-1">{m.value}</div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            ※ 表示は参考値です。実際の請求は Stripe 連携後に確定します。
          </p>
        </Card>

        {/* 請求書 */}
        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />請求書履歴
          </h3>
          <div className="text-center py-8 text-xs text-muted-foreground">
            Stripe 連携後、ここに過去の請求書が表示されます
          </div>
          <Button disabled variant="outline" className="w-full">
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            Stripe Customer Portal を開く
          </Button>
        </Card>
      </div>
    </PageTransition>
  );
}
