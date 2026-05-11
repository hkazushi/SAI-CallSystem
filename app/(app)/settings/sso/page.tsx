"use client";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/ui/page-transition";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, ExternalLink, Info, Shield, Users } from "lucide-react";

export default function SsoSettingsPage() {
  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-3xl">
        <PageHeader
          title="SSO / SAML"
          description="シングルサインオン（IdP）連携。Enterprise プラン専用機能"
        >
          <Badge variant="outline" className="text-[10px] border-purple-500/40 text-purple-400">
            Enterprise プラン
          </Badge>
        </PageHeader>

        <Card className="p-5 space-y-3 border-purple-500/30 bg-purple-500/5">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <h3 className="text-sm font-semibold text-purple-400">Enterprise プランへのアップグレードが必要です</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                SAML 2.0 / OIDC による SSO 連携は Enterprise プラン専用機能です。Okta / Azure AD / Google Workspace 等の IdP と接続できます。
              </p>
              <Button size="sm" variant="outline" className="mt-2 border-purple-500/40 text-purple-400 hover:bg-purple-500/10">
                <ExternalLink className="w-3 h-3 mr-1.5" />
                Enterprise プランの相談
              </Button>
            </div>
          </div>
        </Card>

        {/* IdP 対応一覧 */}
        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />対応 IdP
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {["Okta", "Azure AD / Entra ID", "Google Workspace", "OneLogin", "Auth0", "Ping Identity", "JumpCloud", "その他 SAML 2.0"].map((idp) => (
              <div key={idp} className="p-3 rounded border border-border/40 text-center">
                <Lock className="w-4 h-4 mx-auto mb-1.5 text-muted-foreground" />
                <div className="font-semibold">{idp}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* 機能一覧 */}
        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />SSO 連携で有効になる機能
          </h3>
          <ul className="space-y-2 text-xs">
            {[
              "SAML 2.0 / OIDC による SSO 認証",
              "SCIM 2.0 によるユーザー自動プロビジョニング",
              "IdP グループ → SAI ロールのマッピング",
              "JIT (Just-In-Time) プロビジョニング",
              "MFA 強制 / IP 制限",
              "オフボーディング自動化（IdP 削除→SAI 自動失効）",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 p-2 rounded border border-border/40">
                <span className="text-purple-400">·</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* 設定欄プレビュー（disabled） */}
        <Card className="p-5 space-y-3 opacity-60">
          <h3 className="text-sm font-semibold">設定（Enterprise プラン契約後）</h3>
          <div className="space-y-2.5 text-xs">
            {[
              { key: "IdP メタデータ URL", desc: "SAML メタデータ XML の URL" },
              { key: "ACS URL", desc: "https://app.sai-call.com/api/auth/saml/callback" },
              { key: "Entity ID", desc: "sai-call-{your-org-slug}" },
              { key: "属性マッピング", desc: "email / name / groups の対応" },
            ].map((x) => (
              <div key={x.key} className="flex items-start gap-3 p-2 rounded border border-border/40">
                <span className="font-semibold w-40 flex-shrink-0">{x.key}</span>
                <span className="text-muted-foreground font-mono text-[11px]">{x.desc}</span>
              </div>
            ))}
          </div>
          <Button disabled className="w-full" variant="outline">設定（プラン契約後に有効化）</Button>
        </Card>
      </div>
    </PageTransition>
  );
}
