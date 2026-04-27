/**
 * HearingField[] (Chappie 出力) → DfcxParameter[] (DFCX form parameters) への変換。
 *
 * 主な仕事:
 *   1. label / key からエンティティ型を自動推定 (例: 「お名前」→ @sys.person)
 *   2. required の reprompt は標準3段、optional は緩めの reprompt 1段
 *   3. repromptStrategy に応じて文言トーンを変える
 */
import type { HearingField, DfcxEntityTypeRef, RepromptStrategy } from "../vapi-compiler/types";
import type { DfcxParameter, DfcxFulfillment } from "./types";

const txt = (s: string): DfcxFulfillment => ({ messages: [{ text: { text: [s] } }] });

/** key/label からエンティティ型を推定するヒューリスティック */
const ENTITY_TYPE_PATTERNS: Array<{ test: RegExp; type: DfcxEntityTypeRef }> = [
  { test: /(name|名前|氏名|お名前)/i, type: "@sys.person" },
  { test: /(phone|電話|連絡先|tel)/i, type: "@sys.phone-number" },
  { test: /(address|住所|所在地)/i, type: "@sys.address" },
  { test: /(date|時間|日時|時刻|日程|appointment)/i, type: "@sys.date-time" },
  { test: /(email|メール|mail)/i, type: "@sys.email" },
  { test: /(cost|料金|金額|月額|amount|円)/i, type: "@sys.number" },
  { test: /(age|年齢|count|number|数)/i, type: "@sys.number" },
];

export function inferEntityType(field: HearingField): DfcxEntityTypeRef {
  // 明示指定があればそれを使う
  if (field.dfcxEntityType) return field.dfcxEntityType;
  // type=number は @sys.number 確定
  if (field.type === "number") return "@sys.number";
  // パターンマッチで推定
  for (const { test, type } of ENTITY_TYPE_PATTERNS) {
    if (test.test(field.key) || test.test(field.label)) return type;
  }
  // フォールバック (enum でも自由入力の string でも @sys.any でカバー)
  return "@sys.any";
}

/** repromptStrategy に応じた文言生成 */
function repromptText(field: HearingField, attempt: 1 | 2 | 3, strategy: RepromptStrategy): string {
  const label = field.label;
  if (strategy === "assertive") {
    if (attempt === 1) return `恐れ入ります、${label}を再度お願いいたします。`;
    if (attempt === 2) return `${label}が必要となりますので、もう一度お願いします。`;
    return `${label}のヒアリングが難しいようです。担当者におつなぎいたします。`;
  }
  if (strategy === "offer_transfer") {
    if (attempt === 1) return `${label}が聞き取れませんでした。もう一度お願いできますか？`;
    if (attempt === 2) return `お電話が遠いようです。${label}を担当者から確認いたしましょうか？`;
    return `担当者におつなぎいたしますので、少々お待ちください。`;
  }
  // gentle (default)
  if (attempt === 1) return `${label}が聞き取れませんでした。もう一度お願いします。`;
  if (attempt === 2) return `恐れ入ります、ゆっくり${label}をお願いできますか？`;
  return `${label}は後ほど確認させていただきます。`;
}

/**
 * HearingField[] → DfcxParameter[]
 * required=true の項目だけ form parameter として出力する (optional は別途 hearing 後の transitionRoute で扱う想定)。
 */
export function buildFormParameters(fields: HearingField[]): DfcxParameter[] {
  return fields
    .filter((f) => f.required)
    .map((f) => buildSingleParameter(f));
}

/**
 * required かどうか問わず全 HearingField を form parameter にする版 (optional も含めたい場合用)。
 */
export function buildAllFormParameters(fields: HearingField[]): DfcxParameter[] {
  return fields.map((f) => buildSingleParameter(f));
}

function buildSingleParameter(field: HearingField): DfcxParameter {
  const entityType = inferEntityType(field);
  const strategy: RepromptStrategy = field.repromptStrategy ?? "gentle";
  const max = field.maxReprompts ?? 3;

  const handlers: DfcxParameter["fillBehavior"]["repromptEventHandlers"] = [];
  if (max >= 1) {
    handlers.push({
      event: "sys.no-match-1",
      triggerFulfillment: txt(repromptText(field, 1, strategy)),
    });
  }
  if (max >= 2) {
    handlers.push({
      event: "sys.no-match-2",
      triggerFulfillment: txt(repromptText(field, 2, strategy)),
    });
  }
  if (max >= 3) {
    const finalHandler = {
      event: "sys.no-match-3",
      triggerFulfillment: txt(repromptText(field, 3, strategy)),
      ...(strategy === "offer_transfer" || strategy === "assertive"
        ? { targetPage: "transfer" }
        : {}),
    };
    handlers.push(finalHandler);
  }

  // sys.no-input も同等の扱い
  handlers.push({
    event: "sys.no-input-1",
    triggerFulfillment: txt(`もしもし、${field.label}についてお聞かせいただけますか？`),
  });
  handlers.push({
    event: "sys.no-input-default",
    triggerFulfillment: txt(`お声が聞こえないようです。${field.label}を改めてお願いします。`),
  });

  return {
    displayName: field.key,
    entityType,
    required: field.required,
    fillBehavior: {
      initialPromptFulfillment: txt(buildInitialPrompt(field)),
      repromptEventHandlers: handlers,
    },
  };
}

function buildInitialPrompt(field: HearingField): string {
  // description があればそれを優先
  if (field.description) return `${field.label}を教えてください。${field.description}`;
  // type=enum で options がある場合は選択肢を提示
  if (field.type === "enum" && field.options && field.options.length > 0) {
    return `${field.label}を教えてください。例えば ${field.options.slice(0, 3).join("、")} などです。`;
  }
  return `${field.label}を教えてください。`;
}
