// 現在のセッションを取得するヘルパー (server / route handler 用)
// Supabase 未接続時は環境変数 DEV_BYPASS_AUTH=true で fake user を返す。

import { mockTenant, mockUsers } from "@/lib/mock-data";
import type { OrgRole, UUID } from "@/lib/supabase/types";

export interface CurrentSession {
  userId: UUID;
  email: string;
  name: string;
  organizationId: UUID;
  workspaceId: UUID | null;
  role: OrgRole;
  isMock: boolean;
}

const DEV_BYPASS = (process.env.DEV_BYPASS_AUTH ?? "false") === "true";

export async function getCurrentSession(): Promise<CurrentSession | null> {
  // Supabase 接続時は service_role と分離した getCurrentSession を別途追加する想定
  // (今は mock セッションのみ)
  if (DEV_BYPASS || process.env.DATA_SOURCE !== "supabase") {
    const user = mockUsers[0];
    if (!user) return null;
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationId: mockTenant.id,
      workspaceId: null,
      role: (user.role ?? "admin") as OrgRole,
      isMock: true,
    };
  }
  return null;
}

export async function requireCurrentSession(): Promise<CurrentSession> {
  const session = await getCurrentSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

export class UnauthorizedError extends Error {
  public readonly status = 401;
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}
