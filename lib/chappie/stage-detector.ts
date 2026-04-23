/**
 * 会話履歴から現在のステージを推論する簡易検出器。
 *
 * 本来は LLM で判断するのが理想だが、プロトタイプ段階では
 * 「何往復したか + キーワード」で決める軽量実装にする。
 * 精度が足りなくなったら structured output で LLM に判定させる方針。
 */
import type { WallDiscussionStage } from "./types";
import { STAGE_ORDER } from "./types";

export function detectStage(messages: { role: string; content: string }[]): WallDiscussionStage {
  const userTurns = messages.filter((m) => m.role === "user").length;

  if (userTurns <= 1) return "discovery";
  if (userTurns <= 3) return "identity";
  if (userTurns <= 7) return "task_flow";
  if (userTurns <= 10) return "hearing_rules";
  if (userTurns <= 12) return "style_guardrails";
  return "review";
}

export function nextStage(current: WallDiscussionStage): WallDiscussionStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}
