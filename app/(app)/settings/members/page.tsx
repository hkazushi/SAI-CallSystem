"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/ui/page-transition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Mail, UserPlus, Shield, X } from "lucide-react";
import type { Membership, Invitation, OrgRole } from "@/lib/supabase/types";

const ROLES: OrgRole[] = ["owner", "admin", "manager", "operator", "auditor", "viewer", "billing"];

const ROLE_LABEL: Record<OrgRole, string> = {
  owner: "オーナー",
  admin: "管理者",
  manager: "マネージャー",
  operator: "オペレーター",
  auditor: "監査人",
  viewer: "閲覧",
  billing: "経理",
};

const ROLE_DESC: Record<OrgRole, string> = {
  owner: "組織の全権限。削除も可能",
  admin: "オーナーとほぼ同等の管理権限",
  manager: "案件・キャンペーン作成・実行",
  operator: "通話実行・連絡先管理",
  auditor: "閲覧・監査ログアクセス",
  viewer: "閲覧のみ",
  billing: "経理・請求情報のみ",
};

const ROLE_BADGE_CLS: Record<OrgRole, string> = {
  owner:    "bg-amber-500/15 text-amber-400 border-amber-500/30",
  admin:    "bg-primary/15 text-primary border-primary/30",
  manager:  "bg-blue-500/15 text-blue-400 border-blue-500/30",
  operator: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  auditor:  "bg-purple-500/15 text-purple-400 border-purple-500/30",
  viewer:   "bg-muted text-muted-foreground border-border",
  billing:  "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

export default function MembersPage() {
  const [members, setMembers] = useState<Membership[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("operator");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/members");
    const data = await res.json();
    if (data.ok) {
      setMembers(data.members);
      setInvitations(data.invitations);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const invite = async () => {
    if (!email) return;
    setSubmitting(true);
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    setSubmitting(false);
    if (res.ok) {
      setEmail("");
      fetchData();
    }
  };

  const changeRole = async (id: string, newRole: OrgRole) => {
    await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    fetchData();
  };

  const deactivate = async (id: string) => {
    if (!confirm("このメンバーを無効化しますか？")) return;
    await fetch(`/api/members/${id}`, { method: "DELETE" });
    fetchData();
  };

  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-[1100px]">
        <PageHeader title="メンバー・招待" description="組織メンバーと招待を管理。役割（ロール）に応じた権限を割り当て。" />

        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <UserPlus className="w-4 h-4" />メンバーを招待
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_120px] gap-3">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" type="email" />
            <select value={role} onChange={(e) => setRole(e.target.value as OrgRole)} className="bg-background border border-border rounded-md px-3 text-sm">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
            <Button onClick={invite} disabled={!email || submitting}>
              {submitting ? "送信中..." : <><Mail className="w-3 h-3 mr-1.5" />招待を送る</>}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{ROLE_DESC[role]}</p>
        </Card>

        {invitations.filter((i) => !i.accepted_at).length > 0 && (
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold">招待中</h3>
            <div className="space-y-2">
              {invitations.filter((i) => !i.accepted_at).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div>
                    <div className="text-sm font-medium">{inv.email}</div>
                    <div className="text-xs text-muted-foreground">期限: {new Date(inv.expires_at).toLocaleDateString("ja-JP")}</div>
                  </div>
                  <Badge className={ROLE_BADGE_CLS[inv.role]}>{ROLE_LABEL[inv.role]}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4" />メンバー一覧 ({members.length}人)
          </h3>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/20 border border-border/40">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium font-mono">{m.user_id.slice(0, 12)}...</div>
                  <div className="text-[10px] text-muted-foreground">
                    最終ログイン: {m.last_active_at ? new Date(m.last_active_at).toLocaleString("ja-JP") : "—"}
                  </div>
                </div>
                <select
                  value={m.role}
                  onChange={(e) => changeRole(m.id, e.target.value as OrgRole)}
                  className="bg-background border border-border rounded-md px-2 py-1 text-xs"
                  disabled={m.role === "owner"}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
                {m.role !== "owner" && (
                  <Button size="sm" variant="ghost" onClick={() => deactivate(m.id)}>
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
