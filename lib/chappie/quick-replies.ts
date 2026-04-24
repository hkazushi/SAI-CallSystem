/**
 * Chappie 応答テキストから [[CHOICES]]...[[/CHOICES]] ブロックを抽出する。
 *
 * メタプロンプトで Chappie は以下のフォーマットで選択肢を末尾に付ける:
 *   （通常の応答本文）
 *
 *   [[CHOICES]]
 *   - 選択肢1
 *   - 選択肢2
 *   - 選択肢3
 *   [[/CHOICES]]
 *
 * UI 側ではブロックを除去した本文と、抽出した選択肢配列を分けて扱う。
 */

const CHOICES_BLOCK_REGEX = /\[\[CHOICES\]\]([\s\S]*?)\[\[\/CHOICES\]\]/;

export interface ParsedChoices {
  cleanText: string;
  choices: string[];
}

export function parseChoices(text: string): ParsedChoices {
  const match = text.match(CHOICES_BLOCK_REGEX);
  if (!match) {
    return { cleanText: text, choices: [] };
  }

  const block = match[1];
  const choices = block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-"))
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter((line) => line.length > 0);

  const cleanText = text.replace(CHOICES_BLOCK_REGEX, "").replace(/\n{3,}/g, "\n\n").trim();

  return { cleanText, choices };
}
