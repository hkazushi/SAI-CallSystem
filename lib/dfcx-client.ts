/**
 * Dialogflow CX REST v3 への認証ヘルパー。
 *
 * 公式 SDK (@google-cloud/dialogflow-cx) は重く Edge Runtime 非対応のため、
 * google-auth-library で OAuth2 アクセストークンだけ取り、HTTP は fetch で叩く。
 *
 * 環境変数:
 *   GCP_PROJECT_ID            — DFCX を有効化した GCP プロジェクト ID
 *   GCP_LOCATION              — global / asia-northeast1 等
 *   GCP_SERVICE_ACCOUNT_JSON  — Service Account 鍵 JSON (1行で貼る、本番は Vercel Sensitive)
 *   DFCX_MOCK_TOKEN           — テスト用 (設定があれば auth をバイパス、本番は未設定)
 */
import { GoogleAuth } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];

let cachedAuth: GoogleAuth | null = null;

function getAuthClient(): GoogleAuth {
  if (cachedAuth) return cachedAuth;
  const json = process.env.GCP_SERVICE_ACCOUNT_JSON;
  if (!json) {
    throw new Error(
      "GCP_SERVICE_ACCOUNT_JSON is not set. Set it in .env.local or Vercel environment variables.",
    );
  }
  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(json);
  } catch (e) {
    throw new Error(
      `GCP_SERVICE_ACCOUNT_JSON is not valid JSON: ${e instanceof Error ? e.message : "unknown"}`,
    );
  }
  cachedAuth = new GoogleAuth({ credentials, scopes: SCOPES });
  return cachedAuth;
}

/**
 * GCP のアクセストークンを取得する。
 * DFCX_MOCK_TOKEN が設定されていればそれを返す (テスト用)。
 */
export async function getAccessToken(): Promise<string> {
  if (process.env.DFCX_MOCK_TOKEN) return process.env.DFCX_MOCK_TOKEN;
  const auth = getAuthClient();
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Failed to obtain GCP access token");
  return token.token;
}

/** DFCX REST API のベース URL を組み立てる */
export function dfcxApiBase(location?: string): string {
  const loc = location ?? process.env.GCP_LOCATION ?? "global";
  return loc === "global"
    ? "https://dialogflow.googleapis.com/v3"
    : `https://${loc}-dialogflow.googleapis.com/v3`;
}

/** GCP プロジェクト ID を環境から取得 */
export function getGcpProjectId(): string {
  const id = process.env.GCP_PROJECT_ID;
  if (!id) throw new Error("GCP_PROJECT_ID is not set");
  return id;
}

/** GCP ロケーションを環境から取得 (default: asia-northeast1) */
export function getGcpLocation(): string {
  return process.env.GCP_LOCATION ?? "asia-northeast1";
}

/**
 * 認証済み fetch ラッパー。
 * - Authorization: Bearer <token> を自動付与
 * - エラー時は { ok: false, status, error } を throw
 */
export async function dfcxFetch<T>(
  path: string,
  init: RequestInit = {},
  options?: { location?: string },
): Promise<T> {
  const token = await getAccessToken();
  const base = dfcxApiBase(options?.location);
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const resp = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new DfcxApiError(resp.status, `${resp.status} ${resp.statusText} on ${url}: ${body}`);
  }
  // 一部 endpoint (DELETE) は 200 with empty body
  const text = await resp.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export class DfcxApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "DfcxApiError";
  }
}
