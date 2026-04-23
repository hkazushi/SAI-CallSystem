/**
 * @vapi-ai/server-sdk のシングルトンクライアント。
 *
 * Vapi API キーは .env.local の VAPI_API_KEY を読む。
 * サーバ側でのみ使う (API Route / Server Action)。
 */
import { VapiClient } from "@vapi-ai/server-sdk";

let cached: VapiClient | null = null;

export function getVapiClient(): VapiClient {
  if (cached) return cached;

  const token = process.env.VAPI_API_KEY;
  if (!token) {
    throw new Error(
      "VAPI_API_KEY が未設定です。.env.local に Vapi ダッシュボードの Private Key を入れてください。",
    );
  }

  cached = new VapiClient({ token });
  return cached;
}
