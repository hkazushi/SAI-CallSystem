/**
 * Page の entryFulfillment / 反論時の応答などを ChappieOutput / Template から組み立てる。
 *
 * Vapi の render-system-prompt.ts に対応する。
 * Vapi は単一のシステムプロンプトを生成するが、DFCX は Page ごとに自然文を分散させる。
 */
import type { ChappieOutput, TaskFlow } from "../vapi-compiler/types";
import type { DfcxFulfillment, DfcxIntentSpec } from "./types";

const txt = (s: string): DfcxFulfillment => ({ messages: [{ text: { text: [s] } }] });

/** ChappieOutput.firstMessage を greeting Page の entryFulfillment 形式に変換 */
export function renderGreetingFulfillment(output: ChappieOutput): DfcxFulfillment {
  return txt(output.firstMessage);
}

/** ChappieOutput.tasks を反論処理 / 質問対応用の Intent 配列に変換 */
export function renderTasksAsIntents(tasks: TaskFlow[]): DfcxIntentSpec[] {
  return tasks
    .filter((t) => t.intentTrainingPhrases && t.intentTrainingPhrases.length > 0)
    .map((t) => ({
      displayName: `intent.task.${slugify(t.name)}`,
      trainingPhrases: t.intentTrainingPhrases ?? [t.trigger],
      fulfillmentMessage: t.steps[0] ?? "承知いたしました。",
    }));
}

/** typicalObjections (Template由来) を業界別反論 Intent に変換 */
export function renderObjectionsAsIntents(
  objections: Array<{ trigger: string; suggestedResponses: string[] }>,
): DfcxIntentSpec[] {
  return objections.map((o, i) => ({
    displayName: `intent.objection.${i + 1}`,
    trainingPhrases: [o.trigger, ...generateObjectionVariants(o.trigger)],
    fulfillmentMessage: o.suggestedResponses[0] ?? "承知いたしました。",
  }));
}

/** transferConditions を transfer Intent に変換 */
export function renderTransferIntent(transferConditions: string[]): DfcxIntentSpec | null {
  if (transferConditions.length === 0) return null;
  return {
    displayName: "intent.transfer.requested",
    trainingPhrases: [
      "担当者と話したい",
      "オペレーターをお願いします",
      "人と代わってください",
      "AIではなく人と話したい",
      ...transferConditions.map((c) => `${c}になりました`),
    ],
    targetPage: "transfer",
    fulfillmentMessage: "担当者におつなぎいたします。少々お待ちください。",
  };
}

/** ChappieOutput.persona / guardrails を踏まえた hearing Page の entryFulfillment */
export function renderHearingEntryFulfillment(output: ChappieOutput): DfcxFulfillment {
  const tone = output.persona.tone;
  if (tone.includes("丁寧") || tone.includes("落ち着いた")) {
    return txt("ありがとうございます。それではいくつか確認させていただきますね。");
  }
  if (tone.includes("親しみ") || tone.includes("テキパキ")) {
    return txt("ありがとうございます！それではちょっとだけ伺いますね。");
  }
  return txt("では、いくつか確認させてください。");
}

/** ChappieOutput.guardrails.prohibitedBehaviors / doNots を Webhook fulfillment metadata 用に整形 */
export function renderGuardrailsBlock(output: ChappieOutput): string {
  const lines: string[] = ["[Guardrails]"];
  output.guardrails.prohibitedBehaviors.forEach((p) => lines.push(`- 禁止: ${p}`));
  output.persona.doNots.forEach((d) => lines.push(`- 禁止: ${d}`));
  output.guardrails.transferConditions.forEach((t) => lines.push(`- 転送条件: ${t}`));
  return lines.join("\n");
}

/* -------- helpers -------- */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40) || "task";
}

/** trigger 発話のバリエーションを簡易生成 (DFCX の trainingPhrases を最低 3つに増やす) */
function generateObjectionVariants(trigger: string): string[] {
  const variants: string[] = [];
  if (trigger.endsWith("る") || trigger.endsWith("だ") || trigger.endsWith("です")) {
    variants.push(trigger.replace(/(です|だ|る)$/, "んです"));
  }
  variants.push(`${trigger}ので、結構です`);
  return variants;
}
