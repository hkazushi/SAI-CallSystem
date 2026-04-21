// ============================================================================
// DFCX Agent Deploy Orchestration
// buildDfcxAgent() の出力 を DFCX REST API で実際に反映する。
// 冪等: 同名Agentがあれば削除→再作成（Phase B MVP方針）。
// ============================================================================

import type { CallSettings } from "./ai-builder";
import { buildDfcxAgent } from "./dfcx-compiler";
import type { DfcxAgent as CompiledAgent, DfcxPage as CompiledPage, DfcxTransitionRoute as CompiledRoute, DfcxIntent as CompiledIntent, DfcxEntityType as CompiledEntity } from "./dfcx-compiler";
import {
  getDfcxConfig,
  locationPath,
  makeAgentsClient,
  makeEntityTypesClient,
  makeIntentsClient,
  makeFlowsClient,
  makePagesClient,
  type DfcxConfig,
} from "./dfcx-client";

export interface DeployResult {
  agentName: string;   // projects/{p}/locations/{l}/agents/{id}
  agentId: string;
  consoleUrl: string;
  stats: {
    entityTypes: number;
    intents: number;
    pages: number;
    durationMs: number;
  };
}

export interface DeployProgressEvent {
  step:
    | "prepare"
    | "agent_upsert"
    | "entity_types"
    | "intents"
    | "pages"
    | "flow_patch"
    | "done";
  message: string;
  progress: number; // 0-100
}

type ProgressCb = (e: DeployProgressEvent) => void;

/** メイン: 設定1本を渡すとDFCXに完全反映する */
export async function deployAgent(
  settings: CallSettings,
  opts: { displayNameOverride?: string; onProgress?: ProgressCb } = {},
): Promise<DeployResult> {
  const cfg = getDfcxConfig();
  const started = Date.now();
  const notify = opts.onProgress ?? (() => {});

  notify({ step: "prepare", message: "コンパイル中...", progress: 2 });
  const compiled = buildDfcxAgent(settings);
  if (opts.displayNameOverride) compiled.displayName = opts.displayNameOverride;

  // --- 1. Agent upsert ----------------------------------------------------
  notify({ step: "agent_upsert", message: "Agentを作成中...", progress: 10 });
  const agentsClient = makeAgentsClient(cfg);
  const agentName = await upsertAgent(cfg, agentsClient, compiled);
  const agentId = agentName.split("/").pop() ?? agentName;

  // --- 2. Entity Types ----------------------------------------------------
  notify({ step: "entity_types", message: `EntityTypeを登録中 (${compiled.entityTypes.length})...`, progress: 25 });
  const entityTypesClient = makeEntityTypesClient(cfg);
  const entityTypeNameMap = await createEntityTypes(agentName, entityTypesClient, compiled.entityTypes);

  // --- 3. Intents ---------------------------------------------------------
  notify({ step: "intents", message: `Intentを登録中 (${compiled.intents.length})...`, progress: 45 });
  const intentsClient = makeIntentsClient(cfg);
  const intentNameMap = await createIntents(agentName, intentsClient, compiled.intents);

  // --- 4. Pages (2-pass) --------------------------------------------------
  notify({ step: "pages", message: `Pageを登録中 (${compiled.startFlow.pages.length})...`, progress: 65 });
  const flowsClient = makeFlowsClient(cfg);
  const pagesClient = makePagesClient(cfg);

  // Default Start Flow の名前を取得
  const flows = await flowsClient.listFlows({ parent: agentName });
  const startFlow = flows[0].find((f) => f.displayName === "Default Start Flow");
  if (!startFlow?.name) {
    throw new Error("Default Start Flow が見つかりません");
  }
  const flowName = startFlow.name;

  // Pass 1: Pageを中身なしで作成（displayName→resourceName 解決用）
  const pageNameMap = await createPagesStub(flowName, pagesClient, compiled.startFlow.pages);

  // Pass 2: Pageに中身をpatch (transitionRoutes/entryFulfillment/form/eventHandlers)
  await patchPages(pagesClient, compiled.startFlow.pages, pageNameMap, intentNameMap, entityTypeNameMap);

  // --- 5. Flow patch (Welcome intent → Opening page) ----------------------
  notify({ step: "flow_patch", message: "Start Flowを更新中...", progress: 90 });
  await patchStartFlow(flowsClient, startFlow, compiled.startFlow.transitionRoutes ?? [], intentNameMap, pageNameMap);

  // --- Done ----------------------------------------------------------------
  const durationMs = Date.now() - started;
  notify({ step: "done", message: "デプロイ完了", progress: 100 });

  return {
    agentName,
    agentId,
    consoleUrl: buildConsoleUrl(cfg, agentId),
    stats: {
      entityTypes: compiled.entityTypes.length,
      intents: compiled.intents.length,
      pages: compiled.startFlow.pages.length,
      durationMs,
    },
  };
}

// ── Agent upsert: displayName一致なら削除→再作成 ─────────────────────────
async function upsertAgent(
  cfg: DfcxConfig,
  client: ReturnType<typeof makeAgentsClient>,
  compiled: CompiledAgent,
): Promise<string> {
  const parent = locationPath(cfg);
  const [existing] = await client.listAgents({ parent });
  const dup = existing.find((a) => a.displayName === compiled.displayName);
  if (dup?.name) {
    // 削除 (LRO待ち)
    const [op] = await client.deleteAgent({ name: dup.name });
    // deleteAgent は LRO ではない (即時)
  }

  const [created] = await client.createAgent({
    parent,
    agent: {
      displayName: compiled.displayName,
      defaultLanguageCode: compiled.defaultLanguageCode,
      timeZone: compiled.timeZone,
      description: compiled.description,
      speechToTextSettings: compiled.speechToTextSettings,
    },
  });
  if (!created.name) throw new Error("Agent作成に失敗: nameが返らない");
  return created.name;
}

// ── EntityTypes ─────────────────────────────────────────────────────────────
async function createEntityTypes(
  agentName: string,
  client: ReturnType<typeof makeEntityTypesClient>,
  entityTypes: CompiledEntity[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  // parallel create
  const results = await Promise.all(
    entityTypes.map(async (et) => {
      const [created] = await client.createEntityType({
        parent: agentName,
        entityType: {
          displayName: et.displayName,
          kind: et.kind as any,
          entities: et.entities.map((e) => ({ value: e.value, synonyms: e.synonyms })),
        },
      });
      return created;
    }),
  );
  for (const r of results) {
    if (r.displayName && r.name) map.set(r.displayName, r.name);
  }
  return map;
}

// ── Intents: displayName → resource name のマップを返す ────────────────────
async function createIntents(
  agentName: string,
  client: ReturnType<typeof makeIntentsClient>,
  intents: CompiledIntent[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  // 既存のDefault Welcome/Negative Intent等を取得 (システム既定で既に存在)
  // isFallback: true の Intent は transition route で使えないため除外
  const [existing] = await client.listIntents({ parent: agentName, pageSize: 100 });
  for (const ex of existing) {
    if (ex.isFallback) continue;
    if (ex.displayName && ex.name) map.set(ex.displayName, ex.name);
  }

  // 存在しないものだけを作成
  const toCreate = intents.filter((i) => !map.has(i.displayName));
  const created = await Promise.all(
    toCreate.map(async (intent) => {
      const [res] = await client.createIntent({
        parent: agentName,
        intent: {
          displayName: intent.displayName,
          description: intent.description,
          trainingPhrases: intent.trainingPhrases.map((tp) => ({
            parts: tp.parts.map((p) => ({ text: p.text })),
            repeatCount: 1,
          })),
        },
      });
      return res;
    }),
  );
  for (const c of created) {
    if (c.displayName && c.name) map.set(c.displayName, c.name);
  }
  return map;
}

// ── Pages: 2-pass ───────────────────────────────────────────────────────────
async function createPagesStub(
  flowName: string,
  client: ReturnType<typeof makePagesClient>,
  pages: CompiledPage[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  // Start Page は自動生成済み (displayName="Start Page")。そのname取得不要（flow自体を使う）。
  for (const p of pages) {
    const [created] = await client.createPage({
      parent: flowName,
      page: { displayName: p.displayName },
    });
    if (created.displayName && created.name) {
      map.set(created.displayName, created.name);
    }
  }
  return map;
}

async function patchPages(
  client: ReturnType<typeof makePagesClient>,
  pages: CompiledPage[],
  pageNameMap: Map<string, string>,
  intentNameMap: Map<string, string>,
  entityTypeNameMap: Map<string, string>,
) {
  await Promise.all(
    pages.map(async (p) => {
      const name = pageNameMap.get(p.displayName);
      if (!name) throw new Error(`Page ${p.displayName} のresource nameが見つかりません`);

      const transitionRoutes = (p.transitionRoutes ?? [])
        .map((r) => resolveRoute(r, intentNameMap, pageNameMap))
        .filter((r): r is NonNullable<typeof r> => r !== null);

      const eventHandlers = (p.eventHandlers ?? []).map((eh) => ({
        event: eh.event,
        triggerFulfillment: toFulfillment(eh.triggerFulfillment),
        targetPage: eh.targetPage ? pageNameMap.get(eh.targetPage) : undefined,
      }));

      const form = p.form
        ? {
            parameters: p.form.parameters.map((param) => ({
              displayName: param.displayName,
              required: param.required,
              entityType: resolveEntityTypeRef(param.entityType, entityTypeNameMap),
              fillBehavior: {
                initialPromptFulfillment: toFulfillment(param.fillBehavior.initialPromptFulfillment),
                repromptEventHandlers: (param.fillBehavior.repromptEventHandlers ?? []).map((eh) => ({
                  event: eh.event,
                  triggerFulfillment: toFulfillment(eh.triggerFulfillment),
                })),
              },
            })),
          }
        : undefined;

      await client.updatePage({
        page: {
          name,
          displayName: p.displayName,
          entryFulfillment: toFulfillment(p.entryFulfillment),
          transitionRoutes,
          eventHandlers,
          form,
        },
        updateMask: {
          paths: ["entry_fulfillment", "transition_routes", "event_handlers", "form"],
        },
      });
    }),
  );
}

// ── Flow patch: Welcome Intent route & Start Page transitions ─────────────
async function patchStartFlow(
  client: ReturnType<typeof makeFlowsClient>,
  startFlow: { name?: string | null; displayName?: string | null },
  compiledRoutes: CompiledRoute[],
  intentNameMap: Map<string, string>,
  pageNameMap: Map<string, string>,
) {
  if (!startFlow.name) return;

  const transitionRoutes = compiledRoutes
    .map((r) => resolveRoute(r, intentNameMap, pageNameMap))
    .filter((r): r is NonNullable<typeof r> => r !== null);

  await client.updateFlow({
    flow: {
      name: startFlow.name,
      displayName: startFlow.displayName ?? "Default Start Flow",
      transitionRoutes,
    },
    updateMask: {
      paths: ["transition_routes"],
    },
  });
}

// ── 補助: Route / Fulfillment 変換 ─────────────────────────────────────────
function resolveRoute(
  r: CompiledRoute,
  intentNameMap: Map<string, string>,
  pageNameMap: Map<string, string>,
) {
  const intentResource = r.intent ? intentNameMap.get(r.intent) : undefined;
  if (r.intent && !intentResource) {
    console.warn(`[dfcx-deploy] intent "${r.intent}" が見つかりません - ルートをスキップ`);
    return null;
  }
  const targetPage = r.targetPage ? pageNameMap.get(r.targetPage) : undefined;
  if (r.targetPage && !targetPage) {
    console.warn(`[dfcx-deploy] targetPage "${r.targetPage}" が見つかりません - ルートをスキップ`);
    return null;
  }
  return {
    intent: intentResource,
    condition: r.condition,
    triggerFulfillment: toFulfillment(r.triggerFulfillment),
    targetPage,
  };
}

function toFulfillment(f: CompiledPage["entryFulfillment"] | undefined) {
  if (!f) return undefined;
  return {
    messages: f.messages.map((m) =>
      m.text ? { text: { text: m.text.text } } : { payload: { fields: {} } },
    ),
    setParameterActions: f.setParameterActions?.map((p) => ({
      parameter: p.parameter,
      value: toValue(p.value),
    })),
    tag: f.tag,
  };
}

// google.protobuf.Value への単純な変換
function toValue(v: string | number | boolean) {
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "number") return { numberValue: v };
  return { boolValue: v };
}

function resolveEntityTypeRef(ref: string, entityTypeNameMap: Map<string, string>): string {
  // DFCXのform.parameter.entityTypeは完全リソースパスを要求する。
  // システム型は "projects/-/locations/-/agents/-/entityTypes/sys.xxx"
  // カスタム型は作成時に得たresource nameを使う
  if (ref.startsWith("@sys.")) {
    return `projects/-/locations/-/agents/-/entityTypes/${ref.slice(1)}`;
  }
  if (ref.startsWith("@")) {
    const displayName = ref.slice(1);
    const resolved = entityTypeNameMap.get(displayName);
    if (resolved) return resolved;
    // フォールバック
    return `projects/-/locations/-/agents/-/entityTypes/sys.any`;
  }
  return `projects/-/locations/-/agents/-/entityTypes/sys.any`;
}

// ── Console URL生成 ────────────────────────────────────────────────────────
function buildConsoleUrl(cfg: DfcxConfig, agentId: string): string {
  return `https://dialogflow.cloud.google.com/cx/projects/${cfg.projectId}/locations/${cfg.location}/agents/${agentId}`;
}
