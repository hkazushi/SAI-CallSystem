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

/** タスクに重複しない slug を割り当て、intent / page で共有する */
export function assignTaskSlugs(tasks: TaskFlow[]): Array<{ task: TaskFlow; slug: string }> {
  const used = new Set<string>();
  return tasks.map((t) => {
    const base = slugify(t.name || t.trigger || "task");
    let slug = base;
    let i = 2;
    while (used.has(slug)) slug = `${base}_${i++}`;
    used.add(slug);
    return { task: t, slug };
  });
}

/** ChappieOutput.tasks を専用 Intent 配列に変換 (training phrases は自動補完) */
export function renderTasksAsIntents(tasks: TaskFlow[]): DfcxIntentSpec[] {
  return assignTaskSlugs(tasks).map(({ task, slug }) => {
    const phrases = (task.intentTrainingPhrases?.length ? task.intentTrainingPhrases : [])
      .concat(deriveTaskPhrases(task))
      .filter((p) => p && p.trim().length > 0);
    const uniquePhrases = Array.from(new Set(phrases));
    return {
      displayName: `intent.task.${slug}`,
      trainingPhrases: uniquePhrases.length > 0 ? uniquePhrases : [task.trigger || task.name],
      fulfillmentMessage: task.steps[0] ?? "承知いたしました。",
    };
  });
}

/** task name / trigger から training phrases バリエーションを生成 (AI が phrases を返さなかったときのフォールバック) */
function deriveTaskPhrases(task: TaskFlow): string[] {
  const out: string[] = [];
  if (task.trigger) {
    out.push(task.trigger);
    out.push(`${task.trigger}したい`);
    out.push(`${task.trigger}をお願いします`);
    out.push(`${task.trigger}のことで`);
  }
  if (task.name && task.name !== task.trigger) {
    out.push(task.name);
    out.push(`${task.name}したい`);
    out.push(`${task.name}お願いします`);
  }
  // 「新規予約」などキーワード抽出
  const keywords = (task.name + " " + task.trigger).match(/[一-龯ぁ-んァ-ヶー]{2,}/g) ?? [];
  for (const kw of keywords) {
    out.push(kw);
    if (kw.length >= 3) out.push(`${kw}したいです`);
  }
  return out;
}

/** ChappieOutput.tasks を専用 Page 配列に変換 (各タスクに対応する確認発話 + ヒアリング誘導) */
export function renderTasksAsPages(tasks: TaskFlow[]): Array<{
  displayName: string;
  entryFulfillment: DfcxFulfillment;
  // 次に遷移すべき page (基本 hearing、ヒアリング不要なら resolution / closing)
  nextPage: string;
  intentName: string;
}> {
  return assignTaskSlugs(tasks).map(({ task, slug }) => {
    const headline = task.steps[0] ?? `承知しました。${task.name}ですね。`;
    return {
      displayName: `task.${slug}`,
      entryFulfillment: txt(headline),
      nextPage: "hearing",
      intentName: `intent.task.${slug}`,
    };
  });
}

/** ペルソナ / ガードレールを agent.description にまとめる */
export function renderAgentDescription(output: ChappieOutput, tenantId: string): string {
  const lines: string[] = [];
  lines.push(`# ${output.assistantName}`);
  lines.push(`tenant: ${tenantId}  industry: ${output.industry}`);
  lines.push("");
  lines.push("## ペルソナ");
  lines.push(`tone: ${output.persona.tone}`);
  if (output.persona.doNots.length > 0) {
    lines.push("doNots:");
    output.persona.doNots.forEach((d) => lines.push(`  - ${d}`));
  }
  lines.push("");
  lines.push("## タスクフロー");
  output.tasks.forEach((t, i) => {
    lines.push(`${i + 1}. ${t.name} (trigger: ${t.trigger})`);
    t.steps.slice(0, 3).forEach((s) => lines.push(`   - ${s}`));
  });
  lines.push("");
  lines.push("## ヒアリング項目");
  output.hearingFields.forEach((f) => {
    lines.push(`- ${f.label}${f.required ? " (必須)" : ""}`);
  });
  if (output.guardrails.transferConditions.length > 0) {
    lines.push("");
    lines.push("## 人間転送条件");
    output.guardrails.transferConditions.forEach((t) => lines.push(`- ${t}`));
  }
  if (output.guardrails.prohibitedBehaviors.length > 0) {
    lines.push("");
    lines.push("## 禁止行為");
    output.guardrails.prohibitedBehaviors.forEach((p) => lines.push(`- ${p}`));
  }
  // DFCX agent.description は max 500 字。安全側で 480 字でカット
  const out = lines.join("\n");
  return out.length > 480 ? out.slice(0, 477) + "..." : out;
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

/** DFCX displayName 用の slug 生成。日本語は保持し、特殊記号のみ除去。 */
function slugify(s: string): string {
  if (!s) return "task";
  // DFCX displayName は ASCII 英数 + 日本語 (ひらがな/カタカナ/漢字) + ハイフン/アンダースコアを許容する
  return s
    .trim()
    .replace(/[\s　]+/g, "_") // 空白 (半角・全角) → アンダースコア
    .replace(/[^\w\-぀-ゟ゠-ヿ一-鿿]/g, "") // 許可文字以外を削除
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
