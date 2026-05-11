-- Migration: 通話 (calls / transcripts / call_events)
-- Date: 2026-05-11
-- Purpose:
--   通話単位の主テーブル＋発話単位のトランスクリプト＋イベントログ。
--   既存 mockCallLogs / mockTranscripts の構造を本番テーブルに昇格。
--   全文検索のため transcripts に tsvector + GIN を貼る。

CREATE TABLE IF NOT EXISTS calls (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id      UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  project_id        UUID,                              -- agent / scenario
  campaign_id       UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  contact_id        UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- 外部システムID (Vapi / DFCX session)
  external_id       TEXT,                              -- e.g. vapi call id / DFCX session ID
  provider          TEXT NOT NULL DEFAULT 'vapi'       -- 'vapi' / 'dialogflow_cx' / 'twilio' 等
    CHECK (provider IN ('vapi','dialogflow_cx','twilio','manual','browser')),

  direction         TEXT NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('outbound','inbound','test')),
  from_number       TEXT,
  to_number         TEXT,

  -- 状態
  status            TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','dialing','ringing','in_progress','completed','no_answer','busy','failed','canceled','voicemail')),

  -- タイムスタンプ
  queued_at         TIMESTAMPTZ DEFAULT NOW(),
  started_at        TIMESTAMPTZ,
  answered_at       TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ,
  duration_seconds  INTEGER,

  -- 結果
  ended_reason      TEXT,                              -- 'customer_hangup' / 'agent_hangup' / 'timeout' / 'error'
  outcome           TEXT,                              -- ビジネス成果 'appointment' / 'rejected' / 'callback' 等
  outcome_notes     TEXT,
  appointment_at    TIMESTAMPTZ,
  transfer_to       TEXT,                              -- 人間転送した宛先

  -- スコアリング (後段で AI が埋める)
  score_overall     NUMERIC,                           -- 0..100
  score_components  JSONB,                             -- {empathy, accuracy, compliance, ...}
  summary           TEXT,
  summary_short     TEXT,
  key_topics        TEXT[] DEFAULT '{}'::text[],
  sentiment         TEXT,                              -- 'positive' / 'negative' / 'neutral' / 'mixed'

  -- 録音
  recording_url     TEXT,
  recording_provider TEXT,
  recording_duration_seconds INTEGER,

  -- コスト
  cost_usd          NUMERIC,
  cost_breakdown    JSONB,                             -- {stt:..., llm:..., tts:..., telephony:...}

  -- メタ
  metadata          JSONB DEFAULT '{}'::jsonb,
  raw_provider_payload JSONB,                          -- webhook そのまま (デバッグ用)

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calls_org_started
  ON calls (organization_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_project_started
  ON calls (project_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_campaign_status
  ON calls (campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_calls_contact
  ON calls (contact_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_status_started
  ON calls (status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_external
  ON calls (provider, external_id);
CREATE INDEX IF NOT EXISTS idx_calls_outcome
  ON calls (organization_id, outcome) WHERE outcome IS NOT NULL;

-- ── transcripts: 1発話 = 1行 ────────────────────────────
CREATE TABLE IF NOT EXISTS transcripts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id          UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  turn_index       INTEGER NOT NULL,
  role             TEXT NOT NULL CHECK (role IN ('agent','customer','system','tool')),
  text             TEXT NOT NULL,
  language         TEXT DEFAULT 'ja',
  start_ms         INTEGER,                            -- 通話開始からの ms オフセット
  end_ms           INTEGER,
  confidence       NUMERIC,
  intent           TEXT,                               -- DFCX 等で検出された intent
  tool_name        TEXT,                               -- function/tool call の場合
  tool_args        JSONB,
  emotion          TEXT,
  sentiment        TEXT,
  metadata         JSONB DEFAULT '{}'::jsonb,
  -- 全文検索 (日本語は pg_bigm 推奨だが現状 simple + trgm でも実用)
  text_tsv         tsvector
    GENERATED ALWAYS AS (to_tsvector('simple', coalesce(text,''))) STORED,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (call_id, turn_index)
);

CREATE INDEX IF NOT EXISTS idx_transcripts_call_turn
  ON transcripts (call_id, turn_index);
CREATE INDEX IF NOT EXISTS idx_transcripts_org_created
  ON transcripts (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transcripts_text_tsv
  ON transcripts USING GIN (text_tsv);
CREATE INDEX IF NOT EXISTS idx_transcripts_text_trgm
  ON transcripts USING GIN (text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_transcripts_intent
  ON transcripts (call_id, intent) WHERE intent IS NOT NULL;

-- ── call_events: 通話中の状態遷移ログ ──────────────────
CREATE TABLE IF NOT EXISTS call_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id          UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  type             TEXT NOT NULL,                      -- 'state.changed' / 'dtmf' / 'transfer.requested' / 'error' 等
  payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_events_call
  ON call_events (call_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_call_events_type
  ON call_events (call_id, type);

-- ── updated_at trigger ────────────────────────────────
DROP TRIGGER IF EXISTS calls_set_updated_at ON calls;
CREATE TRIGGER calls_set_updated_at
  BEFORE UPDATE ON calls
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── contacts 側の last_called_at / total_calls を更新するトリガ ──
CREATE OR REPLACE FUNCTION update_contact_call_stats() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contact_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status <> 'completed') THEN
    UPDATE contacts
       SET last_called_at = COALESCE(NEW.ended_at, NEW.started_at, NOW()),
           last_call_outcome = NEW.outcome,
           total_calls = total_calls + 1
     WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calls_update_contact ON calls;
CREATE TRIGGER calls_update_contact
  AFTER INSERT OR UPDATE OF status ON calls
  FOR EACH ROW EXECUTE FUNCTION update_contact_call_stats();

-- ── RLS ─────────────────────────────────────────────────
ALTER TABLE calls       ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calls_select_member ON calls;
CREATE POLICY calls_select_member ON calls
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active
    )
  );

DROP POLICY IF EXISTS calls_mutate_operator ON calls;
CREATE POLICY calls_mutate_operator ON calls
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner','admin','manager','operator')
        AND is_active
    )
  );

DROP POLICY IF EXISTS transcripts_select_member ON transcripts;
CREATE POLICY transcripts_select_member ON transcripts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active
    )
  );

DROP POLICY IF EXISTS transcripts_insert ON transcripts;
CREATE POLICY transcripts_insert ON transcripts
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner','admin','manager','operator')
        AND is_active
    )
  );

DROP POLICY IF EXISTS call_events_select ON call_events;
CREATE POLICY call_events_select ON call_events
  FOR SELECT USING (
    call_id IN (
      SELECT id FROM calls WHERE organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND is_active
      )
    )
  );

DROP POLICY IF EXISTS call_events_insert ON call_events;
CREATE POLICY call_events_insert ON call_events
  FOR INSERT WITH CHECK (
    call_id IN (
      SELECT id FROM calls WHERE organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid()
          AND role IN ('owner','admin','manager','operator')
          AND is_active
      )
    )
  );

COMMENT ON TABLE calls IS 'Primary call records. 1 row per call attempt.';
COMMENT ON TABLE transcripts IS 'Utterance-level transcript with tsvector for FTS.';
COMMENT ON TABLE call_events IS 'State changes & telemetry events within a call.';
