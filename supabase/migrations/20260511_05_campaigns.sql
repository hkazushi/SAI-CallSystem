-- Migration: キャンペーン管理 (campaigns / campaign_targets)
-- Date: 2026-05-11
-- Purpose:
--   「いつ・誰に・どのスクリプトで電話するか」を定義。
--   project（=エージェント定義） × contact_list × schedule の組み合わせ。
--   進行状況・成果KPIをキャンペーン単位で集計できる。

CREATE TABLE IF NOT EXISTS campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  project_id      UUID,                                 -- = エージェント設定 (Vapi/DFCX)
  name            TEXT NOT NULL,
  description     TEXT,
  direction       TEXT NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('outbound','inbound')),
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','running','paused','completed','archived','failed')),

  -- 対象
  contact_list_id UUID REFERENCES contact_lists(id) ON DELETE SET NULL,
  target_filter   JSONB,                                -- list_id がない場合の動的条件

  -- スケジュール
  start_at        TIMESTAMPTZ,
  end_at          TIMESTAMPTZ,
  timezone        TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  daily_window    JSONB DEFAULT '{"start":"09:00","end":"19:00"}'::jsonb,
  allowed_weekdays SMALLINT[] DEFAULT '{1,2,3,4,5}',    -- 1=月 .. 7=日

  -- 発信制御
  concurrency        INTEGER NOT NULL DEFAULT 1,        -- 同時通話数
  retry_max          INTEGER NOT NULL DEFAULT 2,
  retry_interval_min INTEGER NOT NULL DEFAULT 60,
  caller_id          TEXT,                              -- 発信元番号 (E.164)

  -- スクリプト/プロンプト override
  prompt_override  TEXT,
  first_message_override TEXT,

  -- KPI 目標
  goal_metric     TEXT,                                 -- 'appointment_rate' / 'connect_rate' 等
  goal_target     NUMERIC,

  -- 集計 (deferred update)
  total_targets   INTEGER NOT NULL DEFAULT 0,
  total_dialed    INTEGER NOT NULL DEFAULT 0,
  total_connected INTEGER NOT NULL DEFAULT 0,
  total_success   INTEGER NOT NULL DEFAULT 0,
  total_failed    INTEGER NOT NULL DEFAULT 0,

  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_org_status
  ON campaigns (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_workspace
  ON campaigns (workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_running
  ON campaigns (start_at) WHERE status = 'running';

-- ── campaign_targets: キャンペーンに含まれる連絡先1件1行 ──
CREATE TABLE IF NOT EXISTS campaign_targets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','queued','dialing','connected','completed','no_answer','busy','failed','skipped','do_not_call')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  last_call_id    UUID,
  outcome         TEXT,                                 -- 'appointment' / 'rejected' / 'callback' 等
  notes           TEXT,
  priority        INTEGER DEFAULT 0,
  scheduled_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_targets_campaign_status
  ON campaign_targets (campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_targets_next_attempt
  ON campaign_targets (next_attempt_at) WHERE status IN ('pending','queued');
CREATE INDEX IF NOT EXISTS idx_campaign_targets_contact
  ON campaign_targets (contact_id);

-- ── updated_at trigger ────────────────────────────────
DROP TRIGGER IF EXISTS campaigns_set_updated_at ON campaigns;
CREATE TRIGGER campaigns_set_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ─────────────────────────────────────────────────
ALTER TABLE campaigns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaigns_select_member ON campaigns;
CREATE POLICY campaigns_select_member ON campaigns
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active
    )
  );

DROP POLICY IF EXISTS campaigns_mutate_manager ON campaigns;
CREATE POLICY campaigns_mutate_manager ON campaigns
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner','admin','manager')
        AND is_active
    )
  );

DROP POLICY IF EXISTS campaign_targets_select ON campaign_targets;
CREATE POLICY campaign_targets_select ON campaign_targets
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND is_active
      )
    )
  );

DROP POLICY IF EXISTS campaign_targets_mutate ON campaign_targets;
CREATE POLICY campaign_targets_mutate ON campaign_targets
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid()
          AND role IN ('owner','admin','manager','operator')
          AND is_active
      )
    )
  );

COMMENT ON TABLE campaigns IS 'Outbound/inbound calling campaigns. Joins project (agent) × contact_list × schedule.';
COMMENT ON TABLE campaign_targets IS 'Per-contact state inside a campaign (status / retries / next attempt).';
