-- Migration: API キー / Webhook 基盤
-- Date: 2026-05-11
-- Purpose:
--   外部システムが本SaaSに連携するための API キーと、本SaaSが外部に通知する Webhook。
--   APIキーは hashed_key を保存し、生のキーは作成時のみ返す。

-- ── api_keys ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  prefix          TEXT NOT NULL,                       -- 'sk_live_xxxx' の表示用先頭
  hashed_key      TEXT NOT NULL UNIQUE,                -- bcrypt or sha256 hash
  scopes          TEXT[] NOT NULL DEFAULT '{}'::text[],-- ['calls:read','calls:write','contacts:*'] 等
  rate_limit_rpm  INTEGER DEFAULT 60,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at    TIMESTAMPTZ,
  last_used_ip    INET,
  expires_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES auth.users(id),
  revoked_at      TIMESTAMPTZ,
  revoked_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org_active
  ON api_keys (organization_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_keys_hash
  ON api_keys (hashed_key);

-- ── webhooks (outgoing) ────────────────────────────────
CREATE TABLE IF NOT EXISTS webhooks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  url             TEXT NOT NULL,
  secret          TEXT NOT NULL,                       -- HMAC 署名鍵
  events          TEXT[] NOT NULL DEFAULT '{}'::text[],-- ['call.completed','evaluation.completed', ...]
  headers         JSONB DEFAULT '{}'::jsonb,           -- 追加ヘッダ
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  retry_max       INTEGER NOT NULL DEFAULT 5,
  -- 集計 (バッチ更新)
  last_delivered_at TIMESTAMPTZ,
  last_status_code  INTEGER,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_org_active
  ON webhooks (organization_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_webhooks_events_gin
  ON webhooks USING GIN (events);

-- ── webhook_deliveries: 配送ログ ───────────────────────
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id      UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','delivered','failed','retrying','dead_letter')),
  attempt         INTEGER NOT NULL DEFAULT 0,
  response_status INTEGER,
  response_body   TEXT,
  response_headers JSONB,
  error_message   TEXT,
  duration_ms     INTEGER,
  next_retry_at   TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook
  ON webhook_deliveries (webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_pending
  ON webhook_deliveries (next_retry_at) WHERE status IN ('pending','retrying');
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_org
  ON webhook_deliveries (organization_id, created_at DESC);

-- ── updated_at trigger ──────────────────────────────
DROP TRIGGER IF EXISTS webhooks_set_updated_at ON webhooks;
CREATE TRIGGER webhooks_set_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ─────────────────────────────────────────────────
ALTER TABLE api_keys           ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- api_keys: hashed_key は select に含めず、view 側で隠す運用にする
DROP POLICY IF EXISTS api_keys_select_admin ON api_keys;
CREATE POLICY api_keys_select_admin ON api_keys
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND role IN ('owner','admin') AND is_active
    )
  );

DROP POLICY IF EXISTS api_keys_mutate_admin ON api_keys;
CREATE POLICY api_keys_mutate_admin ON api_keys
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND role IN ('owner','admin') AND is_active
    )
  );

DROP POLICY IF EXISTS webhooks_select_member ON webhooks;
CREATE POLICY webhooks_select_member ON webhooks
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active
    )
  );

DROP POLICY IF EXISTS webhooks_mutate_admin ON webhooks;
CREATE POLICY webhooks_mutate_admin ON webhooks
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND role IN ('owner','admin') AND is_active
    )
  );

DROP POLICY IF EXISTS webhook_deliveries_select ON webhook_deliveries;
CREATE POLICY webhook_deliveries_select ON webhook_deliveries
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND role IN ('owner','admin','auditor') AND is_active
    )
  );

-- 公開用 view: APIキー一覧 (hashed_key を隠す)
CREATE OR REPLACE VIEW v_api_keys_public AS
SELECT
  id, organization_id, workspace_id, name, prefix, scopes, rate_limit_rpm,
  is_active, last_used_at, expires_at, created_at, revoked_at
FROM api_keys;

COMMENT ON TABLE api_keys IS 'Hashed API keys for external integrations. Raw key shown only on creation.';
COMMENT ON TABLE webhooks IS 'Outgoing webhooks (event subscriptions).';
COMMENT ON TABLE webhook_deliveries IS 'Per-event delivery attempts with retry state.';
