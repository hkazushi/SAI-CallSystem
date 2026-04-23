/**
 * Chappie (壁打ち会話) の内部状態型定義。
 *
 * 壁打ちは 6ステージで進む:
 *   1. Discovery       業種・用途ヒアリング
 *   2. Identity        AIの名前・ペルソナ
 *   3. Task Flow       捌く用件のフロー設計 (最重要)
 *   4. Hearing Rules   ヒアリング項目の設計
 *   5. Style/Guardrail スタイル・禁止事項
 *   6. Review          最終確認 → Vapi Assistant 生成
 */
import type { ChappieOutput } from "../vapi-compiler/types";

export type WallDiscussionStage =
  | "discovery"
  | "identity"
  | "task_flow"
  | "hearing_rules"
  | "style_guardrails"
  | "review";

export const STAGE_ORDER: WallDiscussionStage[] = [
  "discovery",
  "identity",
  "task_flow",
  "hearing_rules",
  "style_guardrails",
  "review",
];

export const STAGE_LABELS: Record<WallDiscussionStage, string> = {
  discovery: "ディスカバリー",
  identity: "アイデンティティ",
  task_flow: "タスクフロー",
  hearing_rules: "ヒアリング項目",
  style_guardrails: "スタイル・ガードレール",
  review: "最終確認",
};

/**
 * フロント側で保持・表示する壁打ち状態。
 */
export interface WallDiscussionState {
  stage: WallDiscussionStage;
  /** 現時点で埋まっている Chappie 出力 (部分的) */
  draft: Partial<ChappieOutput>;
  /** レビュー段階に到達したかどうか */
  readyForReview: boolean;
}

export const INITIAL_STATE: WallDiscussionState = {
  stage: "discovery",
  draft: {},
  readyForReview: false,
};
