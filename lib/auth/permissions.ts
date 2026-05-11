// RBAC ヘルパー: 役割（OrgRole）からアクション可否を判定する。
// データ取得は別レイヤ (getCurrentSession) に任せる。ここは pure な権限ロジック。

import type { OrgRole } from "@/lib/supabase/types";

// アクション定義 — 不足したらここに追加するだけで RLS と同期できる。
export type Action =
  | "org.view"
  | "org.update"
  | "org.delete"
  | "member.invite"
  | "member.remove"
  | "member.update_role"
  | "workspace.create"
  | "workspace.update"
  | "workspace.delete"
  | "project.create"
  | "project.update"
  | "project.delete"
  | "project.deploy"
  | "contact.read"
  | "contact.write"
  | "contact.import"
  | "campaign.create"
  | "campaign.run"
  | "campaign.pause"
  | "campaign.delete"
  | "call.start"
  | "call.transfer"
  | "call.read"
  | "transcript.read"
  | "ai_eval.run"
  | "ai_eval.read"
  | "experiment.create"
  | "experiment.start"
  | "experiment.read"
  | "report.create"
  | "report.read"
  | "audit.read"
  | "billing.read"
  | "billing.update"
  | "api_key.create"
  | "api_key.read"
  | "api_key.revoke"
  | "webhook.create"
  | "webhook.read"
  | "phone_number.purchase"
  | "phone_number.assign"
  | "quota.update";

const ROLE_PERMISSIONS: Record<OrgRole, ReadonlyArray<Action | "*">> = {
  owner: ["*"],
  admin: ["*"],
  manager: [
    "org.view",
    "workspace.create", "workspace.update",
    "project.create", "project.update", "project.delete", "project.deploy",
    "contact.read", "contact.write", "contact.import",
    "campaign.create", "campaign.run", "campaign.pause", "campaign.delete",
    "call.start", "call.transfer", "call.read",
    "transcript.read",
    "ai_eval.run", "ai_eval.read",
    "experiment.create", "experiment.start", "experiment.read",
    "report.create", "report.read",
    "webhook.read", "webhook.create",
    "phone_number.assign",
  ],
  operator: [
    "org.view",
    "project.update",
    "contact.read", "contact.write",
    "campaign.run", "campaign.pause",
    "call.start", "call.transfer", "call.read",
    "transcript.read",
    "ai_eval.read",
    "experiment.read",
    "report.read",
  ],
  auditor: [
    "org.view",
    "contact.read",
    "campaign.run", // 観測のみだが UI 上の一部操作は許す
    "call.read", "transcript.read",
    "ai_eval.read",
    "experiment.read",
    "report.read",
    "audit.read",
  ],
  viewer: [
    "org.view",
    "contact.read",
    "call.read", "transcript.read",
    "report.read",
  ],
  billing: [
    "org.view",
    "billing.read", "billing.update",
    "quota.update",
    "report.read",
  ],
};

export function canRole(role: OrgRole | null | undefined, action: Action): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes("*") || perms.includes(action);
}

export function requireRole(role: OrgRole | null | undefined, action: Action): void {
  if (!canRole(role, action)) {
    throw new PermissionDeniedError(role, action);
  }
}

export class PermissionDeniedError extends Error {
  public readonly status = 403;
  constructor(public role: OrgRole | null | undefined, public action: Action) {
    super(`Permission denied: role=${role ?? "anonymous"} cannot perform "${action}"`);
    this.name = "PermissionDeniedError";
  }
}

export function listAllowedActions(role: OrgRole | null | undefined): Action[] {
  if (!role) return [];
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return [];
  if (perms.includes("*")) {
    // owner/admin は全アクション
    return Array.from(
      new Set(
        Object.values(ROLE_PERMISSIONS).flatMap((arr) => arr.filter((a): a is Action => a !== "*"))
      )
    );
  }
  return perms.filter((a): a is Action => a !== "*");
}

export const ROLE_LABELS_JA: Record<OrgRole, string> = {
  owner: "オーナー",
  admin: "管理者",
  manager: "マネージャー",
  operator: "オペレーター",
  auditor: "監査",
  viewer: "閲覧のみ",
  billing: "請求担当",
};

export const ROLE_DESCRIPTIONS_JA: Record<OrgRole, string> = {
  owner: "組織全体のオーナー。すべての権限を持つ。",
  admin: "メンバー管理・請求設定を含むすべての操作が可能。",
  manager: "プロジェクト・キャンペーン・チームを運用する責任者。",
  operator: "通話開始・転送など日常運用を行う。",
  auditor: "通話内容・監査ログを参照できる読み取り役。",
  viewer: "ダッシュボードと通話履歴を見るだけのゲスト。",
  billing: "請求・プラン・クォータの管理者。",
};
