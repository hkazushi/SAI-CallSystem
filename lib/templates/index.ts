/**
 * 業界テンプレート エクスポート & ヘルパー関数
 *
 * 使い方:
 *   import { ALL_TEMPLATES, getTemplate, getTemplatesByIndustry } from '@/lib/templates'
 */

export * from './types';

import { hikariOb } from './data/hikari-ob';
import { hikariIb } from './data/hikari-ib';
import { waterOb } from './data/water-ob';
import { waterIb } from './data/water-ib';
import { insuranceOb } from './data/insurance-ob';
import { insuranceIb } from './data/insurance-ib';
import { realestateOb } from './data/realestate-ob';
import { realestateIb } from './data/realestate-ib';
import { hrOb } from './data/hr-ob';
import { hrIb } from './data/hr-ib';

import type { Template, Industry, CallDirection } from './types';

/** 全テンプレート一覧 */
export const ALL_TEMPLATES: Template[] = [
  hikariOb,
  hikariIb,
  waterOb,
  waterIb,
  insuranceOb,
  insuranceIb,
  realestateOb,
  realestateIb,
  hrOb,
  hrIb,
];

/** ID でテンプレートを取得 */
export function getTemplate(id: string): Template | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}

/** 業界でフィルタ */
export function getTemplatesByIndustry(industry: Industry): Template[] {
  return ALL_TEMPLATES.filter((t) => t.industry === industry);
}

/** 方向（OB/IB）でフィルタ */
export function getTemplatesByDirection(direction: CallDirection): Template[] {
  return ALL_TEMPLATES.filter((t) => t.direction === direction);
}

/** 業界 + 方向で一意に取得（存在しない場合は undefined） */
export function getTemplateByIndustryAndDirection(
  industry: Industry,
  direction: CallDirection,
): Template | undefined {
  return ALL_TEMPLATES.find(
    (t) => t.industry === industry && t.direction === direction,
  );
}

// 個別エクスポート（必要に応じて直接インポート可）
export {
  hikariOb,
  hikariIb,
  waterOb,
  waterIb,
  insuranceOb,
  insuranceIb,
  realestateOb,
  realestateIb,
  hrOb,
  hrIb,
};
