/**
 * 業界テンプレート型定義
 *
 * 階層: 業界 → 方向(OB/IB) → 属性(従業員数・ターゲット等) → テンプレ
 * クライアントはテンプレートを選んで Chappie との対話で微調整する。
 */

import type { HearingField } from '../vapi-compiler/types';

export type Industry = 'hikari' | 'water_server' | 'insurance' | 'real_estate' | 'hr';
export type CallDirection = 'outbound' | 'inbound';

/** UI での絞り込み用属性（各テンプレが保持） */
export interface AttributeOption {
  key: string;
  label: string;
  values: Array<{ value: string; label: string }>;
}

/** よくある反論パターンと返し方の候補 */
export interface TypicalObjection {
  /** 相手がこう言ってきたら */
  trigger: string;
  /** こう返す候補（複数） */
  suggestedResponses: string[];
}

export interface Template {
  /** e.g. "hikari-ob" */
  id: string;
  industry: Industry;
  direction: CallDirection;
  /** UI 表示名 */
  displayName: string;
  /** 1-2 行説明 */
  description: string;

  /** 電話の第一声（テンプレ） */
  defaultFirstMessage: string;

  defaultPersona: {
    tone: string;
    doNots: string[];
  };

  /** 業界標準のヒアリング項目 */
  defaultHearingFields: HearingField[];

  /** よくある反論（5 個以上必須） */
  typicalObjections: TypicalObjection[];

  /** 標準的なクロージング手法 */
  defaultClosingTechnique: string;

  /** 人間転送する条件 */
  transferConditions: string[];

  /** UI でユーザが選ぶ絞り込み属性 */
  attributes: AttributeOption[];

  /**
   * Chappie の壁打ち初期コンテキストに差し込む業界ノウハウ。
   * 200-400 字程度で業界特有の事情を要約。
   */
  industryKnowledgeBrief: string;
}
