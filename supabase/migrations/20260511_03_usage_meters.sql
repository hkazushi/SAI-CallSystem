-- Migration: 使用量メーター (usage_events / usage_aggregates)
-- Date: 2026-05-11
-- Purpose:
--   通話分・LLMトークン・STT/TTS秒数を計測。請求とクォータの基盤。
--   raw events を残しつつ、日次集計テーブルでダッシュボード読み出しを高速化。

-- ── usage_events: raw events (1イベント1行) ────────────────
CREATE TABLE IF NOT EXISTS usage_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  project_id      UUID,                            -- projects(id) 参照は緩めに
  call_id         UUID,                            -- 後から calls テーブル参照
  metric          TEXT NOT NULL                    -- 'call.minutes' / 'llm.input_tokens' / 'llm.output_tokens' / 'stt.seconds' / 'tts.characters'
    CHECK (metric IN (
      'call.minutes',
      'llm.input_tokens','llm.output_tokens',
      'stt.seconds','tts.characters',
      'storage.bytes_hour'
    )),
  provider        TEXT,                            -- 'vapi' / 'dialogflow_cx' / 'anthropic' / 'openai' / 'google_tts' 等
  quantity        NUMERIC NOT NULL,                -- そのままの単位 (分/秒/トークン/文字)
  unit_cost_usd   NUMERIC,                         -- 単価 (任意; 課金時は固定)
  cost_usd        NUMERIC,                         -- 計算済み (quantity * unit_cost_usd) を保持
  metadata        JSONB DEFAULT '{}'::jsonb,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_org_time
  ON usage_events (organization_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_metric
  ON usage_events (organization_id, metric, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_project
  ON usage_events (project_id, occurred_at DESC);

-- ── usage_daily: 日次集計 (organization × workspace × project × metric × day) ──
CREATE TABLE IF NOT EXISTS usage_daily (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  project_id      UUID,
  day             DATE NOT NULL,
  metric          TEXT NOT NULL,
  provider        TEXT,
  quantity        NUMERIC NOT NULL DEFAULT 0,
  cost_usd        NUMERIC NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, workspace_id, project_id, day, metric, provider)
);

CREATE INDEX IF NOT EXISTS idx_usage_daily_org_day
  ON usage_daily (organization_id, day DESC);

-- ── quotas: プランごとの上限 ──────────────────────────────
CREATE TABLE IF NOT EXISTS organization_quotas (
  organization_id     UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  plan_name           TEXT NOT NULL DEFAULT 'free',
  call_minutes_month  INTEGER NOT NULL DEFAULT 60,
  llm_tokens_month    INTEGER NOT NULL DEFAULT 200000,
  active_projects     INTEGER NOT NULL DEFAULT 1,
  members             INTEGER NOT NULL DEFAULT 3,
  storage_gb          NUMERIC NOT NULL DEFAULT 1,
  effective_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS organization_quotas_set_updated_at ON organization_quotas;
CREATE TRIGGER organization_quotas_set_updated_at
  BEFORE UPDATE ON organization_quotas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ─────────────────────────────────────────────────
ALTER TABLE usage_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_daily         ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usage_events_select_member ON usage_events;
CREATE POLICY usage_events_select_member ON usage_events
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active
    )
  );

-- INSERT は通常 service_role からのみ
DROP POLICY IF EXISTS usage_events_insert_service ON usage_events;
CREATE POLICY usage_events_insert_service ON usage_events
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND role IN ('owner','admin') AND is_active
    )
  );

DROP POLICY IF EXISTS usage_daily_select_member ON usage_daily;
CREATE POLICY usage_daily_select_member ON usage_daily
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active
    )
  );

DROP POLICY IF EXISTS quotas_select_member ON organization_quotas;
CREATE POLICY quotas_select_member ON organization_quotas
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active
    )
  );

DROP POLICY IF EXISTS quotas_update_admin ON organization_quotas;
CREATE POLICY quotas_update_admin ON organization_quotas
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND role IN ('owner','admin','billing') AND is_active
    )
  );

-- ── 集計関数: 1イベント → 日次にロールアップ ───────────────
CREATE OR REPLACE FUNCTION rollup_usage_event() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usage_daily (organization_id, workspace_id, project_id, day, metric, provider, quantity, cost_usd)
  VALUES (
    NEW.organization_id,
    NEW.workspace_id,
    NEW.project_id,
    DATE(NEW.occurred_at),
    NEW.metric,
    COALESCE(NEW.provider, ''),
    NEW.quantity,
    COALESCE(NEW.cost_usd, 0)
  )
  ON CONFLICT (organization_id, workspace_id, project_id, day, metric, provider)
  DO UPDATE SET
    quantity = usage_daily.quantity + EXCLUDED.quantity,
    cost_usd = usage_daily.cost_usd + EXCLUDED.cost_usd;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS usage_events_rollup ON usage_events;
CREATE TRIGGER usage_events_rollup
  AFTER INSERT ON usage_events
  FOR EACH ROW EXECUTE FUNCTION rollup_usage_event();

-- ── 今月の使用量を返すビュー (ダッシュボード用) ─────────────
CREATE OR REPLACE VIEW v_usage_current_month AS
SELECT
  organization_id,
  metric,
  SUM(quantity)::NUMERIC AS quantity,
  SUM(cost_usd)::NUMERIC AS cost_usd
FROM usage_daily
WHERE day >= DATE_TRUNC('month', NOW())::DATE
GROUP BY organization_id, metric;

COMMENT ON TABLE usage_events IS 'Raw usage events (1 row per metered action). Rolled up to usage_daily by trigger.';
COMMENT ON TABLE usage_daily IS 'Daily rollup of usage_events for fast dashboard reads.';
COMMENT ON TABLE organization_quotas IS 'Plan-based hard limits per organization.';
