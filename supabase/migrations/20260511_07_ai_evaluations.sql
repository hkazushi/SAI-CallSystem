-- Migration: AI評価 (ai_evaluations / coaching_suggestions / evaluation_rubrics)
-- Date: 2026-05-11
-- Purpose:
--   通話後に AI (Claude/GPT) が自動採点・要約・改善提案を書き戻すテーブル群。
--   ルーブリック (採点軸の定義) は organization 単位で編集可能。

-- ── rubrics: 採点軸定義 ───────────────────────────────
CREATE TABLE IF NOT EXISTS evaluation_rubrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  -- 各軸: [{key, label, weight, max_score, prompt_hint}]
  criteria        JSONB NOT NULL DEFAULT '[]'::jsonb,
  model           TEXT DEFAULT 'claude-sonnet-4-6',
  version         INTEGER NOT NULL DEFAULT 1,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name, version)
);

CREATE INDEX IF NOT EXISTS idx_rubrics_org_default
  ON evaluation_rubrics (organization_id) WHERE is_default = TRUE;

-- ── ai_evaluations: 1通話 × 1ルーブリック = 1行 ─────────
CREATE TABLE IF NOT EXISTS ai_evaluations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  call_id         UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  rubric_id       UUID REFERENCES evaluation_rubrics(id) ON DELETE SET NULL,
  rubric_version  INTEGER,
  model           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','completed','failed')),

  -- 結果
  score_overall   NUMERIC,                           -- 0..100
  scores          JSONB DEFAULT '{}'::jsonb,         -- { empathy: 75, accuracy: 90, ... }
  summary         TEXT,
  summary_short   TEXT,
  highlights      JSONB,                             -- [{type:'good', quote, reason}]
  issues          JSONB,                             -- [{type:'bad', quote, reason, severity}]
  next_actions    TEXT[] DEFAULT '{}'::text[],
  customer_intent TEXT,
  classification  TEXT,                              -- 'hot' / 'warm' / 'cold' / 'churn_risk' 等

  -- LLM トレース
  prompt_tokens   INTEGER,
  output_tokens   INTEGER,
  cost_usd        NUMERIC,
  latency_ms      INTEGER,
  raw_response    JSONB,

  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_evaluations_call
  ON ai_evaluations (call_id);
CREATE INDEX IF NOT EXISTS idx_ai_evaluations_org_created
  ON ai_evaluations (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_evaluations_status
  ON ai_evaluations (organization_id, status) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_ai_evaluations_classification
  ON ai_evaluations (organization_id, classification)
  WHERE classification IS NOT NULL;

-- ── coaching_suggestions: 個別の改善提案 (Vapi/DFCXコンフィグ向け) ──
CREATE TABLE IF NOT EXISTS coaching_suggestions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      UUID,                              -- どのエージェント設定への提案か
  source_call_id  UUID REFERENCES calls(id) ON DELETE SET NULL,
  source_eval_id  UUID REFERENCES ai_evaluations(id) ON DELETE SET NULL,
  category        TEXT NOT NULL                      -- 'prompt' / 'opening' / 'objection_handling' / 'transfer_rule' 等
    CHECK (category IN ('prompt','opening','objection_handling','transfer_rule','data_collection','tts_voice','retry_policy','other')),
  severity        TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  current_value   TEXT,
  suggested_value TEXT,
  rationale       TEXT,
  estimated_impact TEXT,                             -- '改善率 +15%想定' 等
  status          TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','accepted','rejected','applied','snoozed')),
  applied_at      TIMESTAMPTZ,
  applied_by      UUID REFERENCES auth.users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaching_org_status
  ON coaching_suggestions (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_coaching_project
  ON coaching_suggestions (project_id, status);
CREATE INDEX IF NOT EXISTS idx_coaching_call
  ON coaching_suggestions (source_call_id);

-- ── updated_at triggers ──────────────────────────────
DROP TRIGGER IF EXISTS evaluation_rubrics_set_updated_at ON evaluation_rubrics;
CREATE TRIGGER evaluation_rubrics_set_updated_at
  BEFORE UPDATE ON evaluation_rubrics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS coaching_suggestions_set_updated_at ON coaching_suggestions;
CREATE TRIGGER coaching_suggestions_set_updated_at
  BEFORE UPDATE ON coaching_suggestions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ─────────────────────────────────────────────────
ALTER TABLE evaluation_rubrics    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_evaluations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_suggestions  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rubrics_select_member ON evaluation_rubrics;
CREATE POLICY rubrics_select_member ON evaluation_rubrics
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active
    )
  );

DROP POLICY IF EXISTS rubrics_mutate_manager ON evaluation_rubrics;
CREATE POLICY rubrics_mutate_manager ON evaluation_rubrics
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner','admin','manager')
        AND is_active
    )
  );

DROP POLICY IF EXISTS ai_eval_select_member ON ai_evaluations;
CREATE POLICY ai_eval_select_member ON ai_evaluations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active
    )
  );

DROP POLICY IF EXISTS ai_eval_insert_member ON ai_evaluations;
CREATE POLICY ai_eval_insert_member ON ai_evaluations
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner','admin','manager','operator')
        AND is_active
    )
  );

DROP POLICY IF EXISTS coaching_select_member ON coaching_suggestions;
CREATE POLICY coaching_select_member ON coaching_suggestions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active
    )
  );

DROP POLICY IF EXISTS coaching_mutate_manager ON coaching_suggestions;
CREATE POLICY coaching_mutate_manager ON coaching_suggestions
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner','admin','manager')
        AND is_active
    )
  );

COMMENT ON TABLE evaluation_rubrics IS 'Configurable scoring rubrics per organization. JSON criteria defines axes & weights.';
COMMENT ON TABLE ai_evaluations IS 'AI-generated post-call evaluation: score / summary / highlights / issues.';
COMMENT ON TABLE coaching_suggestions IS 'AI-generated improvement suggestions for agent prompts / flows.';
