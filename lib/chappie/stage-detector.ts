/**
 * 会話履歴から現在のステージを推論する簡易検出器。
 *
 * 本来は LLM で判断するのが理想だが、プロトタイプ段階では
 * 「Chappie 直近発言のレビュー完了マーカー + 往復数」で決める軽量実装にする。
 * 精度が足りなくなったら structured output で LLM に判定させる方針。
 */
import type { WallDiscussionStage } from "./types";
import { STAGE_ORDER } from "./types";

const REVIEW_MARKERS = [
  "最終仕様サマリー",
  "仕様サマリー",
  "最終確認",
  "この内容で",
  "この内容でよければ",
  "AIを生成",
  "AIを作成",
  "デプロイ",
  "準備が整いました",
  "準備ができました",
  "ボタン押せる",
  "ボタン、押せる",
  "押せる状態",
];

export function detectStage(messages: { role: string; content: string }[]): WallDiscussionStage {
  const latestAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const latestContent = latestAssistant?.content ?? "";
  if (REVIEW_MARKERS.some((marker) => latestContent.includes(marker))) {
    return "review";
  }

  const userTurns = messages.filter((m) => m.role === "user").length;

  if (userTurns <= 1) return "discovery";
  if (userTurns <= 2) return "identity";
  if (userTurns <= 4) return "task_flow";
  if (userTurns <= 6) return "hearing_rules";
  if (userTurns <= 8) return "style_guardrails";
  return "review";
}

export function nextStage(current: WallDiscussionStage): WallDiscussionStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}
