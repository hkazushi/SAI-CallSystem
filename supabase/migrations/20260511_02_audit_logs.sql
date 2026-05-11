-- Migration: 監査ログ (audit_logs)
-- Date: 2026-05-11
-- Purpose:
--   誰が・いつ・何をしたかを追跡する SOC2 / ISO27001 想定の監査台帳。
--   organization スコープで RLS、auditor/owner/admin のみ参照可。
--   書き込みは service_role (Edge Function) 経由を想定。

CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  actor_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email     TEXT,                 -- snapshot (auth.users 削除後も追跡可)
  actor_role      org_role,
  action          TEXT NOT NULL,        -- 'project.create' / 'call.start' / 'member.invite' 等
  resource_type   TEXT,                 -- 'project' / 'call' / 'membership' 等
  resource_id     UUID,
  resource_label  TEXT,                 -- 人間可読 (project name 等)
  status          TEXT NOT NULL DEFAULT 'success'
    CHECK (status IN ('success','failure','denied')),
  ip_address      INET,
  user_agent      TEXT,
  request_id      TEXT,                 -- traceability (Edge Function 単位)
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message   TEXT,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 直近を取りやすく
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_recorded
  ON audit_logs (organization_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
  ON audit_logs (actor_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON audit_logs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs (organization_id, action, recorded_at DESC);
-- metadata 検索 (例: target_user_id, plan_change 詳細)
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata_gin
  ON audit_logs USING GIN (metadata);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 参照: 同組織の auditor / owner / admin
DROP POLICY IF EXISTS audit_logs_select_priv ON audit_logs;
CREATE POLICY audit_logs_select_priv ON audit_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner','admin','auditor')
        AND is_active
    )
  );

-- INSERT は通常 service_role からのみ。RLS 上は admin にも許可しておく (デバッグ用)
DROP POLICY IF EXISTS audit_logs_insert_admin ON audit_logs;
CREATE POLICY audit_logs_insert_admin ON audit_logs
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner','admin')
        AND is_active
    )
  );

-- UPDATE / DELETE は不可 (改ざん防止)
DROP POLICY IF EXISTS audit_logs_no_update ON audit_logs;
CREATE POLICY audit_logs_no_update ON audit_logs FOR UPDATE USING (false);
DROP POLICY IF EXISTS audit_logs_no_delete ON audit_logs;
CREATE POLICY audit_logs_no_delete ON audit_logs FOR DELETE USING (false);

COMMENT ON TABLE audit_logs IS 'Immutable audit trail. INSERT-only from app, read-only for auditors.';
COMMENT ON COLUMN audit_logs.action IS 'dot-notation: domain.verb e.g. project.create, member.invite';
COMMENT ON COLUMN audit_logs.metadata IS 'Free-form context: diff, target_id, parameters, etc.';

-- ヘルパー: 監査ログ追記 (service_role / SECURITY DEFINER で呼ぶ)
CREATE OR REPLACE FUNCTION log_audit_event(
  p_organization_id UUID,
  p_actor_id        UUID,
  p_action          TEXT,
  p_resource_type   TEXT DEFAULT NULL,
  p_resource_id     UUID DEFAULT NULL,
  p_metadata        JSONB DEFAULT '{}'::jsonb,
  p_status          TEXT DEFAULT 'success'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_email TEXT;
  v_role org_role;
BEGIN
  -- actor 情報のスナップショット取得
  SELECT email INTO v_email FROM auth.users WHERE id = p_actor_id;
  SELECT role INTO v_role FROM memberships
   WHERE organization_id = p_organization_id AND user_id = p_actor_id
   LIMIT 1;

  INSERT INTO audit_logs (
    organization_id, actor_id, actor_email, actor_role,
    action, resource_type, resource_id, metadata, status
  ) VALUES (
    p_organization_id, p_actor_id, v_email, v_role,
    p_action, p_resource_type, p_resource_id, p_metadata, p_status
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END; $$;

REVOKE ALL ON FUNCTION log_audit_event(UUID,UUID,TEXT,TEXT,UUID,JSONB,TEXT) FROM public;
GRANT EXECUTE ON FUNCTION log_audit_event(UUID,UUID,TEXT,TEXT,UUID,JSONB,TEXT) TO authenticated;
