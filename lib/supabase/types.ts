// 共通: Supabase スキーマの型ヒント (生成型は別途 npm run gen:types で更新する想定)
// ここでは最低限のテーブル型を手書きで定義し、データ層で利用する。

export type UUID = string;
export type ISODate = string;

export type OrgRole = "owner" | "admin" | "manager" | "operator" | "auditor" | "viewer" | "billing";

export interface Organization {
  id: UUID;
  slug: string;
  name: string;
  plan: "free" | "starter" | "pro" | "enterprise";
  status: "active" | "suspended" | "trialing" | "past_due";
  billing_email: string | null;
  default_voice: string | null;
  default_lang: string | null;
  data_region: string | null;
  branding: Record<string, unknown>;
  settings: Record<string, unknown>;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface Workspace {
  id: UUID;
  organization_id: UUID;
  slug: string;
  name: string;
  description: string | null;
  is_default: boolean;
  settings: Record<string, unknown>;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface Membership {
  id: UUID;
  organization_id: UUID;
  user_id: UUID;
  role: OrgRole;
  workspace_ids: UUID[];
  invited_by: UUID | null;
  invited_at: ISODate | null;
  accepted_at: ISODate | null;
  last_active_at: ISODate | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: ISODate;
}

export interface Invitation {
  id: UUID;
  organization_id: UUID;
  email: string;
  role: OrgRole;
  token: string;
  invited_by: UUID | null;
  expires_at: ISODate;
  accepted_at: ISODate | null;
  created_at: ISODate;
}

export interface AuditLog {
  id: UUID;
  organization_id: UUID | null;
  workspace_id: UUID | null;
  actor_id: UUID | null;
  actor_email: string | null;
  actor_role: OrgRole | null;
  action: string;
  resource_type: string | null;
  resource_id: UUID | null;
  resource_label: string | null;
  status: "success" | "failure" | "denied";
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  metadata: Record<string, unknown>;
  error_message: string | null;
  recorded_at: ISODate;
}

export interface UsageEvent {
  id: UUID;
  organization_id: UUID;
  workspace_id: UUID | null;
  project_id: UUID | null;
  call_id: UUID | null;
  metric: "call.minutes" | "llm.input_tokens" | "llm.output_tokens" | "stt.seconds" | "tts.characters" | "storage.bytes_hour";
  provider: string | null;
  quantity: number;
  unit_cost_usd: number | null;
  cost_usd: number | null;
  metadata: Record<string, unknown>;
  occurred_at: ISODate;
}

export interface UsageDaily {
  organization_id: UUID;
  workspace_id: UUID | null;
  project_id: UUID | null;
  day: string;          // YYYY-MM-DD
  metric: string;
  provider: string;
  quantity: number;
  cost_usd: number;
}

export interface OrganizationQuota {
  organization_id: UUID;
  plan_name: string;
  call_minutes_month: number;
  llm_tokens_month: number;
  active_projects: number;
  members: number;
  storage_gb: number;
  effective_from: ISODate;
  updated_at: ISODate;
}

export interface Contact {
  id: UUID;
  organization_id: UUID;
  workspace_id: UUID | null;
  phone_number: string | null;
  email: string | null;
  full_name: string | null;
  furigana: string | null;
  company: string | null;
  position: string | null;
  address: string | null;
  tags: string[];
  attributes: Record<string, unknown>;
  do_not_call: boolean;
  do_not_call_reason: string | null;
  consent_status: "unknown" | "opted_in" | "opted_out" | "revoked";
  consent_recorded_at: ISODate | null;
  source: string | null;
  external_id: string | null;
  last_called_at: ISODate | null;
  last_call_outcome: string | null;
  total_calls: number;
  created_by: UUID | null;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface Campaign {
  id: UUID;
  organization_id: UUID;
  workspace_id: UUID | null;
  project_id: UUID | null;
  name: string;
  description: string | null;
  direction: "outbound" | "inbound";
  status: "draft" | "scheduled" | "running" | "paused" | "completed" | "archived" | "failed";
  contact_list_id: UUID | null;
  target_filter: Record<string, unknown> | null;
  start_at: ISODate | null;
  end_at: ISODate | null;
  timezone: string;
  daily_window: { start: string; end: string };
  allowed_weekdays: number[];
  concurrency: number;
  retry_max: number;
  retry_interval_min: number;
  caller_id: string | null;
  prompt_override: string | null;
  first_message_override: string | null;
  goal_metric: string | null;
  goal_target: number | null;
  total_targets: number;
  total_dialed: number;
  total_connected: number;
  total_success: number;
  total_failed: number;
  created_by: UUID | null;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface Call {
  id: UUID;
  organization_id: UUID;
  workspace_id: UUID | null;
  project_id: UUID | null;
  campaign_id: UUID | null;
  contact_id: UUID | null;
  external_id: string | null;
  provider: "vapi" | "dialogflow_cx" | "twilio" | "manual" | "browser";
  direction: "outbound" | "inbound" | "test";
  from_number: string | null;
  to_number: string | null;
  status: "queued" | "dialing" | "ringing" | "in_progress" | "completed" | "no_answer" | "busy" | "failed" | "canceled" | "voicemail";
  queued_at: ISODate | null;
  started_at: ISODate | null;
  answered_at: ISODate | null;
  ended_at: ISODate | null;
  duration_seconds: number | null;
  ended_reason: string | null;
  outcome: string | null;
  outcome_notes: string | null;
  appointment_at: ISODate | null;
  transfer_to: string | null;
  score_overall: number | null;
  score_components: Record<string, number> | null;
  summary: string | null;
  summary_short: string | null;
  key_topics: string[];
  sentiment: string | null;
  recording_url: string | null;
  recording_provider: string | null;
  recording_duration_seconds: number | null;
  cost_usd: number | null;
  cost_breakdown: Record<string, number> | null;
  metadata: Record<string, unknown>;
  raw_provider_payload: Record<string, unknown> | null;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface Transcript {
  id: UUID;
  call_id: UUID;
  organization_id: UUID;
  turn_index: number;
  role: "agent" | "customer" | "system" | "tool";
  text: string;
  language: string;
  start_ms: number | null;
  end_ms: number | null;
  confidence: number | null;
  intent: string | null;
  tool_name: string | null;
  tool_args: Record<string, unknown> | null;
  emotion: string | null;
  sentiment: string | null;
  metadata: Record<string, unknown>;
  created_at: ISODate;
}

export interface AIEvaluation {
  id: UUID;
  organization_id: UUID;
  call_id: UUID;
  rubric_id: UUID | null;
  rubric_version: number | null;
  model: string | null;
  status: "pending" | "running" | "completed" | "failed";
  score_overall: number | null;
  scores: Record<string, number>;
  summary: string | null;
  summary_short: string | null;
  highlights: Array<{ type: string; quote: string; reason: string }> | null;
  issues: Array<{ type: string; quote: string; reason: string; severity?: string }> | null;
  next_actions: string[];
  customer_intent: string | null;
  classification: string | null;
  prompt_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  latency_ms: number | null;
  raw_response: Record<string, unknown> | null;
  error_message: string | null;
  created_at: ISODate;
  completed_at: ISODate | null;
}

export interface Notification {
  id: UUID;
  organization_id: UUID;
  recipient_id: UUID | null;
  type: string;
  severity: "info" | "success" | "warning" | "error" | "critical";
  title: string;
  body: string | null;
  action_url: string | null;
  metadata: Record<string, unknown>;
  read_at: ISODate | null;
  delivered_email: boolean;
  delivered_slack: boolean;
  created_at: ISODate;
}

export interface ApiKey {
  id: UUID;
  organization_id: UUID;
  workspace_id: UUID | null;
  name: string;
  prefix: string;
  scopes: string[];
  rate_limit_rpm: number | null;
  is_active: boolean;
  last_used_at: ISODate | null;
  last_used_ip: string | null;
  expires_at: ISODate | null;
  created_by: UUID | null;
  revoked_at: ISODate | null;
  revoked_by: UUID | null;
  created_at: ISODate;
}
