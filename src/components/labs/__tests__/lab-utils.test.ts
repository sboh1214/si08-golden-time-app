import {
  attachesUnit,
  buildLabQuestionText,
  describeLabChange,
  formatLabValue,
  groupByCategory,
  prioritizeAbnormalGroups,
  rangeBarA11yLabel,
  referenceRangeText,
  speakReferenceRange,
  summarizeFlags,
  trendA11yLabel,
} from '../lab-utils';

describe('formatLabValue / attachesUnit', () => {
  it('퍼센트는 붙여 쓰고, 그 외 단위는 띄어 쓴다', () => {
    expect(formatLabValue(7.4, '%')).toBe('7.4%');
    expect(formatLabValue(0.5, '%p')).toBe('0.5%p');
    expect(formatLabValue(132, 'mg/dL')).toBe('132 mg/dL');
    expect(formatLabValue(1.234, '')).toBe('1.23');
  });

  it('붙여 쓰는 단위 판별 (큰 값 표시의 숫자·단위 간격)', () => {
    expect(attachesUnit('%')).toBe(true);
    expect(attachesUnit('%p')).toBe(true);
    expect(attachesUnit('mg/dL')).toBe(false);
    expect(attachesUnit('')).toBe(false);
  });
});

describe('referenceRangeText', () => {
  it('참고치 문구', () => {
    expect(referenceRangeText({ low: 4, high: 6, text: '4.0-6.0' }, '%')).toBe('참고치 4 ~ 6%');
    expect(referenceRangeText({ text: '음성' }, '')).toBe('참고치 음성');
    expect(referenceRangeText({ text: ' ' }, 'mg/dL')).toBe('참고치 정보가 없어요');
  });
});

describe('describeLabChange', () => {
  it('퍼센트 단위 차이는 %p 로 표시', () => {
    expect(describeLabChange(6.9, 7.4, '%')).toEqual({
      direction: 'down',
      delta: -0.5,
      text: '지난 검사보다 0.5%p 낮아졌어요',
    });
  });

  it('상승', () => {
    expect(describeLabChange(132, 125, 'mg/dL').text).toBe('지난 검사보다 7 mg/dL 높아졌어요');
  });

  it('변화 없음 (반올림 오차 포함)', () => {
    expect(describeLabChange(1.001, 1, 'mg/dL').direction).toBe('same');
    expect(describeLabChange(5, 5, 'mg/dL').text).toBe('지난 검사와 같아요');
  });
});

describe('speakReferenceRange / rangeBarA11yLabel', () => {
  it('양쪽 참고치는 물결표 대신 풀어 쓰고 단위를 함께 읽는다', () => {
    expect(speakReferenceRange({ low: 70, high: 99, text: '70-99' }, 'mg/dL')).toBe('참고치 70에서 99 mg/dL 사이');
    expect(speakReferenceRange({ low: 4, high: 6, text: '4.0-6.0' }, '%')).toBe('참고치 4에서 6% 사이');
  });

  it('한쪽 참고치는 화면 문구와 같은 미만·이하·초과·이상으로 읽는다', () => {
    const cases = [
      [{ high: 130, text: '<130' }, '참고치 130 mg/dL 미만'],
      [{ high: 100, text: '<=100' }, '참고치 100 mg/dL 이하'],
      [{ low: 40, text: '>40' }, '참고치 40 mg/dL 초과'],
      [{ low: 40, text: '≥40' }, '참고치 40 mg/dL 이상'],
    ] as const;
    for (const [range, spoken] of cases) {
      expect(speakReferenceRange(range, 'mg/dL')).toBe(spoken);
      expect(speakReferenceRange(range, 'mg/dL')).toBe(referenceRangeText(range, 'mg/dL'));
    }
  });

  it('원문 참고치·참고치 없음', () => {
    expect(speakReferenceRange({ text: '음성' }, '')).toBe('참고치 음성');
    expect(speakReferenceRange({ text: '' }, 'mg/dL')).toBe('참고치 정보가 없어요');
  });

  it('검사명·값·참고치·판정을 한 문장으로', () => {
    expect(rangeBarA11yLabel('공복혈당', 132, 'mg/dL', { low: 70, high: 99, text: '70-99' }, 'high')).toBe(
      '공복혈당 132 mg/dL, 참고치 70에서 99 mg/dL 사이, 높음',
    );
    expect(rangeBarA11yLabel('LDL 콜레스테롤', 142, 'mg/dL', { high: 130, text: '<130' }, 'high')).toBe(
      'LDL 콜레스테롤 142 mg/dL, 참고치 130 mg/dL 미만, 높음',
    );
  });
});

describe('trendA11yLabel', () => {
  const range = { low: 70, high: 99, text: '70-99' };

  it('측정이 적으면 모든 값을 읽는다', () => {
    const label = trendA11yLabel(
      '공복혈당',
      'mg/dL',
      [
        { measuredAt: '2025-12-05', value: 125, flag: 'high' },
        { measuredAt: '2026-03-12', value: 132, flag: 'high' },
      ],
      range,
    );
    expect(label).toContain('2번 측정');
    expect(label).toContain('2025.12.05 125 mg/dL 높음');
    expect(label).toContain('2026.03.12 132 mg/dL 높음');
    expect(label).toContain('참고치 70에서 99 mg/dL 사이');
  });

  it('측정이 많으면 처음·최고·최저·최근만', () => {
    const points = Array.from({ length: 10 }, (_, i) => ({
      measuredAt: `2025-${String(i + 1).padStart(2, '0')}-01`,
      value: 80 + i,
      flag: 'normal' as const,
    }));
    const label = trendA11yLabel('공복혈당', 'mg/dL', points, range);
    expect(label).toContain('최고 89 mg/dL');
    expect(label).toContain('최저 80 mg/dL');
    expect(label).not.toContain('2025.05.01');
  });

  it('기록이 없을 때', () => {
    expect(trendA11yLabel('공복혈당', 'mg/dL', [], range)).toBe('공복혈당 측정 기록이 없어요.');
  });
});

describe('buildLabQuestionText', () => {
  it('판정과 변화에 맞는 문장', () => {
    expect(buildLabQuestionText('공복혈당', 'high')).toContain('참고치보다 높게');
    expect(buildLabQuestionText('헤모글로빈', 'critical_low')).toContain('참고치보다 낮게');
    expect(buildLabQuestionText('LDL 콜레스테롤', 'normal', 'up')).toContain('지난 검사보다 높아진');
    expect(buildLabQuestionText('LDL 콜레스테롤', 'normal')).toMatch(/^LDL 콜레스테롤 수치가 .*여쭤보고 싶어요\.$/);
  });
});

describe('groupByCategory', () => {
  it('처음 등장한 순서대로 묶고 빈 분류는 기타', () => {
    const groups = groupByCategory([
      { id: 1, category: '당뇨' },
      { id: 2, category: '지질' },
      { id: 3, category: '당뇨' },
      { id: 4, category: ' ' },
    ]);
    expect(groups.map((g) => [g.category, g.items.map((i) => i.id)])).toEqual([
      ['당뇨', [1, 3]],
      ['지질', [2]],
      ['기타', [4]],
    ]);
  });
});

describe('summarizeFlags', () => {
  it('매우 높음/낮음을 높음/낮음에 포함', () => {
    expect(summarizeFlags(['normal', 'high', 'critical_high', 'low', 'critical_low', 'normal'])).toEqual({
      normal: 2,
      high: 2,
      low: 2,
    });
  });
});

describe('prioritizeAbnormalGroups', () => {
  const lab = (category: string, flag: 'normal' | 'high' | 'low') => ({ category, flag });
  it('확인 필요 항목이 있는 분류를 앞으로, 나머지 순서는 유지한다', () => {
    const groups = groupByCategory([
      lab('혈액', 'normal'),
      lab('간기능', 'normal'),
      lab('당뇨', 'high'),
      lab('지질', 'low'),
      lab('혈액', 'normal'),
    ]);
    expect(prioritizeAbnormalGroups(groups).map((g) => g.category)).toEqual(['당뇨', '지질', '혈액', '간기능']);
  });
});
