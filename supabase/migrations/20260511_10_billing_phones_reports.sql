-- Migration: 請求・電話番号・レポート (phone_numbers / billing / reports / notifications)
-- Date: 2026-05-11
-- Purpose:
--   電話番号在庫、Stripe等請求情報のプレースホルダ、レポート生成ジョブ、通知。

-- ── phone_numbers ────────────────────────────────────
CREATE TABLE IF NOT EXISTS phone_numbers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  e164            TEXT NOT NULL,
  label           TEXT,
  provider        TEXT NOT NULL DEFAULT 'twilio'
    CHECK (provider IN ('twilio','vonage','plivo','manual','vapi')),
  provider_sid    TEXT,                                -- 外部識別子
  capabilities    TEXT[] DEFAULT '{"voice"}'::text[],  -- 'voice','sms','mms'
  country         TEXT DEFAULT 'JP',
  region          TEXT,
  monthly_cost_usd NUMERIC,
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended','released')),
  assigned_project_id UUID,
  assigned_campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  acquired_at     TIMESTAMPTZ DEFAULT NOW(),
  released_at     TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, e164)
);

CREATE INDEX IF NOT EXISTS idx_phone_numbers_org
  ON phone_numbers (organization_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_phone_numbers_project
  ON phone_numbers (assigned_project_id);

-- ── billing_accounts: Stripe ID 等の保管 (プレースホルダ) ──
CREATE TABLE IF NOT EXISTS billing_accounts (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL DEFAULT 'stripe',
  customer_id     TEXT,                                -- stripe customer id
  subscription_id TEXT,
  subscription_status TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  default_payment_method TEXT,
  currency        TEXT DEFAULT 'JPY',
  tax_id          TEXT,
  billing_address JSONB,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── invoices: 請求書 (プレースホルダ) ─────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider_invoice_id TEXT,
  number          TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','open','paid','void','uncollectible','past_due')),
  amount_due      NUMERIC NOT NULL DEFAULT 0,
  amount_paid     NUMERIC NOT NULL DEFAULT 0,
  currency        TEXT DEFAULT 'JPY',
  period_start    DATE,
  period_end      DATE,
  due_date        DATE,
  paid_at         TIMESTAMPTZ,
  line_items      JSONB DEFAULT '[]'::jsonb,
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_org_period
  ON invoices (organization_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status
  ON invoices (status) WHERE status IN ('open','past_due');

-- ── reports: 自動生成レポート ──────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  type            TEXT NOT NULL                        -- 'weekly_summary' / 'monthly_billing' / 'campaign_result' 等
    CHECK (type IN ('weekly_summary','monthly_summary','campaign_result','agent_quality','custom')),
  name            TEXT NOT NULL,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','generating','ready','failed','expired')),
  data            JSONB,                               -- KPI スナップショット
  pdf_url         TEXT,
  csv_url         TEXT,
  generated_by    TEXT,                                -- 'system' / user_id
  generated_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_org_period
  ON reports (organization_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_reports_pending
  ON reports (status) WHERE status IN ('pending','generating');

-- ── notifications: アプリ内通知 ────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,                       -- 'call.completed' / 'quota.warning' / 'report.ready' 等
  severity        TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info','success','warning','error','critical')),
  title           TEXT NOT NULL,
  body            TEXT,
  action_url      TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  read_at         TIMESTAMPTZ,
  delivered_email BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_slack BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON notifications (recipient_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_org_type
  ON notifications (organization_id, type, created_at DESC);

-- ── updated_at triggers ─────────────────────────────
DROP TRIGGER IF EXISTS phone_numbers_set_updated_at ON phone_numbers;
CREATE TRIGGER phone_numbers_set_updated_at
  BEFORE UPDATE ON phone_numbers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS billing_accounts_set_updated_at ON billing_accounts;
CREATE TRIGGER billing_accounts_set_updated_at
  BEFORE UPDATE ON billing_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS invoices_set_updated_at ON invoices;
CREATE TRIGGER invoices_set_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ─────────────────────────────────────────────────
ALTER TABLE phone_numbers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS phone_numbers_select_member ON phone_numbers;
CREATE POLICY phone_numbers_select_member ON phone_numbers
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active
    )
  );

DROP POLICY IF EXISTS phone_numbers_mutate_admin ON phone_numbers;
CREATE POLICY phone_numbers_mutate_admin ON phone_numbers
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND role IN ('owner','admin','manager') AND is_active
    )
  );

DROP POLICY IF EXISTS billing_select_priv ON billing_accounts;
CREATE POLICY billing_select_priv ON billing_accounts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND role IN ('owner','admin','billing') AND is_active
    )
  );

DROP POLICY IF EXISTS billing_mutate_priv ON billing_accounts;
CREATE POLICY billing_mutate_priv ON billing_accounts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND role IN ('owner','billing') AND is_active
    )
  );

DROP POLICY IF EXISTS invoices_select_priv ON invoices;
CREATE POLICY invoices_select_priv ON invoices
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND role IN ('owner','admin','billing') AND is_active
    )
  );

DROP POLICY IF EXISTS reports_select_member ON reports;
CREATE POLICY reports_select_member ON reports
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND is_active
    )
  );

DROP POLICY IF EXISTS reports_mutate_manager ON reports;
CREATE POLICY reports_mutate_manager ON reports
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND role IN ('owner','admin','manager') AND is_active
    )
  );

DROP POLICY IF EXISTS notifications_select_recipient ON notifications;
CREATE POLICY notifications_select_recipient ON notifications
  FOR SELECT USING (
    recipient_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND role IN ('owner','admin') AND is_active
    )
  );

DROP POLICY IF EXISTS notifications_update_recipient ON notifications;
CREATE POLICY notifications_update_recipient ON notifications
  FOR UPDATE USING (recipient_id = auth.uid());

COMMENT ON TABLE phone_numbers IS 'Owned phone numbers per organization, assigned to projects/campaigns.';
COMMENT ON TABLE billing_accounts IS 'Stripe/external billing reference. Plumbed but inactive (placeholder).';
COMMENT ON TABLE invoices IS 'Billing invoices (populated by Stripe webhook in production).';
COMMENT ON TABLE reports IS 'Generated reports (weekly/monthly summaries, campaign results).';
COMMENT ON TABLE notifications IS 'In-app notifications for users.';
