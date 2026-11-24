/**
 * 검사 수치 계산 유틸 — 참고치 대비 위치·판정·색상.
 */
import { Colors } from '@/constants/theme';
import type { LabFlag, ReferenceRange } from '@/types/domain';

import { formatNumber } from './format';

/*
 * 판정 함수는 계약에 없는 값(서버 오류로 온 'H', null 등)에도 값을 돌려준다 —
 * 화면 렌더링 중 undefined 접근으로 앱 전체가 종료되지 않게 하기 위함.
 */

/** 판정 심각도 (정렬·최악값 계산용). 알 수 없는 판정은 '확인 필요'(1)로 본다 */
export function flagSeverity(flag: LabFlag): number {
  switch (flag) {
    case 'normal':
      return 0;
    case 'critical_low':
    case 'critical_high':
      return 2;
    default:
      return 1;
  }
}

export function isAbnormal(flag: LabFlag): boolean {
  return flag !== 'normal';
}

/** 판정별 글자·배경색. '매우 낮음'·'매우 높음'은 방향과 관계없이 위험색으로 '낮음'·'높음'과 구분한다 */
export function flagColor(flag: LabFlag): { fg: string; bg: string } {
  switch (flag) {
    case 'normal':
      return { fg: Colors.normal, bg: Colors.normalSoft };
    case 'low':
      return { fg: Colors.low, bg: Colors.lowSoft };
    case 'high':
      return { fg: Colors.high, bg: Colors.highSoft };
    case 'critical_low':
    case 'critical_high':
      return { fg: Colors.critical, bg: Colors.dangerSoft };
    default:
      return { fg: Colors.textSecondary, bg: Colors.surfaceMuted };
  }
}

/** 값과 참고치로 판정 계산 (서버 flag 가 없을 때 보조용) */
export function computeFlag(value: number, range: ReferenceRange): LabFlag {
  const { low, high } = range;
  if (low !== undefined && value < low) {
    const span = high !== undefined ? high - low : Math.abs(low);
    return value < low - span * 0.5 ? 'critical_low' : 'low';
  }
  if (high !== undefined && value > high) {
    const span = low !== undefined ? high - low : Math.abs(high);
    return value > high + span * 0.5 ? 'critical_high' : 'high';
  }
  return 'normal';
}

export interface RangeScale {
  /** 표시 축 최소값 */
  min: number;
  /** 표시 축 최대값 */
  max: number;
  /** 정상 범위 시작 위치 0~1 */
  normalStart: number;
  /** 정상 범위 끝 위치 0~1 */
  normalEnd: number;
  /** 값 위치 0~1 (축 밖이면 0 또는 1로 고정) */
  valuePosition: number;
}

/**
 * 참고치 막대 시각화용 축 계산.
 * 정상 범위가 막대의 가운데 구간(약 1/3~2/3)에 오도록 여유를 두고,
 * 측정값이 범위를 크게 벗어나면 축을 넓힌다.
 */
export function computeRangeScale(value: number, range: ReferenceRange, extraValues: number[] = []): RangeScale {
  const values = [value, ...extraValues];
  let low = range.low;
  let high = range.high;

  if (low === undefined && high === undefined) {
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = Math.max(1, (hi - lo) * 0.5 || Math.abs(hi) * 0.5);
    return { min: lo - pad, max: hi + pad, normalStart: 0, normalEnd: 1, valuePosition: 0.5 };
  }

  // 한쪽만 있는 참고치(예: <100, >40)는 반대쪽을 가상으로 만든다
  if (low === undefined && high !== undefined) low = Math.min(0, ...values);
  if (high === undefined && low !== undefined) high = Math.max(low * 2, ...values.map((v) => v * 1.1));

  const lo = low as number;
  const hi = high as number;
  // 하한 = 상한인 참고치(예: 5-5)는 폭이 0이 되므로 값 크기에 비례한 가상 폭을 쓴다
  const span = hi - lo > 0 ? hi - lo : Math.max(Math.abs(hi) * 0.2, 1);
  let min = range.low === undefined ? lo : lo - span * 0.6;
  let max = range.high === undefined ? hi : hi + span * 0.6;
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  if (vMin < min) min = vMin - span * 0.15;
  if (vMax > max) max = vMax + span * 0.15;
  if (range.low !== undefined && min < 0 && lo >= 0 && vMin >= 0) min = 0;

  const total = max - min || 1;
  const pos = (v: number) => Math.min(1, Math.max(0, (v - min) / total));
  return {
    min,
    max,
    normalStart: pos(lo),
    normalEnd: pos(hi),
    valuePosition: pos(value),
  };
}

/** 숫자 + 단위 ('%' 는 붙여 쓰고 나머지는 띄어 쓴다: "7.4%", "132 mg/dL") */
export function withUnit(text: string, unit?: string): string {
  if (!unit) return text;
  return unit.startsWith('%') ? `${text}${unit}` : `${text} ${unit}`;
}

/**
 * 참고치 사람이 읽기 쉬운 문구 (예: "4 ~ 6%", "100 mg/dL 미만", "40 mg/dL 이상").
 * 한쪽 참고치는 결과지 원문 표기(`<`, `<=`, `>`, `>=`)에 맞춰 미만/이하/초과/이상을 고른다.
 */
export function formatReferenceRange(range: ReferenceRange, unit?: string): string {
  const original = range.text ?? '';
  const text = original.replace(/\s/g, '');
  if (range.low !== undefined && range.high !== undefined) {
    return withUnit(`${formatNumber(range.low)} ~ ${formatNumber(range.high)}`, unit);
  }
  if (range.high !== undefined) {
    const strict = /^<(?!=)/.test(text);
    return `${withUnit(formatNumber(range.high), unit)} ${strict ? '미만' : '이하'}`;
  }
  if (range.low !== undefined) {
    const strict = /^>(?!=)/.test(text);
    return `${withUnit(formatNumber(range.low), unit)} ${strict ? '초과' : '이상'}`;
  }
  return original;
}

/**
 * 참고치에서 얼마나 벗어났는지 문구 (예: "기준 상한보다 33 mg/dL 높아요").
 * 퍼센트 단위의 차이는 퍼센트포인트(%p)로 표기한다 — 검사 추이 화면의 '지난 검사 대비' 문구와 같은 규칙.
 */
export function describeDeviation(value: number, range: ReferenceRange, unit = ''): string | null {
  const diffUnit = unit === '%' ? '%p' : unit;
  if (range.high !== undefined && value > range.high) {
    return `기준 상한보다 ${withUnit(formatNumber(value - range.high), diffUnit)} 높아요`;
  }
  if (range.low !== undefined && value < range.low) {
    return `기준 하한보다 ${withUnit(formatNumber(range.low - value), diffUnit)} 낮아요`;
  }
  return null;
}
