"use client";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/ui/page-transition";
import { Card } from "@/components/ui/card";
import {
  UserCog, Users, Key, ShieldCheck, Phone, Building2, Webhook, KeyRound, ChevronRight, Settings as SettingsIcon, CreditCard, Lock,
} from "lucide-react";

const sections: Array<{
  title: string;
  description: string;
  items: Array<{ href: string; label: string; description: string; icon: React.ElementType }>;
}> = [
  {
    title: "組織・メンバー",
    description: "組織情報とチームメンバーを管理",
    items: [
      { href: "/settings/organization", label: "組織情報", description: "組織名・業種・タイムゾーンなど", icon: Building2 },
      { href: "/settings/members", label: "メンバー・招待", description: "メンバーの追加・ロール管理", icon: UserCog },
      { href: "/settings/users", label: "ユーザー管理（レガシー）", description: "従来のユーザー一覧", icon: Users },
    ],
  },
  {
    title: "セキュリティ・監査",
    description: "アクセス制御と監査ログ",
    items: [
      { href: "/settings/audit", label: "監査ログ", description: "全操作の改ざん不能ログ", icon: ShieldCheck },
      { href: "/settings/api-keys", label: "API キー", description: "外部連携用のキー発行・失効", icon: KeyRound },
      { href: "/settings/webhooks", label: "Webhook", description: "イベント通知の購読先", icon: Webhook },
      { href: "/settings/sso", label: "SSO / SAML", description: "Enterprise 向けシングルサインオン", icon: Lock },
    ],
  },
  {
    title: "プロバイダー連携",
    description: "外部サービスとの接続",
    items: [
      { href: "/settings/credentials", label: "AI 認証情報", description: "Vapi / Dialogflow CX の API キー", icon: Key },
      { href: "/settings/twilio", label: "Twilio 設定", description: "通話・SMS の電話番号管理", icon: Phone },
      { href: "/settings/billing", label: "請求・プラン", description: "Stripe 連携・使用量と請求", icon: CreditCard },
    ],
  },
];

export default function SettingsHomePage() {
  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-[1200px]">
        <PageHeader
          title="設定"
          description="組織・セキュリティ・プロバイダー連携を一元管理"
        />

        {sections.map((sec) => (
          <section key={sec.title} className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <SettingsIcon className="w-3.5 h-3.5 text-muted-foreground" />
                {sec.title}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{sec.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {sec.items.map((it) => {
                const Icon = it.icon;
                return (
                  <Link key={it.href} href={it.href}>
                    <Card className="p-4 hover:bg-muted/30 transition-colors group cursor-pointer h-full">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1">
                            <h3 className="text-sm font-semibold truncate">{it.label}</h3>
                            <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{it.description}</p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </PageTransition>
  );
}
