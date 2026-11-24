/**
 * 검사 수치 화면 공용 순수 함수 — 표시 문구·스크린 리더 문구·그룹핑.
 * 단위 테스트: `__tests__/lab-utils.test.ts`
 */
import { formatDate, formatNumber } from '@/lib/format';
import { LAB_FLAG_LABEL } from '@/lib/labels';
import { formatReferenceRange, withUnit } from '@/lib/labs';
import type { LabFlag, LabTrendPoint, ReferenceRange } from '@/types/domain';

/* ------------------------------------------------------------------ */
/* 표시 문구                                                            */
/* ------------------------------------------------------------------ */

/** 검사 항목 행을 눌렀을 때의 스크린리더 안내 — 항목별 '수치 변화' 화면으로 이동하는 모든 행 공통 */
export const LAB_TREND_HINT = '수치 변화를 그래프로 보여줘요';

/** 숫자에 띄어 쓰지 않고 붙여 쓰는 단위인지 ('%', '%p' → '7.4%') — `withUnit` 과 같은 규칙 */
export function attachesUnit(unit: string): boolean {
  return unit.startsWith('%');
}

/** 값 + 단위 표시 ('7.4%', '132 mg/dL') */
export function formatLabValue(value: number, unit: string): string {
  return withUnit(formatNumber(value), unit);
}

/** 참고치 표시 문구 ('참고치 70 ~ 99 mg/dL') — 결과지에 참고치가 없으면 안내 문구 */
export function referenceRangeText(range: ReferenceRange, unit: string): string {
  const hasBound = range.low !== undefined || range.high !== undefined;
  if (!hasBound && !range.text.trim()) return '참고치 정보가 없어요';
  return `참고치 ${formatReferenceRange(range, unit)}`;
}

/**
 * 참고치 스크린 리더용 문구 ('참고치 70에서 99 mg/dL 사이', '참고치 130 mg/dL 미만').
 * 양쪽 참고치는 물결표(~)를 읽지 않도록 풀어 쓰고,
 * 한쪽 참고치(미만·이하·초과·이상)와 원문 참고치는 화면 문구(`referenceRangeText`)와 똑같이 읽는다.
 */
export function speakReferenceRange(range: ReferenceRange, unit: string): string {
  if (range.low !== undefined && range.high !== undefined) {
    return `참고치 ${withUnit(`${formatNumber(range.low)}에서 ${formatNumber(range.high)}`, unit)} 사이`;
  }
  return referenceRangeText(range, unit);
}

/** 참고치 막대의 스크린 리더 문구 (예: '공복혈당 132 mg/dL, 참고치 70에서 99 mg/dL 사이, 높음') */
export function rangeBarA11yLabel(
  name: string,
  value: number,
  unit: string,
  range: ReferenceRange,
  flag: LabFlag,
): string {
  return `${name} ${formatLabValue(value, unit)}, ${speakReferenceRange(range, unit)}, ${LAB_FLAG_LABEL[flag]}`;
}

/** 추이 그래프의 스크린 리더 요약 (측정이 많으면 처음·최고·최저·최근만) */
export function trendA11yLabel(
  name: string,
  unit: string,
  points: Pick<LabTrendPoint, 'measuredAt' | 'value' | 'flag'>[],
  range: ReferenceRange,
  maxListed = 8,
): string {
  if (points.length === 0) return `${name} 측정 기록이 없어요.`;
  const describe = (p: (typeof points)[number]) =>
    `${formatDate(p.measuredAt)} ${formatLabValue(p.value, unit)} ${LAB_FLAG_LABEL[p.flag]}`;
  const head = `${name} 수치 변화 그래프. ${points.length}번 측정.`;
  let body: string;
  if (points.length <= maxListed) {
    body = points.map(describe).join(', ');
  } else {
    const values = points.map((p) => p.value);
    const last = points[points.length - 1];
    body = [
      `처음 ${describe(points[0])}`,
      `최고 ${formatLabValue(Math.max(...values), unit)}`,
      `최저 ${formatLabValue(Math.min(...values), unit)}`,
      `최근 ${describe(last)}`,
    ].join(', ');
  }
  return `${head} ${body}. ${speakReferenceRange(range, unit)}.`;
}

/* ------------------------------------------------------------------ */
/* 지난 검사 대비 변화                                                   */
/* ------------------------------------------------------------------ */

export type ChangeDirection = 'up' | 'down' | 'same';

export interface LabChange {
  direction: ChangeDirection;
  /** 현재 - 이전 (소수 둘째 자리 반올림) */
  delta: number;
  /** 화면 문구 — 좋다/나쁘다 판단 없이 중립적으로 표현 */
  text: string;
}

/** 지난 검사 대비 변화 (예: '지난 검사보다 0.5%p 낮아졌어요') */
export function describeLabChange(current: number, previous: number, unit: string): LabChange {
  const delta = Math.round((current - previous) * 100) / 100;
  if (delta === 0) return { direction: 'same', delta: 0, text: '지난 검사와 같아요' };
  // 퍼센트 단위의 차이는 퍼센트포인트(%p)로 표기
  const amount = formatLabValue(Math.abs(delta), unit === '%' ? '%p' : unit);
  return delta > 0
    ? { direction: 'up', delta, text: `지난 검사보다 ${amount} 높아졌어요` }
    : { direction: 'down', delta, text: `지난 검사보다 ${amount} 낮아졌어요` };
}

/* ------------------------------------------------------------------ */
/* 질문 리스트 연동                                                      */
/* ------------------------------------------------------------------ */

/**
 * '이 검사에 대해 질문 추가' 기본 문구.
 * 판정과 최근 변화에 맞춰 진료 때 바로 읽을 수 있는 문장을 만든다 (사용자가 수정 가능).
 */
export function buildLabQuestionText(name: string, flag: LabFlag, change?: ChangeDirection): string {
  switch (flag) {
    case 'high':
    case 'critical_high':
      return `${name} 수치가 참고치보다 높게 나온 이유와 관리 방법에 대해 여쭤보고 싶어요.`;
    case 'low':
    case 'critical_low':
      return `${name} 수치가 참고치보다 낮게 나온 이유와 관리 방법에 대해 여쭤보고 싶어요.`;
    case 'normal':
      if (change === 'up') return `${name} 수치가 지난 검사보다 높아진 것에 대해 여쭤보고 싶어요.`;
      if (change === 'down') return `${name} 수치가 지난 검사보다 낮아진 것에 대해 여쭤보고 싶어요.`;
      return `${name} 수치가 지금처럼 유지되려면 무엇을 신경 쓰면 좋을지에 대해 여쭤보고 싶어요.`;
  }
}

/* ------------------------------------------------------------------ */
/* 그룹핑·집계                                                          */
/* ------------------------------------------------------------------ */

export interface CategoryGroup<T> {
  category: string;
  items: T[];
}

/** 검사 분류별로 묶기 (처음 등장한 순서 유지 — 결과지 원래 순서를 따른다) */
export function groupByCategory<T extends { category: string }>(items: T[]): CategoryGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const category = item.category.trim() || '기타';
    const list = groups.get(category);
    if (list) list.push(item);
    else groups.set(category, [item]);
  }
  return [...groups.entries()].map(([category, list]) => ({ category, items: list }));
}

/**
 * 확인이 필요한 항목이 있는 분류를 앞으로 (분류 안 순서와 분류끼리의 원래 순서는 유지).
 * 환자가 화면을 열자마자 참고치를 벗어난 결과부터 보게 한다.
 */
export function prioritizeAbnormalGroups<T extends { flag: LabFlag }>(groups: CategoryGroup<T>[]): CategoryGroup<T>[] {
  const hasAbnormal = (g: CategoryGroup<T>) => g.items.some((item) => item.flag !== 'normal');
  return [...groups.filter(hasAbnormal), ...groups.filter((g) => !hasAbnormal(g))];
}

export interface FlagSummary {
  normal: number;
  /** 높음 + 매우 높음 */
  high: number;
  /** 낮음 + 매우 낮음 */
  low: number;
}

/** 판정별 개수 (정상·높음·낮음) */
export function summarizeFlags(flags: LabFlag[]): FlagSummary {
  return flags.reduce<FlagSummary>(
    (acc, flag) => {
      if (flag === 'normal') acc.normal += 1;
      else if (flag === 'high' || flag === 'critical_high') acc.high += 1;
      else acc.low += 1;
      return acc;
    },
    { normal: 0, high: 0, low: 0 },
  );
}
