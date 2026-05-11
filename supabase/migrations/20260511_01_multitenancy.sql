-- Migration: マルチテナント基盤 (organizations / workspaces / memberships)
-- Date: 2026-05-11
-- Purpose:
--   既存 projects.tenant_id を organizations.id にマップする3階層構造を作る。
--   組織 → ワークスペース → プロジェクト。
--   既存 projects に organization_id / workspace_id を追加（NULL許可で段階移行）。

-- ── enum: ロール ────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE org_role AS ENUM ('owner','admin','manager','operator','auditor','viewer','billing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── organizations ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  plan            TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free','starter','pro','enterprise')),
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended','trialing','past_due')),
  billing_email   TEXT,
  default_voice   TEXT,           -- default TTS voice id
  default_lang    TEXT DEFAULT 'ja-JP',
  data_region     TEXT DEFAULT 'asia-northeast1',
  branding        JSONB DEFAULT '{}'::jsonb,    -- logo url, primary color
  settings        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- ── workspaces (組織内の分離単位) ───────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  settings        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_workspaces_org ON workspaces(organization_id);

-- ── memberships (user × organization, ロール持ち) ──────────
CREATE TABLE IF NOT EXISTS memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            org_role NOT NULL DEFAULT 'viewer',
  workspace_ids   UUID[] DEFAULT '{}',         -- 空配列なら組織全体アクセス
  invited_by      UUID REFERENCES auth.users(id),
  invited_at      TIMESTAMPTZ,
  accepted_at     TIMESTAMPTZ,
  last_active_at  TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON memberships(organization_id, role) WHERE is_active = TRUE;

-- ── invitations (招待リンク・トークン) ───────────────────────
CREATE TABLE IF NOT EXISTS invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  role            org_role NOT NULL DEFAULT 'viewer',
  token           TEXT UNIQUE NOT NULL,
  invited_by      UUID REFERENCES auth.users(id),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_org_email ON invitations(organization_id, email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token) WHERE accepted_at IS NULL;

-- ── projects に organization_id / workspace_id 追加 ────────
-- projects テーブルが先に存在する前提（mockData の構造から推測）。
-- 既存環境では NULL から段階的に埋める。
ALTER TABLE IF EXISTS projects
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id    UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_projects_org_status ON projects (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects (workspace_id);

-- ── updated_at 自動更新トリガ ────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organizations_set_updated_at ON organizations;
CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS workspaces_set_updated_at ON workspaces;
CREATE TRIGGER workspaces_set_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS 有効化 ─────────────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces    ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations   ENABLE ROW LEVEL SECURITY;

-- メンバーは自分の所属組織のみ参照可
DROP POLICY IF EXISTS organizations_select_own ON organizations;
CREATE POLICY organizations_select_own ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND is_active)
  );

-- owner/admin のみ更新
DROP POLICY IF EXISTS organizations_update_admin ON organizations;
CREATE POLICY organizations_update_admin ON organizations
  FOR UPDATE USING (
    id IN (SELECT organization_id FROM memberships
           WHERE user_id = auth.uid() AND role IN ('owner','admin') AND is_active)
  );

DROP POLICY IF EXISTS workspaces_select_member ON workspaces;
CREATE POLICY workspaces_select_member ON workspaces
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND is_active)
  );

DROP POLICY IF EXISTS workspaces_mutate_admin ON workspaces;
CREATE POLICY workspaces_mutate_admin ON workspaces
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM memberships
                        WHERE user_id = auth.uid() AND role IN ('owner','admin','manager') AND is_active)
  );

DROP POLICY IF EXISTS memberships_select_self_or_admin ON memberships;
CREATE POLICY memberships_select_self_or_admin ON memberships
  FOR SELECT USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT organization_id FROM memberships
                           WHERE user_id = auth.uid() AND role IN ('owner','admin') AND is_active)
  );

DROP POLICY IF EXISTS memberships_mutate_admin ON memberships;
CREATE POLICY memberships_mutate_admin ON memberships
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM memberships
                        WHERE user_id = auth.uid() AND role IN ('owner','admin') AND is_active)
  );

DROP POLICY IF EXISTS invitations_mutate_admin ON invitations;
CREATE POLICY invitations_mutate_admin ON invitations
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM memberships
                        WHERE user_id = auth.uid() AND role IN ('owner','admin') AND is_active)
  );

COMMENT ON TABLE organizations IS 'Top-level tenant. 1 organization = 1 paying customer.';
COMMENT ON TABLE workspaces IS 'Sub-tenant. 部署/案件単位の分離。memberships.workspace_ids で個別ユーザー権限を絞れる。';
COMMENT ON TABLE memberships IS 'User × Organization リンク. role が RBAC の基本。';
