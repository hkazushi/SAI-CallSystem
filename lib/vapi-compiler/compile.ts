/**
 * Chappie 出力 → Vapi Assistant 設定 への変換メイン関数。
 *
 * LINECT_BASELINE を土台にして、Chappie が生成した部分だけを上書きする方針:
 *   - name / firstMessage / System Prompt: Chappie 出力で上書き
 *   - voice / transcriber / timing: Linect 実戦チューニングをそのまま継承
 *   - analysisPlan: structuredDataPlan.schema を HearingField から生成
 *   - server.url: tenantId を埋めた webhook URL に差し替え
 */
import { LINECT_BASELINE } from "./templates/linect-baseline";
import { renderSystemPrompt } from "./render-system-prompt";
import { buildStructuredSchema } from "./build-structured-schema";
import type { ChappieOutput, CompileOptions, VapiAssistantConfig } from "./types";

const DEFAULT_WEBHOOK_BASE = "https://PLACEHOLDER-SAAS-DOMAIN";

export function compileVapiAssistant(output: ChappieOutput, options: CompileOptions): VapiAssistantConfig {
  const systemPrompt = renderSystemPrompt(output);
  const webhookBase = options.webhookBaseUrl ?? DEFAULT_WEBHOOK_BASE;
  const structuredSchema = buildStructuredSchema(output.hearingFields);

  const baseline = LINECT_BASELINE as unknown as VapiAssistantConfig;

  return {
    ...baseline,

    name: output.assistantName,
    firstMessage: output.firstMessage,

    model: {
      ...baseline.model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
      ],
    },

    analysisPlan: {
      ...baseline.analysisPlan,
      structuredDataPlan: {
        enabled: true,
        schema: structuredSchema,
      },
    },

    server: {
      ...baseline.server,
      url: `${webhookBase}/webhook/vapi/${options.tenantId}/call-report`,
    },
  };
}
