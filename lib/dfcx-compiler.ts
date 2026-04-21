// ============================================================================
// Dialogflow CX Compiler
// ScenarioDraft → DFCX Agent JSON への変換ロジック
//
// DFCX構造のマッピング:
//   Agent          … 1つのプロジェクト = 1 Agent
//   Flow           … 会話のまとまり（START / Main / Escalation / End）
//   Page           … 会話の状態（状態遷移の単位）
//   Intent         … ユーザー発話の意図
//   EntityType     … 抽出したい値の型
//   TransitionRoute… Page間の遷移 (intent条件 / condition条件)
//   Fulfillment    … AIが発話するメッセージ・パラメータ操作
//
// 参考: https://cloud.google.com/dialogflow/cx/docs/concept/agent
// ============================================================================

import type { CallSettings } from "./ai-builder";

// ── DFCX型定義 (簡易・RESTv3に準拠) ─────────────────────────────────────────
export interface DfcxMessage {
  text?: { text: string[] };
  payload?: Record<string, unknown>;
}

export interface DfcxFulfillment {
  messages: DfcxMessage[];
  setParameterActions?: { parameter: string; value: string | number | boolean }[];
  webhook?: string;
  tag?: string;
}

export interface DfcxTransitionRoute {
  name?: string;
  intent?: string;          // intent displayName参照
  condition?: string;       // CEL式 e.g. "$session.params.consent = true"
  triggerFulfillment?: DfcxFulfillment;
  targetPage?: string;      // Page displayName参照
  targetFlow?: string;      // Flow displayName参照
}

export interface DfcxEventHandler {
  event: string;            // "sys.no-input-default" | "sys.no-match-default" | "custom"
  triggerFulfillment?: DfcxFulfillment;
  targetPage?: string;
}

export interface DfcxPage {
  displayName: string;
  entryFulfillment?: DfcxFulfillment;
  form?: {
    parameters: {
      displayName: string;
      required: boolean;
      entityType: string;
      fillBehavior: {
        initialPromptFulfillment: DfcxFulfillment;
        repromptEventHandlers?: DfcxEventHandler[];
      };
    }[];
  };
  transitionRoutes?: DfcxTransitionRoute[];
  eventHandlers?: DfcxEventHandler[];
}

export interface DfcxIntent {
  displayName: string;
  trainingPhrases: { parts: { text: string }[] }[];
  parameters?: { id: string; entityType: string }[];
  description?: string;
}

export interface DfcxEntityType {
  displayName: string;
  kind: "KIND_MAP" | "KIND_LIST" | "KIND_REGEXP";
  entities: { value: string; synonyms: string[] }[];
}

export interface DfcxFlow {
  displayName: string;
  description?: string;
  transitionRoutes?: DfcxTransitionRoute[];
  eventHandlers?: DfcxEventHandler[];
  pages: DfcxPage[];
}

export interface DfcxAgent {
  displayName: string;
  defaultLanguageCode: "ja" | "en";
  timeZone: string;
  description: string;
  speechToTextSettings?: {
    enableSpeechAdaptation: boolean;
  };
  startFlow: DfcxFlow;
  intents: DfcxIntent[];
  entityTypes: DfcxEntityType[];
  flows?: DfcxFlow[];  // 追加Flow (Escalationなど)
}

// ── システム組込Intent (すべてのAgentで共通) ───────────────────────────────
const SYSTEM_INTENTS: DfcxIntent[] = [
  {
    displayName: "Default Welcome Intent",
    description: "会話開始時に自動発火",
    trainingPhrases: [
      { parts: [{ text: "こんにちは" }] },
      { parts: [{ text: "もしもし" }] },
      { parts: [{ text: "はい" }] },
    ],
  },
  {
    displayName: "User_Decline",
    description: "拒否・興味なし",
    trainingPhrases: [
      { parts: [{ text: "いりません" }] },
      { parts: [{ text: "必要ありません" }] },
      { parts: [{ text: "結構です" }] },
      { parts: [{ text: "興味ありません" }] },
      { parts: [{ text: "忙しい" }] },
    ],
  },
  {
    displayName: "User_Accept",
    description: "肯定・続けてほしい",
    trainingPhrases: [
      { parts: [{ text: "はい" }] },
      { parts: [{ text: "お願いします" }] },
      { parts: [{ text: "聞かせてください" }] },
      { parts: [{ text: "詳しく" }] },
    ],
  },
  {
    displayName: "Request Human Agent",
    description: "有人オペレーターを求める",
    trainingPhrases: [
      { parts: [{ text: "人間と話したい" }] },
      { parts: [{ text: "担当者を出してください" }] },
      { parts: [{ text: "オペレーターに代わって" }] },
      { parts: [{ text: "AIじゃなくて" }] },
    ],
  },
];

// ── システム組込EntityType ─────────────────────────────────────────────────
const SYSTEM_ENTITY_TYPES: DfcxEntityType[] = [
  {
    displayName: "consent_reply",
    kind: "KIND_MAP",
    entities: [
      { value: "yes", synonyms: ["はい", "ええ", "うん", "大丈夫", "いいですよ", "聞きます", "OK"] },
      { value: "no",  synonyms: ["いいえ", "いえ", "だめ", "無理", "忙しい", "時間ない"] },
    ],
  },
  {
    displayName: "time_slot",
    kind: "KIND_REGEXP",
    entities: [
      { value: "\\d{1,2}時(\\d{1,2}分)?", synonyms: ["\\d{1,2}時(\\d{1,2}分)?"] },
      { value: "\\d{1,2}:\\d{2}", synonyms: ["\\d{1,2}:\\d{2}"] },
      { value: "(午前|午後)\\d{1,2}時", synonyms: ["(午前|午後)\\d{1,2}時"] },
    ],
  },
];

// ── コンパイラ本体 ──────────────────────────────────────────────────────────
function msg(text: string): DfcxFulfillment {
  return { messages: [{ text: { text: [text] } }] };
}

function faqToIntents(faqs: { q: string; a: string }[]): DfcxIntent[] {
  return faqs.map((faq, i) => ({
    displayName: `FAQ_${i + 1}_${faq.q.slice(0, 12).replace(/[?？、。\s]/g, "")}`,
    description: faq.q,
    trainingPhrases: [
      { parts: [{ text: faq.q }] },
      { parts: [{ text: faq.q.replace(/[?？]/g, "") }] },
    ],
  }));
}

function faqToRoutes(faqs: { q: string; a: string }[]): DfcxTransitionRoute[] {
  return faqs.map((faq, i) => ({
    intent: `FAQ_${i + 1}_${faq.q.slice(0, 12).replace(/[?？、。\s]/g, "")}`,
    triggerFulfillment: msg(faq.a),
  }));
}

/**
 * CallSettings → DFCX Agent への変換
 * Vapi側と入力データ構造を揃えることで、プロバイダスイッチが成立する。
 */
export function buildDfcxAgent(s: CallSettings): DfcxAgent {
  // --- Intent構築 ----------------------------------------------------------
  const scenarioIntents: DfcxIntent[] = s.scenarios.map((r) => ({
    displayName: `Scenario_${r.id}`,
    description: r.trigger,
    trainingPhrases:
      r.triggerKeywords.length > 0
        ? r.triggerKeywords.map((k) => ({ parts: [{ text: k }] }))
        : [{ parts: [{ text: r.trigger }] }],
  }));

  const escalationIntents: DfcxIntent[] = s.escalations.map((e) => ({
    displayName: `Escalate_${e.id}`,
    description: e.condition,
    trainingPhrases:
      e.keywords.length > 0
        ? e.keywords.map((k) => ({ parts: [{ text: k }] }))
        : [{ parts: [{ text: e.condition }] }],
  }));

  const faqIntents = faqToIntents(s.faqs);

  const allIntents: DfcxIntent[] = [
    ...SYSTEM_INTENTS,
    ...scenarioIntents,
    ...faqIntents,
    ...escalationIntents,
  ];

  // --- Pageの組み立て ------------------------------------------------------
  // [Start] → [Opening] → [Qualify] → [Proposal] → [End_Success/End_Fail]
  //                                              ↘ [Human_Transfer]
  const pages: DfcxPage[] = [];

  // Opening: 最初の挨拶とオープニングメッセージ
  pages.push({
    displayName: "Opening",
    entryFulfillment: msg(s.firstMessage),
    transitionRoutes: [
      {
        intent: "User_Accept",
        triggerFulfillment: msg(`ありがとうございます。${s.productName}についてご案内させてください。`),
        targetPage: "Qualify",
      },
      {
        intent: "User_Decline",
        triggerFulfillment: msg("失礼しました。お時間をいただきありがとうございました。"),
        targetPage: "End_Fail",
      },
      ...faqToRoutes(s.faqs),
    ],
    eventHandlers: [
      {
        event: "sys.no-input-default",
        triggerFulfillment: msg("もしもし？聞こえておりますでしょうか？"),
      },
      {
        event: "sys.no-match-default",
        triggerFulfillment: msg("申し訳ございません、もう一度お願いできますでしょうか？"),
      },
    ],
  });

  // Qualify: 興味有無の確認・シナリオ分岐
  pages.push({
    displayName: "Qualify",
    entryFulfillment: msg(`現在、${s.targetCustomer}の方にご案内しております。`),
    transitionRoutes: [
      ...scenarioIntents.map((intent, i) => {
        const scenario = s.scenarios[i];
        const targetPage =
          scenario.action === "propose_appointment"
            ? "Proposal"
            : scenario.action === "end_success"
              ? "End_Success"
              : scenario.action === "end_fail"
                ? "End_Fail"
                : scenario.action === "transfer"
                  ? "Human_Transfer"
                  : "Qualify";
        return {
          intent: intent.displayName,
          triggerFulfillment: msg(scenario.response),
          targetPage,
        };
      }),
      ...escalationIntents.map((intent, i) => ({
        intent: intent.displayName,
        triggerFulfillment: msg(s.escalations[i].message),
        targetPage: s.escalations[i].action === "transfer" ? "Human_Transfer" : "End_Fail",
      })),
      ...faqToRoutes(s.faqs),
      {
        intent: "Request Human Agent",
        triggerFulfillment: msg("承知しました。担当者へおつなぎします。"),
        targetPage: "Human_Transfer",
      },
    ],
  });

  // Proposal: アポ取得提案
  pages.push({
    displayName: "Proposal",
    entryFulfillment: msg("ぜひ一度、担当者からの詳しいご説明をさせていただけますでしょうか？"),
    form: {
      parameters: [
        {
          displayName: "appointment_time",
          required: true,
          entityType: "@time_slot",
          fillBehavior: {
            initialPromptFulfillment: msg("ご都合のよい日時をお聞かせいただけますか？"),
            repromptEventHandlers: [
              {
                event: "sys.no-match-1",
                triggerFulfillment: msg("もう一度お伺いします。何時頃がご都合よろしいでしょうか？"),
              },
              {
                event: "sys.no-input-1",
                triggerFulfillment: msg("聞こえておりますでしょうか？ご希望の時間をお教えください。"),
              },
            ],
          },
        },
      ],
    },
    transitionRoutes: [
      {
        condition: "$page.params.status = \"FINAL\"",
        triggerFulfillment: msg("承知しました。その日時で担当者からお電話させていただきます。本日はありがとうございました。"),
        targetPage: "End_Success",
      },
      {
        intent: "User_Decline",
        triggerFulfillment: msg("承知しました。改めてご連絡させていただきます。"),
        targetPage: "End_Fail",
      },
    ],
  });

  // Human_Transfer: 有人転送
  const transferNumber = s.escalations.find((e) => e.transferNumber)?.transferNumber ?? "0120-000-000";
  pages.push({
    displayName: "Human_Transfer",
    entryFulfillment: {
      messages: [{ text: { text: ["担当者におつなぎします。少々お待ちください。"] } }],
      setParameterActions: [
        { parameter: "transfer_target", value: transferNumber },
        { parameter: "outcome", value: "transferred" },
      ],
      tag: "transfer_to_human",
    },
  });

  // End_Success / End_Fail
  pages.push({
    displayName: "End_Success",
    entryFulfillment: {
      messages: [{ text: { text: ["ありがとうございました。失礼いたします。"] } }],
      setParameterActions: [{ parameter: "outcome", value: "success" }],
    },
  });

  pages.push({
    displayName: "End_Fail",
    entryFulfillment: {
      messages: [{ text: { text: ["お時間をいただきありがとうございました。失礼いたします。"] } }],
      setParameterActions: [{ parameter: "outcome", value: "fail" }],
    },
  });

  // --- Flow本体 -----------------------------------------------------------
  const startFlow: DfcxFlow = {
    displayName: "Default Start Flow",
    description: `${s.productName} 向け会話フロー`,
    transitionRoutes: [
      {
        intent: "Default Welcome Intent",
        triggerFulfillment: msg(s.firstMessage),
        targetPage: "Opening",
      },
    ],
    eventHandlers: [
      {
        event: "sys.no-input-default",
        triggerFulfillment: msg("もしもし？"),
      },
    ],
    pages,
  };

  // --- Agent全体 ----------------------------------------------------------
  return {
    displayName: `${s.companyName}_${s.productName}`,
    defaultLanguageCode: "ja",
    timeZone: "Asia/Tokyo",
    description: `${s.companyName}の${s.productName}向け音声AIエージェント（${s.persona.agentName}）`,
    speechToTextSettings: { enableSpeechAdaptation: true },
    startFlow,
    intents: allIntents,
    entityTypes: SYSTEM_ENTITY_TYPES,
  };
}

/** DFCX Agent → JSON文字列（インポート用） */
export function dfcxAgentToJson(agent: DfcxAgent): string {
  return JSON.stringify(agent, null, 2);
}

/** 集計: Agentから統計情報を抽出 */
export function summarizeDfcxAgent(agent: DfcxAgent) {
  return {
    intents: agent.intents.length,
    entityTypes: agent.entityTypes.length,
    pages: agent.startFlow.pages.length,
    routes: agent.startFlow.pages.reduce(
      (acc, p) => acc + (p.transitionRoutes?.length ?? 0),
      agent.startFlow.transitionRoutes?.length ?? 0,
    ),
    parameters: agent.startFlow.pages.reduce(
      (acc, p) => acc + (p.form?.parameters.length ?? 0),
      0,
    ),
  };
}
