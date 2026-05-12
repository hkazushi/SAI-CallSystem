/**
 * Chappie 出力 → Dialogflow CX Agent 設定 への変換メイン関数。
 *
 * Vapi の compileVapiAssistant() に対応する双子関数。
 *
 * 処理フロー:
 *   1. direction 判定 (option明示 → tasks[0].trigger 推定 → outbound default)
 *   2. baseline 選択 (OUTBOUND_SALES_BASELINE | INBOUND_SUPPORT_BASELINE)
 *   3. template.dfcxBaseline overlay 適用 (extraPages / extraIntents / repromptOverrides)
 *   4. ChappieOutput 差分適用
 *      - assistantName → agent.displayName
 *      - firstMessage → "greeting" Page entryFulfillment
 *      - hearingFields → "hearing" Page form.parameters
 *      - typicalObjections (Template) → custom Intents (objection)
 *      - transferConditions → transfer Intent
 *   5. webhook URL に tenantId を埋める
 */
import { OUTBOUND_SALES_BASELINE } from "./baselines/outbound-sales";
import { INBOUND_SUPPORT_BASELINE } from "./baselines/inbound-support";
import { buildFormParameters } from "./build-form-parameters";
import {
  renderGreetingFulfillment,
  renderHearingEntryFulfillment,
  renderObjectionsAsIntents,
  renderTransferIntent,
  renderTasksAsIntents,
  renderTasksAsPages,
  renderAgentDescription,
} from "./render-instructions";
import type {
  DfcxAgentConfig,
  DfcxCompileOptions,
  DfcxIntent,
  DfcxIntentSpec,
  DfcxPage,
  DfcxPageSpec,
} from "./types";
import type { ChappieOutput } from "../vapi-compiler/types";
import type { Template } from "../templates/types";

const DEFAULT_WEBHOOK_BASE = "https://PLACEHOLDER-SAAS-DOMAIN";

export function compileDfcxAgent(
  output: ChappieOutput,
  options: DfcxCompileOptions,
  template?: Template,
): DfcxAgentConfig {
  // 明示指定 > template.direction > tasks[0].trigger 推定 の優先順
  const direction =
    options.direction
    ?? (template?.direction === "inbound" || template?.direction === "outbound" ? template.direction : undefined)
    ?? inferDirection(output);
  const baseline = direction === "inbound" ? INBOUND_SUPPORT_BASELINE : OUTBOUND_SALES_BASELINE;

  // baseline は immutable に扱うため deep clone
  const cloned = structuredClone(baseline);

  // ---------- agent ----------
  const tenantSafeId = sanitizeId(options.tenantId);
  const timestamp = nowCompact();
  // assistantName を主軸にし、衝突回避のためタイムスタンプを末尾に付与
  const displayName = output.assistantName
    ? `${sanitizeId(output.assistantName)}-${timestamp}`
    : `sai-${tenantSafeId}-${timestamp}`;
  cloned.agent = {
    ...cloned.agent,
    displayName,
    description: renderAgentDescription(output, options.tenantId),
  };

  // ---------- flow ----------
  if (template?.dfcxBaseline?.defaultFlowName) {
    cloned.flow = { ...cloned.flow, displayName: template.dfcxBaseline.defaultFlowName };
  }

  // ---------- intents ----------
  const objectionIntents: DfcxIntent[] = template
    ? specsToIntents(renderObjectionsAsIntents(template.typicalObjections))
    : [];

  const transferSpec = renderTransferIntent(output.guardrails.transferConditions);
  const transferIntent: DfcxIntent[] = transferSpec ? specsToIntents([transferSpec]) : [];

  const taskIntents: DfcxIntent[] = specsToIntents(renderTasksAsIntents(output.tasks));

  const overlayExtraIntents: DfcxIntent[] = template?.dfcxBaseline?.extraIntents
    ? specsToIntents(template.dfcxBaseline.extraIntents)
    : [];

  const overlayTransfer: DfcxIntent[] = template?.dfcxBaseline?.transferIntent
    ? specsToIntents([template.dfcxBaseline.transferIntent])
    : [];

  cloned.intents = mergeIntentsByName([
    ...cloned.intents,
    ...objectionIntents,
    ...transferIntent,
    ...taskIntents,
    ...overlayExtraIntents,
    ...overlayTransfer,
  ]);

  // ---------- task pages ----------
  // 各タスクに対応する page を生成し、対応する intent から遷移できるようにする
  const rawTaskPageSpecs = renderTasksAsPages(output.tasks);
  // 同名衝突対策: displayName が重複したら -2, -3 ... を付与
  const seenPageNames = new Set<string>();
  const taskPageSpecs = rawTaskPageSpecs.map((spec) => {
    let name = spec.displayName;
    let i = 2;
    while (seenPageNames.has(name)) {
      name = `${spec.displayName}-${i++}`;
    }
    seenPageNames.add(name);
    return { ...spec, displayName: name };
  });
  const taskPages: DfcxPage[] = taskPageSpecs.map((spec) => ({
    displayName: spec.displayName,
    entryFulfillment: spec.entryFulfillment,
    transitionRoutes: [
      // 確認発話後に hearing へ流す (form パラメータが揃ったらフローが進む)
      { condition: "true", targetPage: spec.nextPage },
    ],
  }));

  // greeting から各タスクページへの transitionRoutes
  const greetingTaskRoutes: Array<{ intent: string; targetPage: string }> = taskPageSpecs.map(
    (spec) => ({ intent: spec.intentName, targetPage: spec.displayName }),
  );

  // greeting から反論・質問 Intent への transitionRoutes
  // (顧客はgreeting後すぐに反論・質問することが多いため、greeting page でも処理できるようにする)
  const greetingObjRoutes = direction === "outbound"
    ? buildObjectionTransitions([...objectionIntents, ...overlayExtraIntents], direction)
    : [];

  // greeting から転送 Intent への transitionRoutes
  const allTransferIntents = [...transferIntent, ...overlayTransfer];
  const greetingTransferRoutes = allTransferIntents.map((i) => ({
    intent: i.displayName,
    targetPage: "transfer",
  }));

  // ---------- pages ----------
  cloned.pages = cloned.pages.map((page) => {
    if (page.displayName === "greeting") {
      return {
        ...page,
        entryFulfillment: renderGreetingFulfillment(output),
        transitionRoutes: [
          ...greetingTaskRoutes,
          ...greetingObjRoutes,
          ...greetingTransferRoutes,
          ...(page.transitionRoutes ?? []),
        ],
      };
    }
    if (page.displayName === "hearing") {
      const params = buildFormParameters(output.hearingFields);
      return {
        ...page,
        entryFulfillment: renderHearingEntryFulfillment(output),
        form: params.length > 0 ? { parameters: params } : page.form,
        transitionRoutes: [
          ...(page.transitionRoutes ?? []),
          // 反論Intent からの transitionRoute を追加 (objection_handling Page or escalation へ)
          ...buildObjectionTransitions(objectionIntents, direction),
        ],
      };
    }
    if (page.displayName === "objection_handling") {
      // objection_handling では各反論 Intent からの遷移を待つ
      return {
        ...page,
        transitionRoutes: [
          ...(page.transitionRoutes ?? []),
          ...buildObjectionResponses(objectionIntents),
        ],
      };
    }
    return page;
  });

  // タスク専用 page を append (重複は taskPages 名で除外)
  const existingNames = new Set(cloned.pages.map((p) => p.displayName));
  const newTaskPages = taskPages.filter((p) => !existingNames.has(p.displayName));
  cloned.pages = [...cloned.pages, ...newTaskPages];

  // overlay extraPages を append
  if (template?.dfcxBaseline?.extraPages) {
    cloned.pages = [
      ...cloned.pages,
      ...template.dfcxBaseline.extraPages.map((spec) => specToPage(spec, output)),
    ];
  }

  // repromptOverrides 適用 (各 Page の standard event handlers に上書き)
  if (template?.dfcxBaseline?.repromptOverrides) {
    cloned.pages = cloned.pages.map((page) => applyRepromptOverrides(page, template.dfcxBaseline!.repromptOverrides!));
  }

  // ---------- webhook ----------
  const webhookBase = options.webhookBaseUrl ?? DEFAULT_WEBHOOK_BASE;
  cloned.webhookUrl = `${webhookBase}/webhook/dfcx/${tenantSafeId}/fulfillment`;

  return cloned;
}

/* -------- helpers -------- */

function inferDirection(output: ChappieOutput): "outbound" | "inbound" {
  const firstTrigger = output.tasks[0]?.trigger ?? "";
  if (/(問い合わせ|サポート|電話を受け|着信|inbound)/i.test(firstTrigger)) return "inbound";
  if (/(発信|outbound|アウトバウンド|新規|営業電話|アポ取り)/i.test(firstTrigger)) return "outbound";
  return "outbound";
}

function sanitizeId(s: string): string {
  return s.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 32) || "tenant";
}

function nowCompact(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
}

/** DfcxIntentSpec[] を DfcxIntent[] に変換 */
function specsToIntents(specs: DfcxIntentSpec[]): DfcxIntent[] {
  return specs.map((spec) => ({
    displayName: spec.displayName,
    trainingPhrases: spec.trainingPhrases.map((p) => ({ parts: [{ text: p }] })),
    description: spec.fulfillmentMessage ?? "",
  }));
}

/** displayName の重複を後勝ちでマージ */
function mergeIntentsByName(intents: DfcxIntent[]): DfcxIntent[] {
  const map = new Map<string, DfcxIntent>();
  for (const i of intents) map.set(i.displayName, i);
  return Array.from(map.values());
}

/** 反論 Intent 群から hearing → objection_handling Page への transitionRoute を生成 */
function buildObjectionTransitions(
  objectionIntents: DfcxIntent[],
  direction: "outbound" | "inbound",
) {
  // INBOUND_SUPPORT_BASELINE には objection_handling Page が無いため遷移を生成しない
  if (direction === "inbound") return [];
  return objectionIntents.map((intent) => ({
    intent: intent.displayName,
    targetPage: "objection_handling",
  }));
}

/** objection_handling Page 内で各反論 Intent への返答を生成 */
function buildObjectionResponses(objectionIntents: DfcxIntent[]) {
  return objectionIntents.map((intent) => ({
    intent: intent.displayName,
    triggerFulfillment: { messages: [{ text: { text: [intent.description ?? "承知しました。"] } }] },
  }));
}

/** DfcxPageSpec → DfcxPage */
function specToPage(spec: DfcxPageSpec, _output: ChappieOutput): DfcxPage {
  return {
    displayName: spec.displayName,
    entryFulfillment: spec.entryFulfillment
      ? { messages: [{ text: { text: [spec.entryFulfillment] } }] }
      : undefined,
    transitionRoutes: spec.nextPage
      ? [{ condition: spec.transitionCondition ?? "true", targetPage: spec.nextPage }]
      : undefined,
  };
}

/** repromptOverrides を Page の event handlers に適用 */
function applyRepromptOverrides(
  page: DfcxPage,
  overrides: Partial<Record<"1" | "2" | "3", string>>,
): DfcxPage {
  if (!page.eventHandlers || page.eventHandlers.length === 0) return page;
  return {
    ...page,
    eventHandlers: page.eventHandlers.map((h) => {
      const match = h.event.match(/^sys\.no-match-(\d)$/);
      if (!match) return h;
      const attempt = match[1] as "1" | "2" | "3";
      const overrideText = overrides[attempt];
      if (!overrideText) return h;
      return {
        ...h,
        triggerFulfillment: { messages: [{ text: { text: [overrideText] } }] },
      };
    }),
  };
}
