-- Migration: A/B 実験 (experiments / experiment_arms / experiment_assignments)
-- Date: 2026-05-11
-- Purpose:
--   2つ以上の Agent 設定 / プロンプト / 音声 を contact に確率的に割り当て、成果を比較。
--   割当は contact_id ハッシュで決定し、再現性を担保。

CREATE TABLE IF NOT EXISTS experiments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  hypothesis      TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','running','paused','completed','aborted')),
  primary_metric  TEXT NOT NULL DEFAULT 'appointment_rate',
  secondary_metrics TEXT[] DEFAULT '{}'::text[],
  min_sample_size INTEGER DEFAULT 100,
  confidence_target NUMERIC DEFAULT 0.95,
  -- 結果サマリ (バッチ計算後の writeback)
  winner_arm_id   UUID,
  result_summary  JSONB,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_experiments_org_status
  ON experiments (organization_id, status);

-- ── arms: 各バリエーション ────────────────────────────
CREATE TABLE IF NOT EXISTS experiment_arms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id   UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  key             TEXT NOT NULL,                       -- 'control' / 'variant_a' 等
  label           TEXT NOT NULL,
  weight          INTEGER NOT NULL DEFAULT 50,         -- トラフィック割合 (合計=100想定)
  config          JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {project_id, prompt_override, voice, ...}
  is_control      BOOLEAN NOT NULL DEFAULT FALSE,
  -- 集計 (バッチ更新)
  assigned_count  INTEGER NOT NULL DEFAULT 0,
  completed_count INTEGER NOT NULL DEFAULT 0,
  success_count   INTEGER NOT NULL DEFAULT 0,
  total_minutes   NUMERIC NOT NULL DEFAULT 0,
  total_cost_usd  NUMERIC NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (experiment_id, key)
);

CREATE INDEX IF NOT EXISTS idx_experiment_arms_experiment
  ON experiment_arms (experiment_id);

-- ── assignments: 1 contact × 1 experiment = 1 行 ───────
CREATE TABLE IF NOT EXISTS experiment_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id   UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  arm_id          UUID NOT NULL REFERENCES experiment_arms(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id) ON DELETE CASCADE,
  call_id         UUID REFERENCES calls(id) ON DELETE SET NULL,
  assigned_hash   TEXT NOT NULL,                       -- contact_id+experiment_id の決定論的 hash
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (experiment_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_exp_assign_experiment
  ON experiment_assignments (experiment_id);
CREATE INDEX IF NOT EXISTS idx_exp_assign_arm
  ON experiment_assignments (arm_id);

-- ── updated_at trigger ────────────────────────────────
DROP TRIGGER IF EXISTS experiments_set_updated_at ON experiments;
CREATE TRIGGER experiments_set_updated_at
  BEFORE UPDATE ON experiments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ─────────────────────────────────────────────────
ALTER TABLE experiments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_arms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS experiments_select_member ON experiments;
CREATE POLICY experiments_select_member ON experiments
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active
    )
  );

DROP POLICY IF EXISTS experiments_mutate_manager ON experiments;
CREATE POLICY experiments_mutate_manager ON experiments
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner','admin','manager')
        AND is_active
    )
  );

DROP POLICY IF EXISTS exp_arms_select ON experiment_arms;
CREATE POLICY exp_arms_select ON experiment_arms
  FOR SELECT USING (
    experiment_id IN (
      SELECT id FROM experiments WHERE organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND is_active
      )
    )
  );

DROP POLICY IF EXISTS exp_arms_mutate ON experiment_arms;
CREATE POLICY exp_arms_mutate ON experiment_arms
  FOR ALL USING (
    experiment_id IN (
      SELECT id FROM experiments WHERE organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid()
          AND role IN ('owner','admin','manager')
          AND is_active
      )
    )
  );

DROP POLICY IF EXISTS exp_assign_select ON experiment_assignments;
CREATE POLICY exp_assign_select ON experiment_assignments
  FOR SELECT USING (
    experiment_id IN (
      SELECT id FROM experiments WHERE organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND is_active
      )
    )
  );

DROP POLICY IF EXISTS exp_assign_insert ON experiment_assignments;
CREATE POLICY exp_assign_insert ON experiment_assignments
  FOR INSERT WITH CHECK (
    experiment_id IN (
      SELECT id FROM experiments WHERE organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid()
          AND role IN ('owner','admin','manager','operator')
          AND is_active
      )
    )
  );

COMMENT ON TABLE experiments IS 'A/B test definition; tracks hypothesis, primary metric, winner.';
COMMENT ON TABLE experiment_arms IS 'Variants in an experiment (control + variants).';
COMMENT ON TABLE experiment_assignments IS 'Deterministic contact→arm assignment (hash-based).';
