/**
 * POST /api/projects/[id]/deploy-dialogflow
 *
 * compileDfcxAgent() で生成した DfcxAgentConfig を Dialogflow CX REST v3 にデプロイする。
 *
 * 多段 REST フロー:
 *   1. POST .../agents               (Agent 作成)
 *   2. GET  .../agents/{id}/flows    (Default Start Flow ID 取得)
 *   3. PATCH Flow                    (displayName/nluSettings 反映)
 *   4. POST .../intents (× N)        (Intent 一括作成、displayName→ID マップ構築)
 *   5. POST .../pages (× N)          (Page 一括作成、displayName→ID マップ構築)
 *   6. PATCH .../pages/{id} (× N)    (transitionRoutes に Intent ID/Page ID を埋める)
 *   7. POST .../webhooks             (Webhook 登録)
 *   8. POST .../agents/{id}:train    (非同期 train ジョブ)
 *
 * 失敗時のロールバック:
 *   Agent 作成後の任意ステップで失敗 → DELETE .../agents/{id} で全削除して 502 を返す
 *
 * Phase A: Supabase への projects.dfcx_* 列保存はまだ繋がない。結果だけ返す。
 */
import { NextResponse } from "next/server";
import {
  compileDfcxAgent,
  type DfcxAgentConfig,
  type DfcxIntent,
  type DfcxPage,
  type DfcxTransitionRoute,
  type DfcxDeployResult,
} from "@/lib/dfcx-compiler";
import type { ChappieOutput } from "@/lib/vapi-compiler/types";
import type { Template } from "@/lib/templates/types";
import {
  dfcxFetch,
  getGcpLocation,
  getGcpProjectId,
  DfcxApiError,
} from "@/lib/dfcx-client";

export const maxDuration = 120;

type RouteContext = { params: Promise<{ id: string }> };

interface DeployBody {
  output: ChappieOutput;
  template?: Template;
  tenantId?: string;
  direction?: "outbound" | "inbound";
}

export async function POST(req: Request, { params }: RouteContext) {
  const { id: projectId } = await params;
  const body = (await req.json()) as DeployBody;

  if (!body?.output) {
    return NextResponse.json({ error: "output is required" }, { status: 400 });
  }

  const tenantId = body.tenantId ?? projectId;
  const projectIdGcp = getGcpProjectId();
  const location = getGcpLocation();
  const parent = `projects/${projectIdGcp}/locations/${location}`;

  const config = compileDfcxAgent(
    body.output,
    {
      tenantId,
      webhookBaseUrl: process.env.NEXT_PUBLIC_APP_URL,
      direction: body.direction,
      gcpProjectId: projectIdGcp,
      gcpLocation: location,
    },
    body.template,
  );

  let createdAgentName: string | null = null;

  try {
    // ---------- Step 1: Agent 作成 ----------
    const createdAgent = await dfcxFetch<{ name: string }>(
      `/${parent}/agents`,
      {
        method: "POST",
        body: JSON.stringify(config.agent),
      },
      { location },
    );
    createdAgentName = createdAgent.name; // "projects/{}/locations/{}/agents/{id}"
    const agentId = createdAgentName.split("/").pop()!;

    // ---------- Step 2: Default Start Flow 取得 ----------
    const flows = await dfcxFetch<{ flows: Array<{ name: string; displayName: string }> }>(
      `/${createdAgentName}/flows`,
      { method: "GET" },
      { location },
    );
    const defaultFlow = flows.flows?.find((f) => f.displayName === "Default Start Flow");
    if (!defaultFlow) {
      throw new Error("Default Start Flow not found in created agent");
    }
    const flowId = defaultFlow.name.split("/").pop()!;

    // ---------- Step 3: Flow PATCH (displayName / nluSettings のみ。transitionRoutes は Pages 作成後に PATCH) ----------
    await dfcxFetch(
      `/${defaultFlow.name}?updateMask=displayName,nluSettings`,
      {
        method: "PATCH",
        body: JSON.stringify({
          displayName: config.flow.displayName,
          nluSettings: config.flow.nluSettings,
        }),
      },
      { location },
    );

    // ---------- Step 4: Intents 作成 (組み込み Default Welcome Intent も先に取得して登録) ----------
    const intentNameMap = new Map<string, string>(); // displayName → resource name
    // 4a: 組み込み Intent (Default Welcome Intent / Default Negative Intent) を取得
    const existingIntents = await dfcxFetch<{ intents?: Array<{ name: string; displayName: string }> }>(
      `/${createdAgentName}/intents`,
      { method: "GET" },
      { location },
    );
    for (const intent of existingIntents.intents ?? []) {
      intentNameMap.set(intent.displayName, intent.name);
    }
    // 4b: 自前の Intent を作成
    for (const intent of config.intents) {
      const created = await dfcxFetch<{ name: string }>(
        `/${createdAgentName}/intents`,
        {
          method: "POST",
          body: JSON.stringify(toIntentRequestBody(intent)),
        },
        { location },
      );
      intentNameMap.set(intent.displayName, created.name);
    }

    // ---------- Step 5: Pages 作成 (eventHandlers / transitionRoutes は ID 解決後に PATCH) ----------
    const flowResource = defaultFlow.name;
    const pageNameMap = new Map<string, string>(); // displayName → resource name
    for (const page of config.pages) {
      const skeleton: Record<string, unknown> = {
        displayName: page.displayName,
        entryFulfillment: page.entryFulfillment,
      };
      if (page.form) skeleton.form = normalizeForm(page.form);
      const created = await dfcxFetch<{ name: string }>(
        `/${flowResource}/pages`,
        {
          method: "POST",
          body: JSON.stringify(skeleton),
        },
        { location },
      );
      pageNameMap.set(page.displayName, created.name);
    }

    // ---------- Step 6: Pages PATCH (transitionRoutes / eventHandlers / form を resolved 値で更新) ----------
    for (const page of config.pages) {
      const hasRoutes = page.transitionRoutes && page.transitionRoutes.length > 0;
      const hasHandlers = page.eventHandlers && page.eventHandlers.length > 0;
      const hasForm = !!page.form && page.form.parameters.length > 0;
      if (!hasRoutes && !hasHandlers && !hasForm) continue;

      const patchBody: Record<string, unknown> = {};
      const updateMask: string[] = [];
      if (hasRoutes) {
        patchBody.transitionRoutes = page.transitionRoutes!.map((route) =>
          resolveTransitionRoute(route, intentNameMap, pageNameMap, flowResource),
        );
        updateMask.push("transitionRoutes");
      }
      if (hasHandlers) {
        patchBody.eventHandlers = page.eventHandlers!.map((h) =>
          resolveEventHandler(h, pageNameMap, flowResource),
        );
        updateMask.push("eventHandlers");
      }
      if (hasForm) {
        patchBody.form = resolveForm(page.form!, pageNameMap, flowResource);
        updateMask.push("form");
      }
      const pageResource = pageNameMap.get(page.displayName)!;
      await dfcxFetch(
        `/${pageResource}?updateMask=${updateMask.join(",")}`,
        {
          method: "PATCH",
          body: JSON.stringify(patchBody),
        },
        { location },
      );
    }

    // ---------- Step 6.5: Flow の transitionRoutes を PATCH (Default Welcome Intent → greeting Page など) ----------
    if (config.flow.transitionRoutes && config.flow.transitionRoutes.length > 0) {
      const flowTransitionRoutes = config.flow.transitionRoutes.map((route) =>
        resolveTransitionRoute(route, intentNameMap, pageNameMap, flowResource),
      );
      await dfcxFetch(
        `/${defaultFlow.name}?updateMask=transitionRoutes`,
        {
          method: "PATCH",
          body: JSON.stringify({ transitionRoutes: flowTransitionRoutes }),
        },
        { location },
      );
    }

    // ---------- Step 7: Webhook 登録 (DFCX は https 必須なのでローカル http はスキップ) ----------
    const webhookIsHttps = config.webhookUrl.startsWith("https://");
    if (webhookIsHttps) {
      await dfcxFetch(
        `/${createdAgentName}/webhooks`,
        {
          method: "POST",
          body: JSON.stringify({
            displayName: `sai-fulfillment-${tenantId}`,
            genericWebService: {
              uri: config.webhookUrl,
              requestHeaders: {
                "X-Sai-Tenant": tenantId,
              },
            },
            timeout: "10s",
          }),
        },
        { location },
      );
    } else {
      console.warn(
        `[deploy-dialogflow] webhook URL is not https (got ${config.webhookUrl}), skipping webhook registration. Set NEXT_PUBLIC_APP_URL to an https URL to enable.`,
      );
    }

    // ---------- Step 8: Train (非同期、Flow 単位) ----------
    const trainOp = await dfcxFetch<{ name: string }>(
      `/${flowResource}:train`,
      { method: "POST", body: JSON.stringify({}) },
      { location },
    );

    const result: DfcxDeployResult = {
      ok: true,
      projectId,
      agentName: createdAgentName,
      agentId,
      flowId,
      trainOperationName: trainOp.name,
    };
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown DFCX error";
    const status = err instanceof DfcxApiError ? err.status : 502;
    console.error("[deploy-dialogflow] failed", { projectId, error: message });

    // ロールバック: Agent 作成後に失敗していれば削除
    if (createdAgentName) {
      try {
        await dfcxFetch(
          `/${createdAgentName}`,
          { method: "DELETE" },
          { location },
        );
        console.warn("[deploy-dialogflow] rolled back agent", createdAgentName);
      } catch (rollbackErr) {
        console.error("[deploy-dialogflow] rollback failed", rollbackErr);
      }
    }

    const result: DfcxDeployResult = {
      ok: false,
      projectId,
      error: message,
    };
    return NextResponse.json(result, { status });
  }
}

/* -------- helpers -------- */

function toIntentRequestBody(intent: DfcxIntent) {
  return {
    displayName: intent.displayName,
    trainingPhrases: intent.trainingPhrases.map((p) => ({
      parts: p.parts,
      repeatCount: p.repeatCount ?? 1,
    })),
    description: intent.description,
    isFallback: intent.isFallback,
  };
}

function resolveTransitionRoute(
  route: DfcxTransitionRoute,
  intents: Map<string, string>,
  pages: Map<string, string>,
  flowResource: string,
) {
  const resolved: Record<string, unknown> = {};
  if (route.intent) {
    const intentResource = intents.get(route.intent);
    if (!intentResource) throw new Error(`Intent not found in agent: ${route.intent}`);
    resolved.intent = intentResource;
  }
  if (route.condition) resolved.condition = route.condition;
  if (route.triggerFulfillment) resolved.triggerFulfillment = route.triggerFulfillment;
  if (route.targetPage) {
    resolved.targetPage = resolveTargetPage(route.targetPage, pages, flowResource);
  }
  if (route.targetFlow) resolved.targetFlow = route.targetFlow;
  return resolved;
}

function resolveEventHandler(
  handler: { event: string; triggerFulfillment?: unknown; targetPage?: string; targetFlow?: string },
  pages: Map<string, string>,
  flowResource: string,
) {
  const resolved: Record<string, unknown> = { event: handler.event };
  if (handler.triggerFulfillment) resolved.triggerFulfillment = handler.triggerFulfillment;
  if (handler.targetPage) {
    resolved.targetPage = resolveTargetPage(handler.targetPage, pages, flowResource);
  }
  if (handler.targetFlow) resolved.targetFlow = handler.targetFlow;
  return resolved;
}

/**
 * Step 5 用: entityType を REST 形式に正規化し、Page リソース未確定のため targetPage を剥がす。
 * Step 6 PATCH で resolveForm() を呼んで targetPage 解決した完全版に置換する。
 */
function normalizeForm(form: { parameters: ReadonlyArray<unknown> }) {
  return {
    ...form,
    parameters: form.parameters.map((p) => {
      const param = p as {
        entityType?: unknown;
        fillBehavior?: { repromptEventHandlers?: ReadonlyArray<unknown> } & Record<string, unknown>;
      };
      const entityType = typeof param.entityType === "string" ? normalizeEntityType(param.entityType) : param.entityType;
      const handlers = param.fillBehavior?.repromptEventHandlers;
      const strippedHandlers = handlers?.map((h) => {
        const handler = h as Record<string, unknown>;
        const { targetPage: _ignored, ...rest } = handler;
        return rest;
      });
      const next: Record<string, unknown> = { ...(p as object), entityType };
      if (param.fillBehavior) {
        next.fillBehavior = {
          ...param.fillBehavior,
          ...(strippedHandlers ? { repromptEventHandlers: strippedHandlers } : {}),
        };
      }
      return next;
    }),
  };
}

/**
 * Step 6 用: form の repromptEventHandlers[].targetPage を resolveTargetPage で解決した完全版を返す。
 */
function resolveForm(
  form: { parameters: ReadonlyArray<unknown> },
  pages: Map<string, string>,
  flowResource: string,
) {
  return {
    ...form,
    parameters: form.parameters.map((p) => {
      const param = p as {
        entityType?: unknown;
        fillBehavior?: { repromptEventHandlers?: ReadonlyArray<unknown> } & Record<string, unknown>;
      };
      const entityType = typeof param.entityType === "string" ? normalizeEntityType(param.entityType) : param.entityType;
      const handlers = param.fillBehavior?.repromptEventHandlers;
      const resolvedHandlers = handlers?.map((h) => {
        const handler = h as { event?: string; triggerFulfillment?: unknown; targetPage?: string };
        return resolveEventHandler(
          { event: handler.event ?? "", triggerFulfillment: handler.triggerFulfillment, targetPage: handler.targetPage },
          pages,
          flowResource,
        );
      });
      const next: Record<string, unknown> = { ...(p as object), entityType };
      if (param.fillBehavior) {
        next.fillBehavior = {
          ...param.fillBehavior,
          ...(resolvedHandlers ? { repromptEventHandlers: resolvedHandlers } : {}),
        };
      }
      return next;
    }),
  };
}

function normalizeEntityType(entityType: string): string {
  return entityType.startsWith("@")
    ? `projects/-/locations/-/agents/-/entityTypes/${entityType.slice(1)}`
    : entityType;
}

function resolveTargetPage(
  ref: string,
  pages: Map<string, string>,
  flowResource: string,
): string {
  if (ref === "End Session" || ref === "END_SESSION") {
    return `${flowResource}/pages/END_SESSION`;
  }
  if (ref === "End Flow" || ref === "END_FLOW") {
    return `${flowResource}/pages/END_FLOW`;
  }
  if (ref === "Start Page" || ref === "START_PAGE") {
    return `${flowResource}/pages/START_PAGE`;
  }
  const resource = pages.get(ref);
  if (!resource) throw new Error(`Target page not found: ${ref}`);
  return resource;
}

// 型ヒント用 (未使用だが将来参照する可能性があるため残す)
export type { DfcxAgentConfig, DfcxPage };
