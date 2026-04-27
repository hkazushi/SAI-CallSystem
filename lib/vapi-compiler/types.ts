/**
 * Vapi Compiler の型定義
 *
 * Chappie (壁打ち会話) が抽出した構造化結果 → Vapi Assistant 設定 に変換するための型。
 *
 * フロー:
 *   Chappie 会話
 *     → ChappieOutput (業種・ペルソナ・タスク・ヒアリング項目)
 *       → compileVapiAssistant()
 *         → VapiAssistantConfig (Vapi SDK に投げる形)
 */

/**
 * Chappie が壁打ち会話から抽出する構造化出力。
 * 6ステージの壁打ちフロー (Discovery→Identity→TaskFlow→Hearing→Style→Review) で埋まる。
 */
export interface ChappieOutput {
  /** 業種 (例: 光回線サポート, 不動産仲介) */
  industry: string;

  /** AI の名前 (例: 光回線サポート) */
  assistantName: string;

  /** 最初の発話 */
  firstMessage: string;

  /** AI のペルソナ / スタイル */
  persona: {
    /** 話し方の説明 (例: 丁寧・安心感) */
    tone: string;
    /** 言語 */
    language: "ja" | "en";
    /** 禁止事項 */
    doNots: string[];
  };

  /** どんな用件を捌くか。タスクフローの本体 */
  tasks: TaskFlow[];

  /** AI が相手から聞き出すべき項目 */
  hearingFields: HearingField[];

  /** エスカレーション / ガードレール */
  guardrails: {
    /** 人間転送する条件 */
    transferConditions: string[];
    /** 言ってはいけないこと */
    prohibitedBehaviors: string[];
    /** DFCX 用: エスカレーション専用 Intent の displayName (任意) */
    escalationIntent?: string;
  };
}

/**
 * タスクフロー1件。複数のタスク (例: 接続不良対応 / 解約受付) をまとめて配列で持つ。
 *
 * DFCX 用 optional 拡張:
 *   - intentTrainingPhrases: trigger 発話のバリエーション (Intent.trainingPhrases に展開)
 *   - pageId: コンパイル時に自動採番 (上書き不可、デプロイ時のIDマッピング用)
 */
export interface TaskFlow {
  /** タスク名 (例: 接続不良トラブルシューティング) */
  name: string;
  /** いつこのフローに入るか (条件) */
  trigger: string;
  /** ステップ (自然文の手順) */
  steps: string[];
  /** DFCX 用: trigger 発話のバリエーション (Intent.trainingPhrases に展開) */
  intentTrainingPhrases?: string[];
  /** DFCX 用: 関連 Page displayName (compile 時に自動設定) */
  pageId?: string;
}

/**
 * ヒアリング項目。Vapi の Structured Output (JSON Schema) 生成にも使う。
 *
 * DFCX 用 optional 拡張:
 *   - dfcxEntityType: スロット埋めで使う @sys.* エンティティ型
 *   - repromptStrategy: no-match 時の文言トーン
 *   - maxReprompts: リプロンプトの最大回数 (default 3)
 */
export type DfcxEntityTypeRef =
  | "@sys.person"
  | "@sys.phone-number"
  | "@sys.address"
  | "@sys.date-time"
  | "@sys.number"
  | "@sys.email"
  | "@sys.any";

export type RepromptStrategy = "gentle" | "assertive" | "offer_transfer";

export interface HearingField {
  /** プロパティ名 (snake_case) */
  key: string;
  /** 人向け表示名 */
  label: string;
  /** 型 */
  type: "string" | "number" | "boolean" | "enum";
  /** 必須か */
  required: boolean;
  /** enum 用の選択肢 */
  options?: string[];
  /** Chappie が収集意図を説明する文 */
  description?: string;
  /** DFCX 用: スロット埋めで使うエンティティ型 (省略時は label/key から推定) */
  dfcxEntityType?: DfcxEntityTypeRef;
  /** DFCX 用: no-match 時の文言トーン */
  repromptStrategy?: RepromptStrategy;
  /** DFCX 用: リプロンプト最大回数 (default 3) */
  maxReprompts?: number;
}

/**
 * Vapi Assistant 設定。
 *
 * 型は @vapi-ai/server-sdk の CreateAssistantDto と構造互換。
 * baseline (LINECT_BASELINE) を spread した結果を安全に扱えるよう、
 * 各値は literal ではなく広い型で定義している。
 */
export interface VapiAssistantConfig {
  name: string;
  firstMessage: string;
  voicemailMessage: string;
  endCallMessage: string;

  voice: {
    provider: string;
    voiceId: string;
    model: string;
    speed: number;
    style: number;
    stability: number;
    similarityBoost: number;
    useSpeakerBoost: boolean;
    optimizeStreamingLatency: number;
    inputPunctuationBoundaries: readonly string[];
  };

  model: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
    messages: Array<{ role: "system"; content: string }>;
  };

  transcriber: {
    provider: string;
    model: string;
    language: string;
  };

  analysisPlan: {
    summaryPlan: { enabled: boolean };
    successEvaluationPlan: { enabled: boolean };
    structuredDataPlan?: { enabled: boolean; schema: unknown };
  };

  backgroundDenoisingEnabled: boolean;

  messagePlan: {
    idleTimeoutSeconds: number;
  };

  startSpeakingPlan: {
    waitSeconds: number;
    transcriptionEndpointingPlan: {
      onPunctuationSeconds: number;
      onNoPunctuationSeconds: number;
    };
  };

  stopSpeakingPlan: {
    numWords: number;
    backoffSeconds: number;
  };

  server: {
    url: string;
    timeoutSeconds: number;
  };

  compliancePlan: {
    hipaaEnabled: boolean;
    pciEnabled: boolean;
    zdrEnabled: boolean;
  };
}

/**
 * compileVapiAssistant() のオプション。
 */
export interface CompileOptions {
  /** tenantId (Webhook URL に埋める) */
  tenantId: string;
  /** Webhook ベース URL (本番 SaaS ドメイン) */
  webhookBaseUrl?: string;
}
