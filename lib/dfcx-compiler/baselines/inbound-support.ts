/**
 * カスタマーサポート / インバウンド共通ベースライン (DFCX)
 *
 * 業種関係なくインバウンド (問い合わせ受付・サポート) で共通する以下を含む:
 *   - 6 Page 構成 (greeting / intake / hearing / resolution / escalation / closing)
 *   - 顧客情報収集スロット (name / contract_id / phone)
 *   - sys.no-match-1/2/3, sys.no-input-1/2/3 のリプロンプト文言
 *
 * 各業種テンプレ (Template.dfcxBaseline) で extraPages / extraIntents / repromptOverrides を
 * 上乗せして業界固有の対応を追加する。
 */
import type { DfcxAgentConfig } from "../types";

const TIMEZONE = "Asia/Tokyo";
const LANG = "ja";

const DEFAULT_REPROMPT_1 = "申し訳ございません、もう一度お伺いしてもよろしいでしょうか？";
const DEFAULT_REPROMPT_2 = "恐れ入ります、お電話が少し遠いようです。もう一度お聞かせいただけますか？";
const DEFAULT_REPROMPT_3 =
  "何度もすみません。担当のオペレーターにおつなぎしますので、少々お待ちください。";

const DEFAULT_NO_INPUT_1 = "もしもし、聞こえておりますでしょうか？";
const DEFAULT_NO_INPUT_2 = "お声が聞こえないようですが、もう一度お話しいただけますか？";
const DEFAULT_NO_INPUT_3 =
  "電波の状況が悪いようです。後ほどおかけ直しさせていただきますので、失礼いたします。";

const txt = (s: string) => ({ messages: [{ text: { text: [s] } }] });

const standardReprompts = (overrides?: Partial<Record<"1" | "2" | "3", string>>) => [
  { event: "sys.no-match-1", triggerFulfillment: txt(overrides?.["1"] ?? DEFAULT_REPROMPT_1) },
  { event: "sys.no-match-2", triggerFulfillment: txt(overrides?.["2"] ?? DEFAULT_REPROMPT_2) },
  { event: "sys.no-match-3", triggerFulfillment: txt(overrides?.["3"] ?? DEFAULT_REPROMPT_3), targetPage: "escalation" },
  { event: "sys.no-input-1", triggerFulfillment: txt(DEFAULT_NO_INPUT_1) },
  { event: "sys.no-input-2", triggerFulfillment: txt(DEFAULT_NO_INPUT_2) },
  { event: "sys.no-input-3", triggerFulfillment: txt(DEFAULT_NO_INPUT_3), targetPage: "End Session" },
];

export const INBOUND_SUPPORT_BASELINE: DfcxAgentConfig = {
  agent: {
    displayName: "inbound-support-baseline",
    defaultLanguageCode: LANG,
    timeZone: TIMEZONE,
    description: "インバウンドサポート共通ベースライン (compileDfcxAgent で上書き予定)",
    speechToTextSettings: { enableSpeechAdaptation: true },
    advancedSettings: {
      loggingSettings: {
        enableStackdriverLogging: true,
        enableInteractionLogging: true,
      },
    },
  },

  flow: {
    displayName: "Default Start Flow",
    description: "インバウンドサポートのメインフロー",
    nluSettings: {
      modelType: "MODEL_TYPE_ADVANCED",
      classificationThreshold: 0.3,
    },
    // セッション開始時に Default Welcome Intent が発火 → greeting Page へ遷移する
    transitionRoutes: [
      {
        intent: "Default Welcome Intent",
        targetPage: "greeting",
      },
    ],
  },

  pages: [
    /* ---------- 1. greeting ---------- */
    {
      displayName: "greeting",
      entryFulfillment: txt(
        "お電話ありがとうございます、サポート窓口です。本日のご用件をお聞かせください。",
      ),
      transitionRoutes: [
        { intent: "intent.inquiry", targetPage: "intake" },
        { intent: "intent.complaint", targetPage: "escalation" },
        { intent: "intent.transfer_request", targetPage: "escalation" },
      ],
      eventHandlers: standardReprompts(),
    },

    /* ---------- 2. intake (用件分類) ---------- */
    {
      displayName: "intake",
      entryFulfillment: txt(
        "承知しました。詳細を伺いたいので、少々お話を整理させてください。",
      ),
      transitionRoutes: [
        { condition: "true", targetPage: "hearing" },
      ],
      eventHandlers: standardReprompts(),
    },

    /* ---------- 3. hearing (情報収集) ---------- */
    {
      displayName: "hearing",
      entryFulfillment: txt(
        "ご本人確認のため、いくつか教えてください。",
      ),
      form: {
        parameters: [
          {
            displayName: "customer_name",
            entityType: "@sys.person",
            required: true,
            fillBehavior: {
              initialPromptFulfillment: txt("ご契約者様のお名前をフルネームでお願いします。"),
              repromptEventHandlers: [
                { event: "sys.no-match-1", triggerFulfillment: txt("お名前が聞き取れませんでした。もう一度お願いします。") },
                { event: "sys.no-match-2", triggerFulfillment: txt("恐れ入ります、ゆっくりお名前をお願いできますか？") },
                { event: "sys.no-match-3", triggerFulfillment: txt("担当者におつなぎいたします。"), targetPage: "escalation" },
              ],
            },
          },
          {
            displayName: "contract_id",
            entityType: "@sys.any",
            required: false,
            fillBehavior: {
              initialPromptFulfillment: txt("ご契約番号またはお客様番号をお願いします。"),
              repromptEventHandlers: [
                { event: "sys.no-match-1", triggerFulfillment: txt("ご契約番号は書類かマイページに記載があります。") },
                { event: "sys.no-match-2", triggerFulfillment: txt("もし不明であれば、お電話番号でも構いません。") },
                { event: "sys.no-match-3", triggerFulfillment: txt("確認は後ほどでも結構です。") },
              ],
            },
          },
        ],
      },
      transitionRoutes: [
        { condition: "$page.params.status = \"FINAL\"", targetPage: "resolution" },
      ],
      eventHandlers: standardReprompts(),
    },

    /* ---------- 4. resolution (回答・案内) ---------- */
    {
      displayName: "resolution",
      entryFulfillment: txt(
        "ご確認ありがとうございます。お問い合わせ内容について、ご案内させていただきます。",
      ),
      transitionRoutes: [
        { intent: "intent.satisfied", targetPage: "closing" },
        { intent: "intent.complaint", targetPage: "escalation" },
        { intent: "intent.transfer_request", targetPage: "escalation" },
      ],
      eventHandlers: standardReprompts(),
    },

    /* ---------- 5. escalation (人間転送) ---------- */
    {
      displayName: "escalation",
      entryFulfillment: txt(
        "担当者におつなぎいたしますので、少々お待ちくださいませ。",
      ),
      transitionRoutes: [
        { condition: "true", targetPage: "End Session" },
      ],
    },

    /* ---------- 5b. transfer (escalation のエイリアス) ----------
     * build-form-parameters / render-instructions が targetPage: "transfer" を参照するため、
     * inbound にも同名 page を用意して escalation へ流す。
     */
    {
      displayName: "transfer",
      transitionRoutes: [
        { condition: "true", targetPage: "escalation" },
      ],
    },

    /* ---------- 6. closing ---------- */
    {
      displayName: "closing",
      entryFulfillment: txt(
        "他にご質問はございますか？",
      ),
      transitionRoutes: [
        { intent: "intent.affirmative", targetPage: "hearing" },
        { intent: "intent.negative", targetPage: "End Session" },
      ],
      eventHandlers: standardReprompts(),
    },
  ],

  intents: [
    {
      displayName: "intent.inquiry",
      description: "問い合わせ・質問",
      trainingPhrases: [
        { parts: [{ text: "教えてください" }] },
        { parts: [{ text: "聞きたいことがあります" }] },
        { parts: [{ text: "確認したいんですが" }] },
        { parts: [{ text: "質問があります" }] },
      ],
    },
    {
      displayName: "intent.complaint",
      description: "クレーム・不満",
      trainingPhrases: [
        { parts: [{ text: "おかしいです" }] },
        { parts: [{ text: "困っています" }] },
        { parts: [{ text: "なんとかしてください" }] },
        { parts: [{ text: "クレームです" }] },
      ],
    },
    {
      displayName: "intent.transfer_request",
      description: "人間担当者を要求",
      trainingPhrases: [
        { parts: [{ text: "人と話したい" }] },
        { parts: [{ text: "担当者出してください" }] },
        { parts: [{ text: "オペレーターをお願いします" }] },
        { parts: [{ text: "AIじゃない人で" }] },
      ],
    },
    {
      displayName: "intent.satisfied",
      description: "ご案内に納得",
      trainingPhrases: [
        { parts: [{ text: "わかりました" }] },
        { parts: [{ text: "ありがとうございます" }] },
        { parts: [{ text: "理解しました" }] },
      ],
    },
    {
      displayName: "intent.affirmative",
      description: "Yes",
      trainingPhrases: [
        { parts: [{ text: "はい" }] },
        { parts: [{ text: "あります" }] },
        { parts: [{ text: "他にも" }] },
      ],
    },
    {
      displayName: "intent.negative",
      description: "No",
      trainingPhrases: [
        { parts: [{ text: "いいえ" }] },
        { parts: [{ text: "ないです" }] },
        { parts: [{ text: "大丈夫です" }] },
      ],
    },
  ],

  webhookUrl: "https://PLACEHOLDER-SAAS-DOMAIN/webhook/dfcx/PLACEHOLDER/fulfillment",
};
