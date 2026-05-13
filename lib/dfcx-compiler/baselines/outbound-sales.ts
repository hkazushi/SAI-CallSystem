/**
 * 営業アウトバウンド共通ベースライン (DFCX)
 *
 * 業種関係なく営業電話アウトバウンドで共通する以下を含む:
 *   - 7 Page 構成 (greeting / qualifying / hearing / objection / appointment / closing / transfer)
 *   - 顧客情報収集スロット (name / phone / address / appointment_time)
 *   - sys.no-match-1/2/3, sys.no-input-1/2/3 のリプロンプト文言
 *   - 共通 Intent (転送要求 / 即切断回避)
 *
 * 各業種テンプレ (Template.dfcxBaseline) で extraPages / extraIntents / repromptOverrides を
 * 上乗せして業界固有の対応を追加する。
 *
 * ChappieOutput がコンパイル時に上書きする部分:
 *   - greeting Page entryFulfillment ← output.firstMessage
 *   - hearing Page form.parameters ← output.hearingFields
 *   - objection_handling Page transitionRoutes ← output.tasks 由来の Intent
 */
import type { DfcxAgentConfig } from "../types";

const TIMEZONE = "Asia/Tokyo";
const LANG = "ja";

/** sys.no-match / sys.no-input のデフォルト文言 (gentle トーン) */
const DEFAULT_REPROMPT_1 = "申し訳ございません、もう一度お伺いしてもよろしいでしょうか？";
const DEFAULT_REPROMPT_2 = "恐れ入ります、お電話が少し遠いようです。もう一度お聞かせいただけますか？";
const DEFAULT_REPROMPT_3 =
  "何度もすみません。担当のオペレーターにおつなぎしますので、少々お待ちください。";

const DEFAULT_NO_INPUT_1 = "もしもし、聞こえておりますでしょうか？";
const DEFAULT_NO_INPUT_2 = "お声が聞こえないようですが、もう一度お話しいただけますか？";
const DEFAULT_NO_INPUT_3 =
  "電波の状況が悪いようです。後ほどおかけ直しさせていただきますので、失礼いたします。";

/** ヘルパー: text fulfillment を生成 */
const txt = (s: string) => ({ messages: [{ text: { text: [s] } }] });

/** ヘルパー: 標準リプロンプトハンドラ生成 */
const standardReprompts = (overrides?: Partial<Record<"1" | "2" | "3", string>>) => [
  { event: "sys.no-match-1", triggerFulfillment: txt(overrides?.["1"] ?? DEFAULT_REPROMPT_1) },
  { event: "sys.no-match-2", triggerFulfillment: txt(overrides?.["2"] ?? DEFAULT_REPROMPT_2) },
  { event: "sys.no-match-3", triggerFulfillment: txt(overrides?.["3"] ?? DEFAULT_REPROMPT_3), targetPage: "transfer" },
  { event: "sys.no-input-1", triggerFulfillment: txt(DEFAULT_NO_INPUT_1) },
  { event: "sys.no-input-2", triggerFulfillment: txt(DEFAULT_NO_INPUT_2) },
  { event: "sys.no-input-3", triggerFulfillment: txt(DEFAULT_NO_INPUT_3), targetPage: "End Session" },
];

/**
 * OUTBOUND_SALES_BASELINE
 *
 * 中身は ChappieOutput / Template overlay で上書きされる前提なので
 * displayName と最低限の構造だけを定義する。
 */
export const OUTBOUND_SALES_BASELINE: DfcxAgentConfig = {
  agent: {
    displayName: "outbound-sales-baseline",
    defaultLanguageCode: LANG,
    timeZone: TIMEZONE,
    description: "営業アウトバウンド共通ベースライン (compileDfcxAgent で上書き予定)",
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
    description: "営業アウトバウンドのメインフロー",
    nluSettings: {
      modelType: "MODEL_TYPE_ADVANCED",
      classificationThreshold: 0.3,
    },
    // セッション開始時に Default Welcome Intent が発火 → greeting Page へ遷移する
    // greeting Page の entryFulfillment が firstMessage を発話する
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
        "お世話になっております。株式会社○○の○○と申します。30秒ほどお時間よろしいでしょうか？",
      ),
      transitionRoutes: [
        { intent: "intent.consent", targetPage: "qualifying" },
        { intent: "intent.refuse", targetPage: "objection_handling" },
        { intent: "intent.busy", targetPage: "closing" },
      ],
      eventHandlers: standardReprompts(),
    },

    /* ---------- 2. qualifying ---------- */
    {
      displayName: "qualifying",
      entryFulfillment: txt(
        "ありがとうございます。今お電話に出られているのはご契約者ご本人様でいらっしゃいますか？",
      ),
      transitionRoutes: [
        { intent: "intent.affirmative", targetPage: "hearing" },
        { intent: "intent.negative", targetPage: "transfer" },
      ],
      eventHandlers: standardReprompts(),
    },

    /* ---------- 3. hearing (slot filling のメイン) ---------- */
    {
      displayName: "hearing",
      entryFulfillment: txt("では、いくつか確認させてください。"),
      form: {
        parameters: [
          {
            displayName: "customer_name",
            entityType: "@sys.person",
            required: true,
            fillBehavior: {
              initialPromptFulfillment: txt("お名前をフルネームでお願いします。"),
              repromptEventHandlers: [
                { event: "sys.no-match-1", triggerFulfillment: txt("お名前が聞き取れませんでした。もう一度お願いします。") },
                { event: "sys.no-match-2", triggerFulfillment: txt("恐れ入ります、ゆっくりお名前をお願いできますか？") },
                { event: "sys.no-match-3", triggerFulfillment: txt("お名前のヒアリングが難しいようです。担当者におつなぎいたします。"), targetPage: "transfer" },
              ],
            },
          },
          {
            displayName: "phone_number",
            entityType: "@sys.phone-number",
            required: false,
            fillBehavior: {
              initialPromptFulfillment: txt("ご連絡用のお電話番号を教えてください。"),
              repromptEventHandlers: [
                { event: "sys.no-match-1", triggerFulfillment: txt("お電話番号をハイフン込みでお願いします。") },
                { event: "sys.no-match-2", triggerFulfillment: txt("数字を一つずつゆっくりお願いします。") },
                { event: "sys.no-match-3", triggerFulfillment: txt("こちらは後ほど確認させていただきます。") },
              ],
            },
          },
        ],
      },
      transitionRoutes: [
        { condition: "$page.params.status = \"FINAL\"", targetPage: "appointment" },
      ],
      eventHandlers: standardReprompts(),
    },

    /* ---------- 4. objection_handling ---------- */
    {
      displayName: "objection_handling",
      entryFulfillment: txt(
        "そうですよね、ご事情承知いたしました。少しだけお話しさせていただいてもよろしいですか？",
      ),
      transitionRoutes: [
        { intent: "intent.consent", targetPage: "hearing" },
        { intent: "intent.refuse", targetPage: "closing" },
      ],
      eventHandlers: standardReprompts(),
    },

    /* ---------- 5. appointment ---------- */
    {
      displayName: "appointment",
      entryFulfillment: txt(
        "ありがとうございます。詳細のご案内のため、改めてお時間をいただきたいのですが、ご都合のよろしい日時はいつ頃でしょうか？",
      ),
      form: {
        parameters: [
          {
            displayName: "appointment_time",
            entityType: "@sys.date-time",
            required: true,
            fillBehavior: {
              initialPromptFulfillment: txt("ご希望の日時をお願いします。例えば来週の火曜日午後など。"),
              repromptEventHandlers: [
                { event: "sys.no-match-1", triggerFulfillment: txt("お日にちと時間帯を教えてください。") },
                { event: "sys.no-match-2", triggerFulfillment: txt("候補日が決まっていなければ、平日と週末どちらが良いか教えてください。") },
                { event: "sys.no-match-3", triggerFulfillment: txt("後ほど別途ご連絡させていただきます。"), targetPage: "closing" },
              ],
            },
          },
        ],
      },
      transitionRoutes: [
        // お客様が断った・いらないと言った場合は丁寧に終話へ
        { intent: "intent.refuse",      triggerFulfillment: txt("承知いたしました。ご検討ありがとうございました。またご興味が出ましたら、ぜひお声がけください。"), targetPage: "closing" },
        { intent: "intent.negative",    triggerFulfillment: txt("承知いたしました。またの機会にぜひご検討ください。"), targetPage: "closing" },
        { intent: "intent.busy",        triggerFulfillment: txt("失礼いたしました。後ほど改めてご連絡させていただきます。"), targetPage: "closing" },
        { condition: "$page.params.status = \"FINAL\"", targetPage: "closing" },
      ],
      eventHandlers: standardReprompts(),
    },

    /* ---------- 6. closing ---------- */
    {
      displayName: "closing",
      entryFulfillment: txt(
        "本日はお時間いただきありがとうございました。それでは失礼いたします。",
      ),
      transitionRoutes: [
        { condition: "true", targetPage: "End Session" },
      ],
    },

    /* ---------- 7. transfer (人間転送) ---------- */
    {
      displayName: "transfer",
      entryFulfillment: txt(
        "担当者におつなぎいたしますので、少々お待ちくださいませ。",
      ),
      transitionRoutes: [
        { condition: "true", targetPage: "End Session" },
      ],
    },
  ],

  intents: [
    {
      displayName: "intent.consent",
      description: "肯定・同意 (はい・大丈夫・お願いします)",
      trainingPhrases: [
        { parts: [{ text: "はい" }] },
        { parts: [{ text: "大丈夫です" }] },
        { parts: [{ text: "お願いします" }] },
        { parts: [{ text: "聞きます" }] },
        { parts: [{ text: "どうぞ" }] },
      ],
    },
    {
      displayName: "intent.refuse",
      description: "拒否・断り意図 (申し込まない・いらない・不要)",
      trainingPhrases: [
        { parts: [{ text: "結構です" }] },
        { parts: [{ text: "いりません" }] },
        { parts: [{ text: "いらないです" }] },
        { parts: [{ text: "いらない" }] },
        { parts: [{ text: "必要ないです" }] },
        { parts: [{ text: "必要ありません" }] },
        { parts: [{ text: "無料お試しいらないです" }] },
        { parts: [{ text: "申し込まないです" }] },
        { parts: [{ text: "申し込みません" }] },
        { parts: [{ text: "やめておきます" }] },
        { parts: [{ text: "やめます" }] },
        { parts: [{ text: "検討しません" }] },
        { parts: [{ text: "興味ないです" }] },
        { parts: [{ text: "間に合っています" }] },
        { parts: [{ text: "営業はお断りしています" }] },
        { parts: [{ text: "結構ですありがとう" }] },
        { parts: [{ text: "大丈夫です要りません" }] },
      ],
    },
    {
      displayName: "intent.busy",
      description: "今は忙しい・後でかけ直してほしい",
      trainingPhrases: [
        { parts: [{ text: "今忙しいです" }] },
        { parts: [{ text: "後にしてください" }] },
        { parts: [{ text: "今はちょっと" }] },
        { parts: [{ text: "また今度" }] },
      ],
    },
    {
      displayName: "intent.affirmative",
      description: "Yes に相当する肯定 (本人確認等)",
      trainingPhrases: [
        { parts: [{ text: "はい" }] },
        { parts: [{ text: "はい、そうです" }] },
        { parts: [{ text: "はいそうです" }] },
        { parts: [{ text: "そうです" }] },
        { parts: [{ text: "ええ" }] },
        { parts: [{ text: "ええそうです" }] },
        { parts: [{ text: "本人です" }] },
        { parts: [{ text: "本人でございます" }] },
        { parts: [{ text: "そうですけど" }] },
        { parts: [{ text: "私です" }] },
        { parts: [{ text: "そうですよ" }] },
      ],
    },
    {
      displayName: "intent.negative",
      description: "No に相当する否定 (本人確認等)",
      trainingPhrases: [
        { parts: [{ text: "いいえ" }] },
        { parts: [{ text: "違います" }] },
        { parts: [{ text: "本人ではないです" }] },
        { parts: [{ text: "代わりますね" }] },
        { parts: [{ text: "いや" }] },
        { parts: [{ text: "違う" }] },
        { parts: [{ text: "私じゃない" }] },
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
  ],

  /** webhookUrl は compile 時に tenantId を埋めて差し替える */
  webhookUrl: "https://PLACEHOLDER-SAAS-DOMAIN/webhook/dfcx/PLACEHOLDER/fulfillment",
};
