-- Migration: DFCX デプロイ状態を projects テーブルに追加
-- Date: 2026-04-27
-- Purpose:
--   Vapi 用カラム (vapi_assistant_id 等) の双子として、
--   Dialogflow CX 側のデプロイ状態を保持する。
--   train は非同期ジョブのため operation 名を保存して別エンドポイントで polling する。
--
-- 適用方法:
--   supabase db push                 # local dev
--   supabase db push --linked        # remote
--   または Studio から直接実行

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS dfcx_agent_id            TEXT,
  ADD COLUMN IF NOT EXISTS dfcx_agent_name          TEXT,         -- "projects/{}/locations/{}/agents/{id}"
  ADD COLUMN IF NOT EXISTS dfcx_flow_id             TEXT,
  ADD COLUMN IF NOT EXISTS dfcx_deploy_status       TEXT          -- 'none' | 'deploying' | 'training' | 'ready' | 'error'
    DEFAULT 'none'
    CHECK (dfcx_deploy_status IN ('none', 'deploying', 'training', 'ready', 'error')),
  ADD COLUMN IF NOT EXISTS dfcx_train_operation_id  TEXT,         -- "operations/{name}"
  ADD COLUMN IF NOT EXISTS dfcx_deployed_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dfcx_error_message       TEXT,
  ADD COLUMN IF NOT EXISTS log_draft_output         JSONB;        -- analyze-logs 結果 (Partial<ChappieOutput>)

-- ステータスでフィルタする頻度が高いので部分インデックス
CREATE INDEX IF NOT EXISTS idx_projects_dfcx_status
  ON projects (dfcx_deploy_status)
  WHERE dfcx_deploy_status <> 'none';

COMMENT ON COLUMN projects.dfcx_agent_name IS
  'Full resource name from DFCX REST v3: projects/{}/locations/{}/agents/{id}';
COMMENT ON COLUMN projects.dfcx_train_operation_id IS
  'Async train operation name. Poll via operations.get() until done=true.';
COMMENT ON COLUMN projects.log_draft_output IS
  'analyze-logs エンドポイントが生成した Partial<ChappieOutput> ドラフト. Chappie 壁打ちのシードに使う.';
