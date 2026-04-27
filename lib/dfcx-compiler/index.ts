/**
 * lib/dfcx-compiler の公開エントリ。
 *
 * 主に呼び出されるのは:
 *   - compileDfcxAgent()       — ChappieOutput → DfcxAgentConfig
 *   - OUTBOUND_SALES_BASELINE  — テスト用 (デフォルト構造を確認)
 *   - INBOUND_SUPPORT_BASELINE
 */
export { compileDfcxAgent } from "./compile";
export { OUTBOUND_SALES_BASELINE } from "./baselines/outbound-sales";
export { INBOUND_SUPPORT_BASELINE } from "./baselines/inbound-support";
export { buildFormParameters, inferEntityType } from "./build-form-parameters";
export type {
  DfcxAgentConfig,
  DfcxAgent,
  DfcxFlow,
  DfcxPage,
  DfcxIntent,
  DfcxParameter,
  DfcxFulfillment,
  DfcxFulfillmentMessage,
  DfcxEventHandler,
  DfcxTransitionRoute,
  DfcxCompileOptions,
  DfcxDeployResult,
  DfcxBaselineOverlay,
  DfcxPageSpec,
  DfcxIntentSpec,
  DfcxEntityType,
} from "./types";
