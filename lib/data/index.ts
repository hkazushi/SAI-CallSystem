// データ層のファサード。
// 各リソース (contacts / calls / campaigns / etc.) のリポジトリをここから export する。
// アプリ全体は `import { contactsRepo } from "@/lib/data"` のように使う。

export { contactsRepo } from "./contacts";
export { campaignsRepo } from "./campaigns";
export { callsRepo } from "./calls";
export { transcriptsRepo } from "./transcripts";
export { evaluationsRepo } from "./evaluations";
export { dashboardRepo } from "./dashboard";
export { notificationsRepo } from "./notifications";
export { membershipsRepo } from "./memberships";
export { experimentsRepo } from "./experiments";
export { reportsRepo, periodRange } from "./reports";
export { apiKeysRepo, API_KEY_SCOPES } from "./api-keys";
export type { ApiKeyScope } from "./api-keys";
export { webhooksRepo, WEBHOOK_EVENTS } from "./webhooks";
export type { Webhook, WebhookEvent } from "./webhooks";
