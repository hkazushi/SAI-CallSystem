-- Migration: 顧客リスト (contact_lists / contacts / list_memberships)
-- Date: 2026-05-11
-- Purpose:
--   発信先・受信元の顧客情報を一元管理。
--   既存 lists/calls の mock 構造を本番テーブルに昇格させる。
--   重複排除キー = (organization_id, phone_number) で同一人物を識別。

CREATE TABLE IF NOT EXISTS contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  phone_number    TEXT,                                 -- E.164 推奨
  email           TEXT,
  full_name       TEXT,
  furigana        TEXT,
  company         TEXT,
  position        TEXT,
  address         TEXT,
  tags            TEXT[] DEFAULT '{}'::text[],
  attributes      JSONB DEFAULT '{}'::jsonb,            -- 業種・LTV・status 等のカスタム属性
  do_not_call     BOOLEAN NOT NULL DEFAULT FALSE,       -- DNC リスト
  do_not_call_reason TEXT,
  consent_status  TEXT DEFAULT 'unknown'
    CHECK (consent_status IN ('unknown','opted_in','opted_out','revoked')),
  consent_recorded_at TIMESTAMPTZ,
  source          TEXT,                                 -- 'manual' / 'csv_import' / 'webhook:xxx' / 'api'
  external_id     TEXT,                                 -- 取込元のID (CRM など)
  last_called_at  TIMESTAMPTZ,
  last_call_outcome TEXT,
  total_calls     INTEGER NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, phone_number)                -- 同一組織内で電話番号重複させない
);

CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts (organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org_phone ON contacts (organization_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_workspace ON contacts (workspace_id);
CREATE INDEX IF NOT EXISTS idx_contacts_tags_gin ON contacts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_contacts_attributes_gin ON contacts USING GIN (attributes);
CREATE INDEX IF NOT EXISTS idx_contacts_dnc ON contacts (organization_id) WHERE do_not_call = TRUE;
-- 全文検索 (氏名・会社名)
CREATE INDEX IF NOT EXISTS idx_contacts_name_trgm ON contacts USING GIN ((full_name || ' ' || COALESCE(company,'')) gin_trgm_ops);

-- contact_lists: 静的セグメント
CREATE TABLE IF NOT EXISTS contact_lists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  filter          JSONB,                                -- 動的セグメント定義 (タグ/属性条件)
  is_dynamic      BOOLEAN NOT NULL DEFAULT FALSE,
  contact_count   INTEGER NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_contact_lists_org ON contact_lists (organization_id);

-- 中間テーブル: 静的リスト所属
CREATE TABLE IF NOT EXISTS contact_list_members (
  list_id     UUID NOT NULL REFERENCES contact_lists(id) ON DELETE CASCADE,
  contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by    UUID REFERENCES auth.users(id),
  PRIMARY KEY (list_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_list_members_contact
  ON contact_list_members (contact_id);

-- ── trgm 拡張 (含まれていない場合のみ作成) ───────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── updated_at trigger ─────────────────────────────────
DROP TRIGGER IF EXISTS contacts_set_updated_at ON contacts;
CREATE TRIGGER contacts_set_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS contact_lists_set_updated_at ON contact_lists;
CREATE TRIGGER contact_lists_set_updated_at
  BEFORE UPDATE ON contact_lists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ─────────────────────────────────────────────────
ALTER TABLE contacts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_lists        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_list_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contacts_select_member ON contacts;
CREATE POLICY contacts_select_member ON contacts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active
    )
  );

DROP POLICY IF EXISTS contacts_mutate_member ON contacts;
CREATE POLICY contacts_mutate_member ON contacts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner','admin','manager','operator')
        AND is_active
    )
  );

DROP POLICY IF EXISTS contact_lists_select_member ON contact_lists;
CREATE POLICY contact_lists_select_member ON contact_lists
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active
    )
  );

DROP POLICY IF EXISTS contact_lists_mutate_member ON contact_lists;
CREATE POLICY contact_lists_mutate_member ON contact_lists
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner','admin','manager','operator')
        AND is_active
    )
  );

DROP POLICY IF EXISTS contact_list_members_select ON contact_list_members;
CREATE POLICY contact_list_members_select ON contact_list_members
  FOR SELECT USING (
    list_id IN (
      SELECT id FROM contact_lists WHERE organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND is_active
      )
    )
  );

DROP POLICY IF EXISTS contact_list_members_mutate ON contact_list_members;
CREATE POLICY contact_list_members_mutate ON contact_list_members
  FOR ALL USING (
    list_id IN (
      SELECT id FROM contact_lists WHERE organization_id IN (
        SELECT organization_id FROM memberships
        WHERE user_id = auth.uid()
          AND role IN ('owner','admin','manager','operator')
          AND is_active
      )
    )
  );

COMMENT ON TABLE contacts IS 'Master contact records. Deduped by (organization_id, phone_number).';
COMMENT ON TABLE contact_lists IS 'Static or dynamic segments of contacts for campaigns.';
COMMENT ON COLUMN contacts.consent_status IS 'For TCPA / 特商法 outbound compliance.';
