"use client";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockUsers, mockTenant } from "@/lib/mock-data";
import { Plus, UserCog, Shield, User, Mail, Trash2, MoreHorizontal } from "lucide-react";

const roleConfig = {
  admin:    { label: "管理者", color: "text-primary", bg: "bg-primary/10" },
  operator: { label: "オペレーター", color: "text-emerald-400", bg: "bg-emerald-400/10" },
};

export default function UsersPage() {
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("operator");

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <PageHeader title="ユーザー管理" description={`${mockTenant.name} のメンバーとロールを管理します`}>
        <Button size="sm" className="gradient-bg border-0 hover:opacity-90 h-8 text-xs" onClick={() => setInviting(true)}>
          <Plus className="w-4 h-4 mr-1.5" />ユーザーを招待
        </Button>
      </PageHeader>

      {/* Tenant Info */}
      <Card className="p-4 border-border/40 bg-card/60 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white font-bold text-sm">
          {mockTenant.name[0]}
        </div>
        <div>
          <p className="font-semibold text-sm">{mockTenant.name}</p>
          <p className="text-xs text-muted-foreground">プラン: {mockTenant.plan === "premium" ? "プレミアム" : mockTenant.plan}</p>
        </div>
        <Badge className="ml-auto bg-emerald-400/10 text-emerald-400 border-0 text-xs">アクティブ</Badge>
      </Card>

      {/* Invite form */}
      {inviting && (
        <Card className="p-5 border-primary/30 bg-card/80 space-y-4">
          <h3 className="font-semibold text-sm">ユーザーを招待</h3>
          <div className="space-y-2">
            <Label className="text-xs">メールアドレス <span className="text-red-400">*</span></Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="bg-background/50 border-border/40 h-9 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">ロール</Label>
            <div className="flex gap-2">
              {(["admin", "operator"] as const).map((r) => {
                const cfg = roleConfig[r];
                return (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${role === r ? `${cfg.bg} border-current/30 ${cfg.color}` : "border-border/30 text-muted-foreground"}`}
                  >
                    {r === "admin" ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="border-border/40 h-8 text-xs" onClick={() => setInviting(false)}>
              キャンセル
            </Button>
            <Button size="sm" className="gradient-bg border-0 hover:opacity-90 h-8 text-xs" onClick={() => setInviting(false)}>
              <Mail className="w-3.5 h-3.5 mr-1" />招待メールを送信
            </Button>
          </div>
        </Card>
      )}

      {/* User list */}
      <Card className="border-border/40 bg-card/60 overflow-hidden">
        <div className="px-5 py-3 border-b border-border/30">
          <p className="text-xs font-medium text-muted-foreground">{mockUsers.length} 人のメンバー</p>
        </div>
        <div className="divide-y divide-border/20">
          {mockUsers.map((user) => {
            const role = roleConfig[user.role];
            return (
              <div key={user.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {user.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{user.name}</p>
                    <Badge className={`${role.bg} ${role.color} border-0 text-[10px] h-4 px-1.5`}>
                      {role.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    最終ログイン: {new Date(user.last_login_at).toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="border-border/40 h-7 text-xs">
                    <UserCog className="w-3 h-3 mr-1" />編集
                  </Button>
                  {user.role !== "admin" && (
                    <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-7 text-xs">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Role descriptions */}
      <Card className="p-5 border-border/40 bg-card/40 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ロールについて</p>
        <div className="space-y-2 text-xs">
          <div className="flex gap-3">
            <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-primary">管理者</p>
              <p className="text-muted-foreground">全機能にアクセス可能。ユーザー管理・認証情報設定・請求管理を含む。</p>
            </div>
          </div>
          <div className="flex gap-3">
            <User className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-emerald-400">オペレーター</p>
              <p className="text-muted-foreground">プロジェクト・リスト・通話ログの閲覧・操作が可能。設定管理は不可。</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
