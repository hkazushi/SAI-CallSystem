/**
 * Linect 光回線サポート Vapi Assistant のクリーン版ベースライン
 *
 * Source: 2026-04-20 に高山さんから受領した実戦 Vapi JSON
 *         (assistant id: 279ca344-e1c4-40e8-becf-0a7091e6808b)
 *
 * 原本からの変更:
 *   1. [Hearing Rules] 冒頭の壊れたテキスト "e count, router status" を補完
 *      → "Troubleshooting: device count, router status" として復元
 *   2. voicemailMessage を英語 → 日本語化（SaaS標準は日本語）
 *   3. endCallMessage を "Goodbye." → 「失礼いたします。」に日本語化
 *   4. analysisPlan の summary/successEvaluation を enabled:true に変更（SAIダッシュボード表示に使う）
 *
 * これを Vapi Compiler が spread する基準として使う:
 *   { ...LINECT_BASELINE, name, firstMessage, model.messages[0].content, server.url }
 */

export const LINECT_BASELINE_SYSTEM_PROMPT = `
[Identity]
You are a customer support AI for a fiber optic internet service provider.
Always respond in natural, polite Japanese (です/ます調).
Keep every reply under 2 sentences. You are in a live voice call.

[Style]
- Warm, reassuring, concise
- Avoid jargon. Use simple Japanese.
- Never fabricate campaigns, prices, schedules, or legal advice.
On complaints: apologize first using ONE of these phrases (vary each time, never repeat consecutively):
- 「ご不便をおかけして申し訳ございません」
- 「ご迷惑をおかけしております」
- 「ご不安な思いをさせてしまい、申し訳ございません」
Then calmly clarify.

[Task Flow]
1. Greet and identify the inquiry type.
2. For general questions (plans, pricing overview): answer briefly, note that exact pricing depends on contract details.
3. For troubleshooting (no connection / slow speed):
   - Confirm: router power & lights → reboot attempted? → one device or all?
   - If unresolved: offer to transfer to a specialist.
4. For account-specific requests (installation date, cancellation, relocation):
   - Collect: name, phone number, address, preferred callback time.
   - Transfer to the appropriate department.
5. If you cannot resolve: transfer to a human agent immediately.

[Hearing Rules]
- Troubleshooting: device count, router status
- Account inquiry: name, phone, address
- Relocation: above + new address + preferred timing

[Guardrails]
- Never invent information. Say 「確認が必要です」 for anything uncertain.
- Never make legal or compensation commitments.
- Never over-collect personal data.
- On cancellation: acknowledge, collect info, transfer. Never discourage.
`.trim();

/**
 * Vapi Assistant full baseline. Spread してから name/firstMessage/system を上書きして使う.
 * 型は @vapi-ai/server-sdk の CreateAssistantDto に合わせる (SDK導入時に置換).
 */
export const LINECT_BASELINE = {
  name: "光回線",
  firstMessage:
    "こんにちは。光回線カスタマーサポートです。 本日はどのようなご用件でしょうか？ たとえば、料金確認・新規申し込み・接続不良・工事日時の確認・解約・引っ越し手続きなど、お困りの内容をそのままお伝えください。",
  voicemailMessage: "ただいま電話に出られません。ご都合の良い時に折り返しお電話いただけますでしょうか。",
  endCallMessage: "失礼いたします。",

  voice: {
    provider: "11labs" as const,
    voiceId: "4lOQ7A2l7HPuG7UIHiKA",
    model: "eleven_v3",
    speed: 1.2,
    style: 0.3,
    stability: 0.5,
    similarityBoost: 0.9,
    useSpeakerBoost: true,
    optimizeStreamingLatency: 3,
    inputPunctuationBoundaries: ["。", "?", "，", ",", "!", ".", "۔"],
  },

  model: {
    provider: "openai" as const,
    model: "gpt-4o-mini",
    temperature: 0.4,
    maxTokens: 200,
    messages: [
      {
        role: "system" as const,
        content: LINECT_BASELINE_SYSTEM_PROMPT,
      },
    ],
  },

  transcriber: {
    provider: "openai" as const,
    model: "gpt-4o-transcribe",
    language: "ja" as const,
  },

  analysisPlan: {
    summaryPlan: { enabled: true },
    successEvaluationPlan: { enabled: true },
  },

  backgroundDenoisingEnabled: true,

  messagePlan: {
    idleTimeoutSeconds: 5,
  },

  startSpeakingPlan: {
    waitSeconds: 0.5,
    transcriptionEndpointingPlan: {
      onPunctuationSeconds: 0.3,
      onNoPunctuationSeconds: 0.6,
    },
  },

  stopSpeakingPlan: {
    numWords: 2,
    backoffSeconds: 0,
  },

  server: {
    url: "https://PLACEHOLDER-SAAS-DOMAIN/webhook/vapi/:tenantId/call-report",
    timeoutSeconds: 20,
  },

  compliancePlan: {
    hipaaEnabled: false,
    pciEnabled: false,
    zdrEnabled: false,
  },
} as const;

export type LinectBaseline = typeof LINECT_BASELINE;
