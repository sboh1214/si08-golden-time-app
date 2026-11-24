import {
  clampLabelOffset,
  computeChartTextMetrics,
  computeRangeBarLayout,
  computeXPositions,
  computeYAxis,
  createLinearScale,
  estimateTextWidth,
  labelPriority,
  MAX_CHART_FONT_SCALE,
  MIN_NORMAL_FRACTION,
  niceStep,
  pickSpacedIndices,
  placeValueLabels,
  roundTo,
  separateLabelPair,
  VALUE_LABEL_OFFSET,
  type Box,
} from '../chart-math';

describe('niceStep', () => {
  it.each([
    [0.3, 0.5],
    [1, 1],
    [1.2, 2],
    [7, 10],
    [12, 20],
    [23, 50],
    [0.012, 0.02],
  ])('%p → %p', (rough, expected) => {
    expect(niceStep(rough)).toBe(expected);
  });

  it('잘못된 입력은 1', () => {
    expect(niceStep(0)).toBe(1);
    expect(niceStep(-3)).toBe(1);
    expect(niceStep(Number.NaN)).toBe(1);
  });
});

describe('computeYAxis', () => {
  it('측정값과 참고치를 모두 포함하는 보기 좋은 눈금을 만든다', () => {
    const axis = computeYAxis([118, 125, 132], { low: 70, high: 99, text: '70-99' });
    expect(axis).toEqual({ min: 60, max: 140, step: 20, ticks: [60, 80, 100, 120, 140] });
  });

  it('소수 단위 검사 (당화혈색소)', () => {
    const axis = computeYAxis([6.8, 7.1, 7.4], { low: 4, high: 6, text: '4.0-6.0' });
    expect(axis.min).toBeLessThanOrEqual(4);
    expect(axis.max).toBeGreaterThanOrEqual(7.4);
    expect(axis.ticks[0]).toBe(axis.min);
    expect(axis.ticks[axis.ticks.length - 1]).toBe(axis.max);
  });

  it('부동소수점 오차 없는 눈금', () => {
    const axis = computeYAxis([0.7, 0.9, 1.1], { low: 0.5, high: 1.2, text: '0.5-1.2' });
    for (const tick of axis.ticks) expect(tick).toBe(roundTo(tick, 4));
  });

  it('값이 모두 0 이상이면 축이 음수로 내려가지 않는다', () => {
    const axis = computeYAxis([2, 3], { high: 100, text: '<100' });
    expect(axis.min).toBe(0);
    expect(axis.max).toBeGreaterThanOrEqual(100);
  });

  it('값이 하나뿐이고 참고치가 없어도 범위가 생긴다', () => {
    const axis = computeYAxis([50], { text: '' });
    expect(axis.min).toBeLessThan(50);
    expect(axis.max).toBeGreaterThan(50);
    expect(axis.ticks.length).toBeGreaterThanOrEqual(2);
  });

  it('값이 없으면 기본 축', () => {
    expect(computeYAxis([], { text: '' }).ticks).toEqual([0, 1]);
  });
});

describe('createLinearScale', () => {
  it('도메인을 화면 좌표로 변환 (y 는 뒤집힘)', () => {
    const y = createLinearScale(0, 100, 200, 0);
    expect(y(0)).toBe(200);
    expect(y(100)).toBe(0);
    expect(y(25)).toBe(150);
  });

  it('도메인 폭이 0이면 가운데', () => {
    expect(createLinearScale(5, 5, 0, 100)(5)).toBe(50);
  });
});

describe('computeXPositions', () => {
  const day = 24 * 60 * 60 * 1000;

  it('점이 하나면 가운데', () => {
    expect(computeXPositions([0], 0, 200, 20)).toEqual([100]);
  });

  it('날짜 간격에 비례해 배치', () => {
    expect(computeXPositions([0, 10 * day, 40 * day], 0, 400, 10)).toEqual([0, 100, 400]);
  });

  it('가까운 날짜도 최소 간격을 지키고 영역 안에 머문다', () => {
    const xs = computeXPositions([0, 1 * day, 2 * day, 100 * day], 0, 300, 40);
    for (let i = 1; i < xs.length; i += 1) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(40 - 1e-9);
    expect(xs[0]).toBeGreaterThanOrEqual(0);
    expect(xs[xs.length - 1]).toBeLessThanOrEqual(300);
  });

  it('마지막 점들이 몰려 있으면 앞쪽으로 당겨온다', () => {
    const xs = computeXPositions([0, 98 * day, 99 * day, 100 * day], 0, 300, 40);
    expect(xs[3]).toBe(300);
    expect(xs[2]).toBe(260);
    expect(xs[1]).toBe(220);
    expect(xs[0]).toBe(0);
  });

  it('공간이 부족하거나 날짜가 같으면 균등 배치', () => {
    expect(computeXPositions([0, day, 2 * day], 0, 60, 40)).toEqual([0, 30, 60]);
    expect(computeXPositions([5, 5, 5], 0, 100, 10)).toEqual([0, 50, 100]);
  });
});

describe('pickSpacedIndices', () => {
  it('겹치지 않는 라벨만 고르고 마지막은 항상 포함', () => {
    expect(pickSpacedIndices([0, 10, 50, 60, 100], 30, 0)).toEqual([0, 2, 4]);
  });

  it('모두 충분히 떨어져 있으면 전부', () => {
    expect(pickSpacedIndices([0, 100, 200], 40)).toEqual([0, 1, 2]);
  });

  it('빈 배열', () => {
    expect(pickSpacedIndices([], 40)).toEqual([]);
  });
});

describe('labelPriority', () => {
  it('최근 → 최고 → 최저 → 나머지(최근 순)', () => {
    expect(labelPriority([5, 9, 1, 4, 6])).toEqual([4, 1, 2, 3, 0]);
  });

  it('측정이 많으면 최근·최고·최저만', () => {
    const values = [3, 4, 5, 6, 7, 8, 9, 10, 1, 2];
    expect(labelPriority(values, 8)).toEqual([9, 7, 8]);
  });

  it('최근 값이 최고값이면 중복 없이', () => {
    expect(labelPriority([1, 2, 3])).toEqual([2, 0, 1]);
  });
});

describe('placeValueLabels', () => {
  const bounds: Box = { left: 0, right: 300, top: 0, bottom: 200 };
  const base = { height: 14, offset: 8, bounds, pointRadius: 5 };

  it('기본은 점 위에 배치', () => {
    const anchors = [
      { x: 50, y: 100, width: 24 },
      { x: 150, y: 100, width: 24 },
    ];
    const placed = placeValueLabels(anchors, { ...base, order: [1, 0] });
    expect(placed.map((p) => p.side)).toEqual(['above', 'above']);
    expect(placed[1].top).toBe(100 - 8 - 14);
  });

  it('양 끝 점도 이웃보다 낮으면 아래에 배치 (선에서 멀어지도록)', () => {
    const anchors = [
      { x: 50, y: 120, width: 24 },
      { x: 150, y: 80, width: 24 },
    ];
    const placed = placeValueLabels(anchors, { ...base, order: [1, 0] });
    expect(placed.map((p) => p.side)).toEqual(['below', 'above']);
  });

  it('골짜기 점은 아래에 배치', () => {
    const anchors = [
      { x: 50, y: 50, width: 24 },
      { x: 150, y: 150, width: 24 },
      { x: 250, y: 50, width: 24 },
    ];
    const placed = placeValueLabels(anchors, { ...base, order: [2, 0, 1] });
    expect(placed[1].side).toBe('below');
  });

  it('위쪽 공간이 없으면 아래로', () => {
    const placed = placeValueLabels([{ x: 100, y: 10, width: 24 }], { ...base, order: [0] });
    expect(placed[0].side).toBe('below');
  });

  it('겹치는 라벨은 반대쪽으로 옮기고, 둘 다 막히면 숨긴다', () => {
    const anchors = [
      { x: 100, y: 100, width: 40 },
      { x: 110, y: 100, width: 40 },
      { x: 120, y: 100, width: 40 },
    ];
    const placed = placeValueLabels(anchors, { ...base, order: [2, 1, 0] });
    expect(placed[2].side).toBe('above');
    expect(placed[1].side).toBe('below');
    expect(placed[0].side).toBe('hidden');
  });

  it('order 에 없는 점은 라벨을 숨긴다', () => {
    const placed = placeValueLabels([{ x: 100, y: 100, width: 20 }], { ...base, order: [] });
    expect(placed[0].side).toBe('hidden');
  });

  it('가장자리 라벨은 영역 안으로 보정', () => {
    const placed = placeValueLabels([{ x: 2, y: 100, width: 40 }], { ...base, order: [0] });
    expect(placed[0].centerX).toBe(20);
  });

  it('배치된 라벨끼리 겹치지 않는다 (8개 점, 촘촘한 지그재그)', () => {
    const anchors = Array.from({ length: 8 }, (_, i) => ({ x: 20 + i * 30, y: i % 2 ? 90 : 110, width: 34 }));
    const placed = placeValueLabels(anchors, { ...base, order: labelPriority(anchors.map((a) => -a.y)) });
    // 라벨 폭 34 → 가운데 기준 ±17
    const boxes = placed
      .filter((p) => p.side !== 'hidden')
      .map((p) => ({ left: p.centerX - 17, right: p.centerX + 17, top: p.top, bottom: p.top + 14 }));
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const overlap = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        expect(overlap).toBe(false);
      }
    }
    expect(placed[7].side).not.toBe('hidden');
  });
});

describe('separateLabelPair', () => {
  it('충분히 떨어져 있으면 그대로', () => {
    expect(separateLabelPair(10, 50, 14)).toEqual([10, 50]);
  });

  it('가까우면 가운데 기준으로 벌린다', () => {
    expect(separateLabelPair(40, 46, 14)).toEqual([36, 50]);
  });
});

describe('clampLabelOffset / estimateTextWidth', () => {
  it('라벨이 컨테이너 밖으로 나가지 않는다', () => {
    expect(clampLabelOffset(5, 30, 200)).toBe(0);
    expect(clampLabelOffset(100, 30, 200)).toBe(85);
    expect(clampLabelOffset(198, 30, 200)).toBe(170);
    expect(clampLabelOffset(50, 300, 200)).toBe(0);
  });

  it('글자 수에 비례', () => {
    expect(estimateTextWidth('132', 12)).toBeGreaterThan(estimateTextWidth('7', 12));
  });
});

describe('computeRangeBarLayout', () => {
  it('참고치가 없으면 막대 없음', () => {
    expect(computeRangeBarLayout(10, { text: '' }).hasRange).toBe(false);
  });

  it('양쪽 참고치: 정상 범위 안의 값', () => {
    const layout = computeRangeBarLayout(85, { low: 70, high: 99, text: '70-99' });
    expect(layout.overflow).toBeNull();
    expect(layout.valuePosition).toBeGreaterThan(layout.normalStart);
    expect(layout.valuePosition).toBeLessThan(layout.normalEnd);
    expect(layout.ticks.map((t) => [t.kind, t.value])).toEqual([
      ['low', 70],
      ['high', 99],
    ]);
  });

  it('조금 높은 값은 축을 넓혀 실제 위치에 표시', () => {
    const layout = computeRangeBarLayout(132, { low: 70, high: 99, text: '70-99' });
    expect(layout.overflow).toBeNull();
    expect(layout.valuePosition).toBeGreaterThan(layout.normalEnd);
    expect(layout.valuePosition).toBeLessThanOrEqual(1);
  });

  it('아주 높은 값은 오른쪽 끝에 고정하고 정상 구간 폭을 유지', () => {
    const layout = computeRangeBarLayout(450, { low: 70, high: 99, text: '70-99' });
    expect(layout.overflow).toBe('above');
    expect(layout.valuePosition).toBe(1);
    expect(layout.normalEnd - layout.normalStart).toBeGreaterThanOrEqual(MIN_NORMAL_FRACTION);
  });

  it('아주 낮은 값은 왼쪽 끝에 고정', () => {
    const layout = computeRangeBarLayout(3, { low: 13, high: 17, text: '13-17' });
    expect(layout.overflow).toBe('below');
    expect(layout.valuePosition).toBe(0);
  });

  it('상한만 있는 참고치 (<100): 정상 구간이 왼쪽 끝부터', () => {
    const layout = computeRangeBarLayout(130, { high: 100, text: '<100' });
    expect(layout.normalStart).toBe(0);
    expect(layout.ticks).toHaveLength(1);
    expect(layout.ticks[0].kind).toBe('high');
    expect(layout.valuePosition).toBeGreaterThan(layout.normalEnd);
  });

  it('하한만 있는 참고치 (>40): 정상 구간이 오른쪽 끝까지', () => {
    const layout = computeRangeBarLayout(35, { low: 40, text: '>40' });
    expect(layout.normalEnd).toBe(1);
    expect(layout.ticks).toEqual([expect.objectContaining({ kind: 'low', value: 40 })]);
    expect(layout.valuePosition).toBeLessThan(layout.normalStart);
  });

  it('하한 0만 있는 참고치에 값도 0이면 축 폭이 0이 되지 않는다 (NaN 방지)', () => {
    const layout = computeRangeBarLayout(0, { low: 0, text: '>=0' });
    expect(layout.valuePosition).toBe(0);
    expect(layout.normalStart).toBe(0);
    expect(layout.normalEnd).toBe(1);
    expect(layout.overflow).toBeNull();
  });

  it('어떤 참고치·값 조합에서도 위치는 0~1 사이의 유한한 값', () => {
    const bounds = [undefined, 0, 0.5, 1, 4, 40, 100];
    const values = [0, 0.1, 0.5, 1, 3, 10, 50, 100, 1000];
    for (const low of bounds) {
      for (const high of bounds) {
        if (low !== undefined && high !== undefined && high < low) continue;
        for (const value of values) {
          const layout = computeRangeBarLayout(value, { low, high, text: '' });
          for (const position of [layout.normalStart, layout.normalEnd, layout.valuePosition]) {
            expect(Number.isFinite(position)).toBe(true);
            expect(position).toBeGreaterThanOrEqual(0);
            expect(position).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });
});

describe('computeChartTextMetrics', () => {
  it('기본 글자 크기는 caption 크기 그대로, 여백은 글자 크기에 맞춘다', () => {
    expect(computeChartTextMetrics(13, 1)).toEqual({
      fontSize: 13,
      valueLabelHeight: 18,
      padTop: 18 + VALUE_LABEL_OFFSET,
      padBottom: 32,
    });
  });

  it('기기 글자 크기 설정을 따르되 상한을 둔다', () => {
    expect(computeChartTextMetrics(13, 1.2).fontSize).toBe(16);
    expect(computeChartTextMetrics(13, 3).fontSize).toBe(Math.round(13 * MAX_CHART_FONT_SCALE));
  });

  it('기기 글자 크기를 줄여도 caption 크기 아래로 내려가지 않는다', () => {
    expect(computeChartTextMetrics(13, 0.8).fontSize).toBe(13);
    expect(computeChartTextMetrics(13, Number.NaN).fontSize).toBe(13);
  });
});
