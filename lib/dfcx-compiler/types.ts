/**
 * Dialogflow CX (DFCX) Compiler の型定義
 *
 * Vapi Compiler と対称の構造:
 *   ChappieOutput (共通)
 *     → compileDfcxAgent()
 *       → DfcxAgentConfig (REST v3 のリクエストボディ形式)
 *
 * 設計方針:
 *   - REST v3 のリクエスト形式とほぼ 1:1 に対応する
 *   - displayName で参照し、コンパイル中は ID を解決しない (デプロイ時に名前→ID変換)
 *   - baseline (OUTBOUND_SALES_BASELINE / INBOUND_SUPPORT_BASELINE) を spread して
 *     template.dfcxBaseline overlay と ChappieOutput 差分を上書きする
 */

/** sys-prefixed 標準エンティティ型 (DFCX組み込み) */
export type DfcxEntityType =
  | "@sys.person"
  | "@sys.phone-number"
  | "@sys.address"
  | "@sys.date-time"
  | "@sys.number"
  | "@sys.email"
  | "@sys.any";

/** REST v3 fulfillment message (text 単一形式) */
export interface DfcxFulfillmentMessage {
  text: { text: string[] };
}

export interface DfcxFulfillment {
  messages: DfcxFulfillmentMessage[];
}

/** sys.no-match-1/2/3 / sys.no-input-1/2/3 などのイベントハンドラ */
export interface DfcxEventHandler {
  /** "sys.no-match-1" | "sys.no-match-2" | "sys.no-match-3" | "sys.no-input-1" | "sys.no-input-default" など */
  event: string;
  triggerFulfillment: DfcxFulfillment;
  /** マッチ後の遷移先 Page (displayName で指定、デプロイ時に解決) */
  targetPage?: string;
}

/** Form parameter (スロット) */
export interface DfcxParameter {
  displayName: string;
  /** "@sys.person" 等 */
  entityType: string;
  required: boolean;
  fillBehavior: {
    initialPromptFulfillment: DfcxFulfillment;
    repromptEventHandlers: DfcxEventHandler[];
  };
}

/** Page 内の遷移ルート */
export interface DfcxTransitionRoute {
  /** Intent displayName (デプロイ時に ID へ解決) */
  intent?: string;
  /** CX condition syntax (例: "$session.params.name != null") */
  condition?: string;
  triggerFulfillment?: DfcxFulfillment;
  /** 遷移先 Page displayName */
  targetPage?: string;
  /** 遷移先 Flow displayName */
  targetFlow?: string;
}

/** Page (会話の状態) */
export interface DfcxPage {
  displayName: string;
  /** Page 入場時の発話 */
  entryFulfillment?: DfcxFulfillment;
  /** スロット収集 */
  form?: { parameters: DfcxParameter[] };
  /** Intent や condition による遷移 */
  transitionRoutes?: DfcxTransitionRoute[];
  /** sys.no-match や sys.no-input への対応 */
  eventHandlers?: DfcxEventHandler[];
}

/** Intent (ユーザー発話パターン) */
export interface DfcxIntent {
  displayName: string;
  /** "今の回線で満足してる" などの発話例 */
  trainingPhrases: Array<{ parts: Array<{ text: string }>; repeatCount?: number }>;
  /** デフォルト false */
  isFallback?: boolean;
  /** Intent description */
  description?: string;
}

/** Default Start Flow の設定 */
export interface DfcxFlow {
  displayName: string;
  description?: string;
  nluSettings?: {
    modelType: "MODEL_TYPE_ADVANCED" | "MODEL_TYPE_STANDARD";
    classificationThreshold?: number;
  };
}

/** Agent ルート設定 */
export interface DfcxAgent {
  displayName: string;
  defaultLanguageCode: string;
  timeZone: string;
  description?: string;
  speechToTextSettings?: { enableSpeechAdaptation: boolean };
  advancedSettings?: {
    loggingSettings?: {
      enableStackdriverLogging: boolean;
      enableInteractionLogging: boolean;
    };
  };
  /** Vapi で言うところの第一声 (start flow に紐づくが、UI上で Agent の説明として表示) */
  startFlow?: string;
}

/**
 * compileDfcxAgent() の戻り値。
 *
 * REST v3 にデプロイする際は以下の順で使う:
 *   1. POST .../agents              ← agent
 *   2. PATCH Default Start Flow     ← flow
 *   3. POST .../intents (× N)       ← intents
 *   4. POST .../pages (× N)         ← pages
 *   5. PATCH .../pages/{id} (× N)   ← pages の transitionRoutes を ID解決して埋める
 *   6. POST .../webhooks            ← webhookUrl
 *   7. POST .../agents/{id}:train   ← 非同期ジョブ
 */
export interface DfcxAgentConfig {
  agent: DfcxAgent;
  flow: DfcxFlow;
  pages: DfcxPage[];
  intents: DfcxIntent[];
  /** Webhook fulfillment URL (テナント固有) */
  webhookUrl: string;
}

/** compileDfcxAgent のオプション */
export interface DfcxCompileOptions {
  /** テナント識別子 (Webhook URL や Agent displayName に埋める) */
  tenantId: string;
  /** Webhook ベース URL (本番 SaaS ドメイン) */
  webhookBaseUrl?: string;
  /** ベースライン選択。省略時は ChappieOutput.tasks[0].trigger から推定 */
  direction?: "outbound" | "inbound";
  /** GCP プロジェクト ID (Agent の displayName に含める場合に使用) */
  gcpProjectId?: string;
  /** GCP ロケーション (Asia Tokyo 推奨) */
  gcpLocation?: string;
}

/** デプロイ結果 */
export interface DfcxDeployResult {
  ok: boolean;
  projectId: string;
  /** "projects/{}/locations/{}/agents/{id}" full resource name */
  agentName?: string;
  agentId?: string;
  flowId?: string;
  /** train 非同期ジョブ ID (operations/{name}) */
  trainOperationName?: string;
  error?: string;
}

/* ========================================================================
 * Template overlay 型 (lib/templates/types.ts から re-export して使う)
 * ======================================================================== */

/** ベースラインに追加する Page の指定 (簡易フォーマット) */
export interface DfcxPageSpec {
  /** Page displayName */
  displayName: string;
  /** このPage で収集する HearingField の key 一覧 (form.parameters になる) */
  formParamKeys?: string[];
  /** Page 入場時の発話 */
  entryFulfillment?: string;
  /** 次 Page への遷移条件 (自然文 / CX condition) */
  transitionCondition?: string;
  /** 次 Page の displayName */
  nextPage?: string;
}

/** ベースラインに追加する Intent の指定 (簡易フォーマット) */
export interface DfcxIntentSpec {
  displayName: string;
  trainingPhrases: string[];
  /** Intent 発火時の遷移先 Page */
  targetPage?: string;
  /** Intent 発火時の発話 */
  fulfillmentMessage?: string;
}

/**
 * 業界テンプレ用の DFCX overlay (Template.dfcxBaseline)。
 * 既存ベースライン (OUTBOUND_SALES_BASELINE / INBOUND_SUPPORT_BASELINE) に
 * extraPages / extraIntents を追加し、reprompt 文言を業界固有に上書きする。
 */
export interface DfcxBaselineOverlay {
  /** ベースラインに追加する Page */
  extraPages?: DfcxPageSpec[];
  /** 業界固有の反論 Intent */
  extraIntents?: DfcxIntentSpec[];
  /** 人間転送専用 Intent */
  transferIntent?: DfcxIntentSpec;
  /** sys.no-match-1/2/3 文言の業界固有上書き */
  repromptOverrides?: Partial<Record<"1" | "2" | "3", string>>;
  /** デフォルトの Flow displayName (省略時 "Default Start Flow") */
  defaultFlowName?: string;
}
