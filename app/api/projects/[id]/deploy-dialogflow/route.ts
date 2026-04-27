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

    // ---------- Step 3: Flow PATCH ----------
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

    // ---------- Step 4: Intents 作成 ----------
    const intentNameMap = new Map<string, string>(); // displayName → resource name
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

    // ---------- Step 5: Pages 作成 (transitionRoutes は ID 解決後に PATCH するので一旦空で) ----------
    const flowResource = defaultFlow.name;
    const pageNameMap = new Map<string, string>(); // displayName → resource name
    for (const page of config.pages) {
      const skeleton = {
        displayName: page.displayName,
        entryFulfillment: page.entryFulfillment,
        form: page.form,
        eventHandlers: page.eventHandlers,
      };
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

    // ---------- Step 6: Pages PATCH (transitionRoutes 解決) ----------
    for (const page of config.pages) {
      if (!page.transitionRoutes || page.transitionRoutes.length === 0) continue;
      const resolved = page.transitionRoutes.map((route) =>
        resolveTransitionRoute(route, intentNameMap, pageNameMap),
      );
      const pageResource = pageNameMap.get(page.displayName)!;
      await dfcxFetch(
        `/${pageResource}?updateMask=transitionRoutes`,
        {
          method: "PATCH",
          body: JSON.stringify({ transitionRoutes: resolved }),
        },
        { location },
      );
    }

    // ---------- Step 7: Webhook 登録 ----------
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

    // ---------- Step 8: Train (非同期) ----------
    const trainOp = await dfcxFetch<{ name: string }>(
      `/${createdAgentName}:train`,
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
    const pageResource = pages.get(route.targetPage);
    if (!pageResource) throw new Error(`Target page not found: ${route.targetPage}`);
    resolved.targetPage = pageResource;
  }
  if (route.targetFlow) resolved.targetFlow = route.targetFlow;
  return resolved;
}

// 型ヒント用 (未使用だが将来参照する可能性があるため残す)
export type { DfcxAgentConfig, DfcxPage };
