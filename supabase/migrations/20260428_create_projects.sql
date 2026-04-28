-- Migration: projects テーブル作成 (DFCX/ChappieOutput 統合版)
-- Date: 2026-04-28
-- Notes:
--   既存の 20260427_dfcx_columns.sql は ALTER TABLE projects だが、
--   テーブル本体が無かったので CREATE TABLE IF NOT EXISTS で先に定義する。
--   2回目以降の適用でも壊れないよう ADD COLUMN IF NOT EXISTS を併用。

CREATE TABLE IF NOT EXISTS projects (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        TEXT NOT NULL,
  template_id                 TEXT,
  chappie_output              JSONB,        -- ChappieOutput 全文 (壁打ち再現用)
  -- DFCX デプロイ状態
  dfcx_agent_id               TEXT,
  dfcx_agent_name             TEXT,         -- "projects/{}/locations/{}/agents/{id}"
  dfcx_flow_id                TEXT,
  dfcx_deploy_status          TEXT          DEFAULT 'none'
    CHECK (dfcx_deploy_status IN ('none', 'deploying', 'training', 'ready', 'error')),
  dfcx_train_operation_id     TEXT,
  dfcx_deployed_at            TIMESTAMPTZ,
  dfcx_error_message          TEXT,
  log_draft_output            JSONB,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 既存テーブルがあった場合の追加カラム
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS chappie_output JSONB,
  ADD COLUMN IF NOT EXISTS template_id TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_dfcx_status
  ON projects (dfcx_deploy_status)
  WHERE dfcx_deploy_status <> 'none';

CREATE INDEX IF NOT EXISTS idx_projects_created_at
  ON projects (created_at DESC);

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_set_updated_at ON projects;
CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- RLS: 認証未導入の MVP は全許可。将来 auth.uid() ベースに切替。
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read all" ON projects;
CREATE POLICY "anon read all" ON projects FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon insert all" ON projects;
CREATE POLICY "anon insert all" ON projects FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "anon update all" ON projects;
CREATE POLICY "anon update all" ON projects FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon delete all" ON projects;
CREATE POLICY "anon delete all" ON projects FOR DELETE USING (true);

COMMENT ON TABLE projects IS '音声AIエージェント プロジェクト本体';
COMMENT ON COLUMN projects.chappie_output IS 'チャッピー壁打ちで生成された ChappieOutput JSON。再編集の起点に使う。';
COMMENT ON COLUMN projects.dfcx_agent_name IS 'Full DFCX resource name. テスト会話/実コール時に detectIntent ターゲットとして使う。';
