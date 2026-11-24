/**
 * 검사 수치 계산 유틸 단위 테스트 — 판정, 참고치 막대 축 계산, 표시 문구.
 */
import { Colors } from '@/constants/theme';
import type { LabFlag, ReferenceRange } from '@/types/domain';

import {
  computeFlag,
  computeRangeScale,
  describeDeviation,
  flagColor,
  flagSeverity,
  formatReferenceRange,
  isAbnormal,
} from '../labs';

const ALL_FLAGS: LabFlag[] = ['critical_low', 'low', 'normal', 'high', 'critical_high'];

describe('flagSeverity / isAbnormal', () => {
  it.each([
    ['normal', 0, false],
    ['low', 1, true],
    ['high', 1, true],
    ['critical_low', 2, true],
    ['critical_high', 2, true],
  ] as const)('%s → 심각도 %i, 이상 %s', (flag, severity, abnormal) => {
    expect(flagSeverity(flag)).toBe(severity);
    expect(isAbnormal(flag)).toBe(abnormal);
  });
});

describe('flagColor', () => {
  it.each(ALL_FLAGS)('%s 는 테마 토큰 색상을 반환한다', (flag) => {
    const tokens: string[] = Object.values(Colors);
    const { fg, bg } = flagColor(flag);
    expect(tokens).toContain(fg);
    expect(tokens).toContain(bg);
    expect(fg).not.toBe(bg);
  });

  it('정상과 이상 판정은 색이 다르고, 매우 높음은 경고색을 쓴다', () => {
    expect(flagColor('normal').fg).toBe(Colors.normal);
    expect(flagColor('high').fg).not.toBe(Colors.normal);
    expect(flagColor('low').fg).not.toBe(Colors.normal);
    expect(flagColor('critical_high').fg).toBe(Colors.critical);
  });

  it("매우 낮음은 '낮음'과 다른 경고색으로 매우 높음과 같은 강조를 쓴다", () => {
    expect(flagColor('critical_low')).not.toEqual(flagColor('low'));
    expect(flagColor('critical_low')).toEqual(flagColor('critical_high'));
  });
});

describe('계약에 없는 판정 값', () => {
  // 서버가 계약과 다른 값을 보내도 화면 렌더링 중 예외가 나지 않아야 한다
  const unknownFlag = 'H' as unknown as LabFlag;

  it('flagColor 는 중립색, flagSeverity 는 확인 필요(1)를 돌려준다', () => {
    expect(flagColor(unknownFlag)).toEqual({ fg: Colors.textSecondary, bg: Colors.surfaceMuted });
    expect(flagColor(null as unknown as LabFlag).fg).toBe(Colors.textSecondary);
    expect(flagSeverity(unknownFlag)).toBe(1);
  });
});

describe('computeFlag', () => {
  describe('양쪽 참고치 (4 ~ 6, 폭 2)', () => {
    const range: ReferenceRange = { low: 4, high: 6, text: '4-6' };

    it.each([
      [5, 'normal'],
      [4, 'normal'],
      [6, 'normal'],
      [3.9, 'low'],
      [3, 'low'],
      [2.9, 'critical_low'],
      [6.1, 'high'],
      [7, 'high'],
      [7.1, 'critical_high'],
    ] as const)('%p → %s', (value, flag) => {
      expect(computeFlag(value, range)).toBe(flag);
    });
  });

  describe('상한만 있는 참고치 (<100)', () => {
    const range: ReferenceRange = { high: 100, text: '<100' };

    it.each([
      [0, 'normal'],
      [100, 'normal'],
      [120, 'high'],
      [150, 'high'],
      [151, 'critical_high'],
    ] as const)('%p → %s', (value, flag) => {
      expect(computeFlag(value, range)).toBe(flag);
    });
  });

  describe('하한만 있는 참고치 (>40)', () => {
    const range: ReferenceRange = { low: 40, text: '>40' };

    it.each([
      [1_000, 'normal'],
      [40, 'normal'],
      [30, 'low'],
      [20, 'low'],
      [19, 'critical_low'],
    ] as const)('%p → %s', (value, flag) => {
      expect(computeFlag(value, range)).toBe(flag);
    });
  });

  it('참고치 숫자가 없으면 정상으로 본다', () => {
    expect(computeFlag(123, { text: '음성' })).toBe('normal');
  });
});

describe('computeRangeScale', () => {
  const twoSided: ReferenceRange = { low: 4, high: 6, text: '4.0-6.0' };

  function expectWithinUnit(scale: ReturnType<typeof computeRangeScale>): void {
    for (const key of ['normalStart', 'normalEnd', 'valuePosition'] as const) {
      expect(Number.isFinite(scale[key])).toBe(true);
      expect(scale[key]).toBeGreaterThanOrEqual(0);
      expect(scale[key]).toBeLessThanOrEqual(1);
    }
    expect(scale.min).toBeLessThan(scale.max);
    expect(scale.normalStart).toBeLessThanOrEqual(scale.normalEnd);
  }

  it('정상 범위를 막대 가운데에 두고 값 위치를 계산한다', () => {
    const scale = computeRangeScale(5, twoSided);
    expect(scale.min).toBeCloseTo(2.8);
    expect(scale.max).toBeCloseTo(7.2);
    expect(scale.normalStart).toBeCloseTo(1.2 / 4.4);
    expect(scale.normalEnd).toBeCloseTo(3.2 / 4.4);
    expect(scale.valuePosition).toBeCloseTo(0.5);
    expectWithinUnit(scale);
  });

  it('범위를 크게 벗어난 높은 값은 축을 넓혀 막대 안에 보이게 한다', () => {
    const scale = computeRangeScale(20, twoSided);
    expect(scale.max).toBeGreaterThan(20);
    expect(scale.valuePosition).toBeGreaterThan(scale.normalEnd);
    expect(scale.valuePosition).toBeLessThan(1);
    expectWithinUnit(scale);
  });

  it('범위를 크게 벗어난 낮은 값(음수 포함)도 막대 안에 보이게 한다', () => {
    const scale = computeRangeScale(-10, twoSided);
    expect(scale.min).toBeLessThan(-10);
    expect(scale.valuePosition).toBeGreaterThan(0);
    expect(scale.valuePosition).toBeLessThan(scale.normalStart);
    expectWithinUnit(scale);
  });

  it('하한이 0 에 가까운 양수 검사는 축이 음수로 내려가지 않는다', () => {
    const scale = computeRangeScale(1, { low: 0.5, high: 3, text: '0.5-3.0' });
    expect(scale.min).toBe(0);
    expect(scale.normalStart).toBeCloseTo(0.5 / scale.max);
    expectWithinUnit(scale);
  });

  it('상한만 있는 참고치는 0 부터 상한까지를 정상 범위로 그린다', () => {
    const scale = computeRangeScale(90, { high: 100, text: '<100' });
    expect(scale.min).toBe(0);
    expect(scale.max).toBeCloseTo(160);
    expect(scale.normalStart).toBe(0);
    expect(scale.normalEnd).toBeCloseTo(100 / 160);
    expect(scale.valuePosition).toBeCloseTo(90 / 160);
    expectWithinUnit(scale);
  });

  it('상한만 있는 참고치에서 상한 초과 값은 정상 범위 오른쪽에 표시된다', () => {
    const scale = computeRangeScale(250, { high: 100, text: '<100' });
    expect(scale.valuePosition).toBeGreaterThan(scale.normalEnd);
    expectWithinUnit(scale);
  });

  it('하한만 있는 참고치는 하한부터 막대 끝까지를 정상 범위로 그린다', () => {
    const scale = computeRangeScale(55, { low: 40, text: '>40' });
    expect(scale.normalEnd).toBe(1);
    expect(scale.normalStart).toBeCloseTo((40 - scale.min) / (scale.max - scale.min));
    expect(scale.valuePosition).toBeGreaterThan(scale.normalStart);
    expectWithinUnit(scale);
  });

  it('하한만 있는 참고치에서 하한 미만 값은 정상 범위 왼쪽에 표시된다', () => {
    const scale = computeRangeScale(25, { low: 40, text: '>40' });
    expect(scale.valuePosition).toBeLessThan(scale.normalStart);
    expectWithinUnit(scale);
  });

  it('참고치 숫자가 없으면 값을 가운데에 두고 전체를 정상 구간으로 본다', () => {
    const scale = computeRangeScale(5, { text: '음성' });
    expect(scale).toEqual({ min: 2.5, max: 7.5, normalStart: 0, normalEnd: 1, valuePosition: 0.5 });
  });

  it('추이 그래프용 추가 값(extraValues)도 모두 축 안에 들어오게 넓힌다', () => {
    const extra = [12, 1.5];
    const scale = computeRangeScale(5, twoSided, extra);
    for (const v of [5, ...extra]) {
      expect(v).toBeGreaterThanOrEqual(scale.min);
      expect(v).toBeLessThanOrEqual(scale.max);
    }
    expectWithinUnit(scale);
  });

  it.each([
    [0, { low: 0, high: 0, text: '0' }],
    [5.2, { low: 0, high: 10, text: '0-10' }],
    [0, { high: 0.5, text: '<0.5' }],
    [1e6, { low: 4, high: 6, text: '4-6' }],
    [-1e6, { low: 4, high: 6, text: '4-6' }],
  ] as const)('경계 입력(%p, %j)에서도 위치 값이 0~1 사이의 유한한 수다', (value, range) => {
    expectWithinUnit(computeRangeScale(value, range));
  });

  it('하한과 상한이 같은 참고치(예: 5-5)도 NaN 없이 계산한다', () => {
    expectWithinUnit(computeRangeScale(5, { low: 5, high: 5, text: '5' }));
  });
});

describe('formatReferenceRange', () => {
  it.each([
    [{ low: 4, high: 6, text: '4.0-6.0' }, '%', '4 ~ 6%'],
    [{ low: 4, high: 6, text: '4.0-6.0' }, undefined, '4 ~ 6'],
    [{ high: 100, text: '<100' }, 'mg/dL', '100 mg/dL 미만'],
    [{ high: 100, text: '<= 100' }, 'mg/dL', '100 mg/dL 이하'],
    [{ high: 100, text: '0-100' }, 'mg/dL', '100 mg/dL 이하'],
    [{ low: 40, text: '>40' }, 'mg/dL', '40 mg/dL 초과'],
    [{ low: 60, text: '≥60' }, 'mL/min/1.73m²', '60 mL/min/1.73m² 이상'],
    [{ low: 0, text: '>=0' }, undefined, '0 이상'],
    [{ text: '음성' }, 'mg/dL', '음성'],
    [{ low: 0.30000000000000004, high: 1.2, text: '0.3-1.2' }, 'mg/dL', '0.3 ~ 1.2 mg/dL'],
  ] as const)('%j (%p) → %p', (range, unit, expected) => {
    expect(formatReferenceRange(range, unit)).toBe(expected);
  });

  it('원문 표기(text)가 빠진 응답도 예외 없이 표시한다', () => {
    const missingText = { high: 100 } as unknown as ReferenceRange;
    expect(formatReferenceRange(missingText, 'mg/dL')).toBe('100 mg/dL 이하');
    expect(formatReferenceRange({} as unknown as ReferenceRange)).toBe('');
  });
});

describe('describeDeviation', () => {
  const range: ReferenceRange = { low: 4, high: 6, text: '4-6' };

  it('상한 초과 정도를 소수 둘째 자리까지 알려준다 (퍼센트 차이는 %p)', () => {
    expect(describeDeviation(7.4, range, '%')).toBe('기준 상한보다 1.4%p 높아요');
    expect(describeDeviation(6.123, range)).toBe('기준 상한보다 0.12 높아요');
  });

  it('하한 미만 정도를 알려준다', () => {
    expect(describeDeviation(3.2, range, '%')).toBe('기준 하한보다 0.8%p 낮아요');
  });

  it('범위 안이면 null', () => {
    expect(describeDeviation(4, range)).toBeNull();
    expect(describeDeviation(6, range)).toBeNull();
  });

  it('한쪽 참고치만 있으면 그쪽만 판단한다', () => {
    expect(describeDeviation(120, { high: 100, text: '<100' }, 'mg/dL')).toBe(
      '기준 상한보다 20 mg/dL 높아요',
    );
    expect(describeDeviation(-5, { high: 100, text: '<100' })).toBeNull();
    expect(describeDeviation(30, { low: 40, text: '>40' })).toBe('기준 하한보다 10 낮아요');
  });

  it('참고치 숫자가 없으면 null', () => {
    expect(describeDeviation(1, { text: '음성' })).toBeNull();
  });
});
