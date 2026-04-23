/**
 * Chappie 出力 → Vapi System Prompt の5セクション文字列 に変換する。
 *
 * 出力フォーマットは Linect baseline (linect-baseline.ts) と同じ:
 *   [Identity] / [Style] / [Task Flow] / [Hearing Rules] / [Guardrails]
 *
 * これを Vapi の model.messages[0].content に入れる。
 */
import type { ChappieOutput } from "./types";

export function renderSystemPrompt(output: ChappieOutput): string {
  const { industry, persona, tasks, hearingFields, guardrails } = output;

  const identity = `[Identity]
You are a customer support AI for ${industry}.
Always respond in natural, polite ${persona.language === "ja" ? "Japanese (です/ます調)" : "English"}.
Keep every reply under 2 sentences. You are in a live voice call.`;

  const style = [
    `[Style]`,
    `- ${persona.tone}`,
    `- Avoid jargon. Use simple ${persona.language === "ja" ? "Japanese" : "English"}.`,
    `- Never fabricate campaigns, prices, schedules, or legal advice.`,
    ...persona.doNots.map((d) => `- ${d}`),
  ].join("\n");

  const taskFlow = [
    `[Task Flow]`,
    ...tasks.flatMap((task, i) => [
      `${i + 1}. ${task.name} — ${task.trigger}`,
      ...task.steps.map((step) => `   - ${step}`),
    ]),
  ].join("\n");

  const hearingRules = [
    `[Hearing Rules]`,
    ...hearingFields.map(
      (f) =>
        `- ${f.label}${f.required ? " (required)" : ""}: collect as "${f.key}"${f.description ? ` — ${f.description}` : ""}`,
    ),
  ].join("\n");

  const guardrailsSection = [
    `[Guardrails]`,
    ...guardrails.prohibitedBehaviors.map((p) => `- ${p}`),
    ...guardrails.transferConditions.map((t) => `- On ${t}: transfer to a human agent immediately.`),
  ].join("\n");

  return [identity, style, taskFlow, hearingRules, guardrailsSection].join("\n\n");
}
