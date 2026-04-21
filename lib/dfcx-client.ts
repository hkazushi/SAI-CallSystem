// ============================================================================
// Dialogflow CX SDK Wrapper
// サーバサイド限定。API routesからのみ呼ぶこと。
// ADC (Application Default Credentials) または GCP_SERVICE_ACCOUNT_JSON に対応。
// ============================================================================

import {
  AgentsClient,
  EntityTypesClient,
  IntentsClient,
  FlowsClient,
  PagesClient,
  SessionsClient,
  protos,
} from "@google-cloud/dialogflow-cx";

export interface DfcxConfig {
  projectId: string;
  location: string;
  /** サービスアカウントJSON直指定。未設定時はADCを使用。 */
  credentials?: {
    client_email: string;
    private_key: string;
    project_id: string;
  };
}

export class DfcxConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DfcxConfigError";
  }
}

/** 環境変数からDFCX設定を構築。
 *  GCP_SERVICE_ACCOUNT_JSON が未設定でもADCがあれば動作する。 */
export function getDfcxConfig(): DfcxConfig {
  const raw = process.env.GCP_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_LOCATION ?? "asia-northeast1";

  if (!projectId) {
    throw new DfcxConfigError("GCP_PROJECT_ID 環境変数が未設定です。");
  }

  // サービスアカウントJSONが指定されている場合はそちらを優先
  if (raw && raw.trim() !== "" && !raw.startsWith("<")) {
    let parsed: { client_email: string; private_key: string; project_id: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new DfcxConfigError("GCP_SERVICE_ACCOUNT_JSON がJSONとしてパースできません。");
    }
    if (!parsed.client_email || !parsed.private_key) {
      throw new DfcxConfigError("サービスアカウントJSONに client_email / private_key が含まれていません。");
    }
    return { projectId, location, credentials: parsed };
  }

  // ADCモード: credentialsを渡さずSDKにADCを自動検出させる
  return { projectId, location };
}

/** 設定済みかどうかを例外なしで判定。UI側の表示用。 */
export function getDfcxStatus(): {
  configured: boolean;
  projectId?: string;
  location?: string;
  authMode?: string;
  error?: string;
} {
  try {
    const cfg = getDfcxConfig();
    return {
      configured: true,
      projectId: cfg.projectId,
      location: cfg.location,
      authMode: cfg.credentials ? "service_account" : "adc",
    };
  } catch (e) {
    return { configured: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── クライアント生成 ────────────────────────────────────────────────────────
function getApiEndpoint(location: string): string | undefined {
  if (location === "global") return undefined;
  return `${location}-dialogflow.googleapis.com`;
}

function clientOptions(cfg: DfcxConfig) {
  const opts: {
    projectId: string;
    apiEndpoint?: string;
    credentials?: { client_email: string; private_key: string };
  } = {
    projectId: cfg.projectId,
    apiEndpoint: getApiEndpoint(cfg.location),
  };
  if (cfg.credentials) {
    opts.credentials = {
      client_email: cfg.credentials.client_email,
      private_key: cfg.credentials.private_key,
    };
  }
  return opts;
}

export function makeAgentsClient(cfg: DfcxConfig) {
  return new AgentsClient(clientOptions(cfg));
}
export function makeEntityTypesClient(cfg: DfcxConfig) {
  return new EntityTypesClient(clientOptions(cfg));
}
export function makeIntentsClient(cfg: DfcxConfig) {
  return new IntentsClient(clientOptions(cfg));
}
export function makeFlowsClient(cfg: DfcxConfig) {
  return new FlowsClient(clientOptions(cfg));
}
export function makePagesClient(cfg: DfcxConfig) {
  return new PagesClient(clientOptions(cfg));
}
export function makeSessionsClient(cfg: DfcxConfig) {
  return new SessionsClient(clientOptions(cfg));
}

// ── リソースパス ────────────────────────────────────────────────────────────
export function locationPath(cfg: DfcxConfig) {
  return `projects/${cfg.projectId}/locations/${cfg.location}`;
}

export type { protos };
