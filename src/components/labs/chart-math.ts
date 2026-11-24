/**
 * 검사 수치 시각화(참고치 막대·추이 그래프)용 순수 계산 함수.
 *
 * 렌더링 코드와 분리해 단위 테스트로 검증한다 (`__tests__/chart-math.test.ts`).
 * 좌표 단위는 모두 화면 좌표(dp/px)이며, y 는 아래로 갈수록 커진다.
 */
import { computeRangeScale } from '@/lib/labs';
import type { ReferenceRange } from '@/types/domain';

/* ------------------------------------------------------------------ */
/* 공통                                                                */
/* ------------------------------------------------------------------ */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 부동소수점 오차 제거 (예: 0.1 + 0.2 → 0.3) */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** 숫자의 소수점 이하 자릿수 (눈금 반올림 기준) */
function decimalsOf(value: number): number {
  const text = String(value);
  if (text.includes('e')) return 6;
  const dot = text.indexOf('.');
  return dot < 0 ? 0 : text.length - dot - 1;
}

/**
 * 글자 폭 추정 (SVG 텍스트는 그리기 전에 폭을 잴 수 없어 근사값을 쓴다).
 * 숫자·기호 위주 라벨 기준 글자당 약 0.62em.
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  return Math.ceil(text.length * fontSize * 0.62);
}

/**
 * 가운데 정렬 라벨이 컨테이너 밖으로 나가지 않도록 왼쪽 위치를 보정한다.
 * @returns 라벨의 left 좌표
 */
export function clampLabelOffset(center: number, labelWidth: number, containerWidth: number): number {
  if (labelWidth >= containerWidth) return 0;
  return clamp(center - labelWidth / 2, 0, containerWidth - labelWidth);
}

/* ------------------------------------------------------------------ */
/* 참고치 막대 (RangeBar)                                               */
/* ------------------------------------------------------------------ */

/** 정상 구간이 막대에서 최소한 차지해야 하는 비율 */
export const MIN_NORMAL_FRACTION = 0.25;

export interface RangeBarTick {
  /** 막대 위 위치 0~1 */
  position: number;
  /** 참고치 경계값 */
  value: number;
  kind: 'low' | 'high';
}

export interface RangeBarLayout {
  /** 참고치 하한·상한이 하나라도 있는지 (없으면 막대를 그리지 않는다) */
  hasRange: boolean;
  /** 정상 구간 시작·끝 위치 0~1 */
  normalStart: number;
  normalEnd: number;
  /** 측정값 위치 0~1 */
  valuePosition: number;
  /**
   * 측정값이 표시 축을 크게 벗어나 막대 끝에 고정했는지.
   * 'below' 면 왼쪽 끝, 'above' 면 오른쪽 끝에 화살표와 함께 표시한다.
   */
  overflow: 'below' | 'above' | null;
  /** 참고치 경계 눈금 (한쪽만 있는 참고치는 1개) */
  ticks: RangeBarTick[];
}

/**
 * `computeRangeScale` 과 같되, 축 폭이 0이 되지 않게 한다.
 * 하한 0만 있는 참고치(예: ≥0)에 값도 0이면 가상 상한이 0이 되어 축 폭이 0이 되므로,
 * 값보다 1 큰 가상 값을 넣어 정상 구간이 보이도록 축을 넓힌다.
 */
function rangeBarScale(value: number, range: ReferenceRange) {
  const scale = computeRangeScale(value, range);
  return scale.max > scale.min ? scale : computeRangeScale(value, range, [value + 1]);
}

/**
 * 참고치 막대 배치 계산.
 *
 * 기본은 `computeRangeScale`(정상 범위가 가운데 오도록 축을 잡고, 값이 벗어나면 축을 넓힘)을 따른다.
 * 다만 값이 너무 멀리 벗어나 정상 구간이 막대의 25% 미만으로 줄어들면
 * 축을 넓히지 않고 기본 축을 유지한 채 값을 막대 끝에 고정(overflow)한다.
 */
export function computeRangeBarLayout(value: number, range: ReferenceRange): RangeBarLayout {
  const { low, high } = range;
  if (low === undefined && high === undefined) {
    return { hasRange: false, normalStart: 0, normalEnd: 1, valuePosition: 0.5, overflow: null, ticks: [] };
  }

  const toTicks = (normalStart: number, normalEnd: number): RangeBarTick[] => {
    const ticks: RangeBarTick[] = [];
    if (low !== undefined) ticks.push({ position: normalStart, value: low, kind: 'low' });
    if (high !== undefined) ticks.push({ position: normalEnd, value: high, kind: 'high' });
    return ticks;
  };

  const natural = rangeBarScale(value, range);
  if (natural.normalEnd - natural.normalStart >= MIN_NORMAL_FRACTION) {
    return {
      hasRange: true,
      normalStart: natural.normalStart,
      normalEnd: natural.normalEnd,
      valuePosition: natural.valuePosition,
      overflow: null,
      ticks: toTicks(natural.normalStart, natural.normalEnd),
    };
  }

  // 참고치 경계값으로 기본 축을 만든 뒤, 실제 값은 그 축 기준으로 위치를 잡는다
  const inside = clamp(value, low ?? Number.NEGATIVE_INFINITY, high ?? Number.POSITIVE_INFINITY);
  const base = rangeBarScale(inside, range);
  const overflow = value < base.min ? 'below' : value > base.max ? 'above' : null;
  const valuePosition =
    overflow === 'below' ? 0 : overflow === 'above' ? 1 : (value - base.min) / (base.max - base.min);
  return {
    hasRange: true,
    normalStart: base.normalStart,
    normalEnd: base.normalEnd,
    valuePosition,
    overflow,
    ticks: toTicks(base.normalStart, base.normalEnd),
  };
}

/* ------------------------------------------------------------------ */
/* 추이 그래프 (TrendChart) — 글자 크기                                  */
/* ------------------------------------------------------------------ */

/**
 * 그래프 글자에 적용하는 기기 글자 크기 배율의 상한.
 * SVG 글자는 기기 글자 크기 설정을 자동으로 따르지 않아 직접 곱하되,
 * 너무 커지면 눈금·값 라벨이 그래프를 덮으므로 상한을 둔다.
 */
export const MAX_CHART_FONT_SCALE = 1.4;
/** 값 라벨과 측정점 사이 간격 */
export const VALUE_LABEL_OFFSET = 9;

export interface ChartTextMetrics {
  /** 글자 크기 (눈금·날짜·참고치 경계·값 라벨 공통) */
  fontSize: number;
  /** 값 라벨 상자 높이 */
  valueLabelHeight: number;
  /** 그래프 위 여백 (가장 높은 점 위 값 라벨 자리) */
  padTop: number;
  /** 그래프 아래 여백 (날짜 라벨 자리) */
  padBottom: number;
}

/**
 * 그래프 글자 크기·여백 계산.
 * @param baseFontSize 기준 글자 크기 (가장 작은 글자 토큰 `Typography.caption`)
 * @param fontScale 기기 글자 크기 배율 (`useWindowDimensions().fontScale`). 1 미만이어도 기준 크기 아래로 줄이지 않는다.
 */
export function computeChartTextMetrics(baseFontSize: number, fontScale: number): ChartTextMetrics {
  const scale = Number.isFinite(fontScale) ? clamp(fontScale, 1, MAX_CHART_FONT_SCALE) : 1;
  const fontSize = Math.round(baseFontSize * scale);
  const valueLabelHeight = fontSize + 5;
  return {
    fontSize,
    valueLabelHeight,
    padTop: valueLabelHeight + VALUE_LABEL_OFFSET,
    padBottom: fontSize + 19,
  };
}

/* ------------------------------------------------------------------ */
/* 추이 그래프 (TrendChart) — 축                                        */
/* ------------------------------------------------------------------ */

/** 눈금 간격을 1·2·5 × 10ⁿ 형태의 보기 좋은 값으로 올림 */
export function niceStep(rough: number): number {
  if (!Number.isFinite(rough) || rough <= 0) return 1;
  const exponent = Math.floor(Math.log10(rough));
  const base = 10 ** exponent;
  const fraction = rough / base;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return roundTo(nice * base, Math.max(0, -exponent));
}

export interface YAxis {
  min: number;
  max: number;
  step: number;
  /** 아래(min)부터 위(max)까지 눈금 값 */
  ticks: number[];
}

/**
 * 세로축 범위·눈금 계산.
 * 측정값과 참고치 경계를 모두 포함하고 위아래로 여유를 둔다.
 * 검사 수치는 음수가 없으므로 모든 값이 0 이상이면 축도 0 아래로 내려가지 않는다.
 */
export function computeYAxis(values: number[], range: ReferenceRange, targetTickCount = 4): YAxis {
  const bounds = [...values, range.low, range.high].filter(
    (v): v is number => v !== undefined && Number.isFinite(v),
  );
  if (bounds.length === 0) return { min: 0, max: 1, step: 1, ticks: [0, 1] };

  const dataMin = Math.min(...bounds);
  const dataMax = Math.max(...bounds);
  let lo = dataMin;
  let hi = dataMax;
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.2 || 1;
    lo -= pad;
    hi += pad;
  }
  const pad = (hi - lo) * 0.12;
  let paddedMin = lo - pad;
  const paddedMax = hi + pad;
  if (dataMin >= 0 && paddedMin < 0) paddedMin = 0;

  const step = niceStep((paddedMax - paddedMin) / Math.max(1, targetTickCount));
  const decimals = decimalsOf(step);
  const min = roundTo(Math.floor(paddedMin / step) * step, decimals);
  const max = roundTo(Math.ceil(paddedMax / step) * step, decimals);
  const ticks: number[] = [];
  const count = Math.round((max - min) / step);
  for (let i = 0; i <= count; i += 1) ticks.push(roundTo(min + step * i, decimals));
  return { min, max, step, ticks };
}

/** 값 → 좌표 선형 변환 함수 */
export function createLinearScale(
  domainMin: number,
  domainMax: number,
  rangeStart: number,
  rangeEnd: number,
): (value: number) => number {
  const span = domainMax - domainMin;
  if (span === 0) return () => (rangeStart + rangeEnd) / 2;
  return (value) => rangeStart + ((value - domainMin) / span) * (rangeEnd - rangeStart);
}

/**
 * 가로축 위치 계산 — 측정일 간격에 비례하되, 점끼리 최소 간격(minGap)을 보장한다.
 * 가까운 날짜의 점이 겹치지 않도록 앞→뒤로 밀고, 끝을 넘으면 뒤→앞으로 당긴다.
 * 최소 간격을 지킬 공간이 없거나 날짜가 모두 같으면 균등 간격으로 배치한다.
 *
 * @param timestamps 오름차순 정렬된 측정 시각(ms)
 */
export function computeXPositions(timestamps: number[], start: number, end: number, minGap: number): number[] {
  const n = timestamps.length;
  if (n === 0) return [];
  const width = end - start;
  if (n === 1) return [start + width / 2];

  const first = timestamps[0];
  const last = timestamps[n - 1];
  if (last <= first || minGap * (n - 1) >= width) {
    return timestamps.map((_, i) => start + (width * i) / (n - 1));
  }

  const xs = timestamps.map((t) => start + ((t - first) / (last - first)) * width);
  for (let i = 1; i < n; i += 1) xs[i] = Math.max(xs[i], xs[i - 1] + minGap);
  xs[n - 1] = Math.min(xs[n - 1], end);
  for (let i = n - 2; i >= 0; i -= 1) xs[i] = Math.min(xs[i], xs[i + 1] - minGap);
  return xs;
}

/**
 * 가로축 날짜 라벨 솎아내기 — 라벨이 겹치지 않는 인덱스만 고른다.
 * 가장 최근(마지막) 라벨은 항상 표시한다.
 */
export function pickSpacedIndices(xs: number[], labelWidth: number, gap = 6): number[] {
  const n = xs.length;
  if (n === 0) return [];
  const minDistance = labelWidth + gap;
  const lastIndex = n - 1;
  const picked: number[] = [];
  for (let i = 0; i < lastIndex; i += 1) {
    const prev = picked[picked.length - 1];
    const farFromPrev = prev === undefined || xs[i] - xs[prev] >= minDistance;
    const farFromLast = xs[lastIndex] - xs[i] >= minDistance;
    if (farFromPrev && farFromLast) picked.push(i);
  }
  picked.push(lastIndex);
  return picked;
}

/* ------------------------------------------------------------------ */
/* 추이 그래프 — 값 라벨 충돌 회피                                       */
/* ------------------------------------------------------------------ */

/** 값 라벨을 모두 표시하는 최대 측정 횟수 (초과하면 최근·최고·최저만) */
export const MAX_LABELED_POINTS = 8;

/**
 * 값 라벨 배치 우선순위.
 * 최근 값 → 최고값 → 최저값 → 나머지(최근 순). 측정이 많으면 앞의 세 개만.
 */
export function labelPriority(values: number[], maxLabeled = MAX_LABELED_POINTS): number[] {
  const n = values.length;
  if (n === 0) return [];
  const lastIndex = n - 1;
  let maxIndex = lastIndex;
  let minIndex = lastIndex;
  values.forEach((v, i) => {
    if (v > values[maxIndex]) maxIndex = i;
    if (v < values[minIndex]) minIndex = i;
  });
  const order = [lastIndex, maxIndex, minIndex].filter((v, i, arr) => arr.indexOf(v) === i);
  if (n > maxLabeled) return order;
  for (let i = lastIndex - 1; i >= 0; i -= 1) {
    if (!order.includes(i)) order.push(i);
  }
  return order;
}

export interface LabelAnchor {
  /** 점 좌표 */
  x: number;
  y: number;
  /** 라벨 폭 */
  width: number;
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface PlacedLabel {
  side: 'above' | 'below' | 'hidden';
  /** 라벨 가운데 x (그래프 밖으로 나가지 않게 보정됨) */
  centerX: number;
  /** 라벨 상단 y */
  top: number;
}

export interface PlaceLabelOptions {
  /** 라벨 높이 */
  height: number;
  /** 점과 라벨 사이 간격 */
  offset: number;
  /** 라벨이 들어갈 수 있는 영역 */
  bounds: Box;
  /** 배치 순서 (`labelPriority`). 지정하지 않은 점은 라벨을 숨긴다 */
  order: number[];
  /** 라벨이 다른 점을 가리지 않도록 피할 점 반지름 */
  pointRadius?: number;
}

function intersects(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/**
 * 점 위/아래에 값 라벨을 배치한다 (탐욕 알고리즘).
 * - 골짜기(이웃보다 낮은 값)는 아래, 나머지는 위를 먼저 시도한다.
 * - 이미 배치된 라벨·다른 점과 겹치거나 영역을 벗어나면 반대쪽을 시도하고, 둘 다 안 되면 숨긴다.
 */
export function placeValueLabels(anchors: LabelAnchor[], options: PlaceLabelOptions): PlacedLabel[] {
  const { height, offset, bounds, order, pointRadius = 0 } = options;
  const result: PlacedLabel[] = anchors.map((a) => ({ side: 'hidden', centerX: a.x, top: a.y }));
  const occupied: Box[] = anchors.map((a) => ({
    left: a.x - pointRadius,
    right: a.x + pointRadius,
    top: a.y - pointRadius,
    bottom: a.y + pointRadius,
  }));

  for (const index of order) {
    const anchor = anchors[index];
    if (!anchor) continue;
    const neighbors = [anchors[index - 1], anchors[index + 1]].filter((a): a is LabelAnchor => Boolean(a));
    const isValley = neighbors.length > 0 && neighbors.every((n) => n.y < anchor.y);
    const sides: ('above' | 'below')[] = isValley ? ['below', 'above'] : ['above', 'below'];

    const halfWidth = anchor.width / 2;
    const centerX =
      bounds.right - bounds.left <= anchor.width
        ? (bounds.left + bounds.right) / 2
        : clamp(anchor.x, bounds.left + halfWidth, bounds.right - halfWidth);

    for (const side of sides) {
      const top = side === 'above' ? anchor.y - offset - height : anchor.y + offset;
      const box: Box = { left: centerX - halfWidth, right: centerX + halfWidth, top, bottom: top + height };
      if (box.top < bounds.top || box.bottom > bounds.bottom) continue;
      // occupied 의 앞부분은 점 영역이다. 자기 점은 offset 만큼 떨어져 있으므로 제외한다.
      const blocked = occupied.some((other, i) => i !== index && intersects(other, box));
      if (blocked) continue;
      occupied.push(box);
      result[index] = { side, centerX, top };
      break;
    }
  }
  return result;
}

/**
 * 위·아래 두 라벨(참고치 상한·하한)이 겹치지 않도록 세로 위치를 벌린다.
 * @returns [위 라벨 y, 아래 라벨 y]
 */
export function separateLabelPair(upperY: number, lowerY: number, minGap: number): [number, number] {
  if (lowerY - upperY >= minGap) return [upperY, lowerY];
  const middle = (upperY + lowerY) / 2;
  return [middle - minGap / 2, middle + minGap / 2];
}
