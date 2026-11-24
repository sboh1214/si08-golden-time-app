import { fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';

import { Typography } from '@/constants/theme';
import type { LabResult, LabTrendPoint } from '@/types/domain';

import { computeChartTextMetrics } from '../chart-math';
import { LabResultCard } from '../lab-result-card';
import { RangeBar } from '../range-bar';
import { TrendChart } from '../trend-chart';

const glucose: LabResult = {
  id: 'lab_1',
  code: 'GLU',
  name: '공복혈당',
  originalName: 'Glucose (FBS)',
  category: '당뇨',
  value: 132,
  unit: 'mg/dL',
  referenceRange: { low: 70, high: 99, text: '70-99' },
  flag: 'high',
  measuredAt: '2026-03-12',
  plainExplanation: '8시간 이상 굶은 뒤 잰 혈당이에요.',
  sentenceIds: [],
};

const points: LabTrendPoint[] = [
  { documentId: 'd1', labResultId: 'l1', measuredAt: '2025-09-10', value: 118, flag: 'high' },
  { documentId: 'd2', labResultId: 'l2', measuredAt: '2025-12-05', value: 96, flag: 'normal' },
  { documentId: 'd3', labResultId: 'l3', measuredAt: '2026-03-12', value: 132, flag: 'high' },
];

describe('RangeBar', () => {
  it('스크린 리더 문구에 검사명·값·참고치·판정을 담는다', async () => {
    await render(<RangeBar name="공복혈당" value={132} unit="mg/dL" range={glucose.referenceRange} flag="high" />);
    expect(screen.getByLabelText('공복혈당 132 mg/dL, 참고치 70에서 99 mg/dL 사이, 높음')).toBeTruthy();
  });

  it('폭을 잰 뒤 값과 참고치 경계 눈금을 표시한다', async () => {
    await render(<RangeBar name="공복혈당" value={132} unit="mg/dL" range={glucose.referenceRange} flag="high" />);
    await fireEvent.layout(screen.getByRole('image'), { width: 300 });
    expect(screen.getByText('132')).toBeTruthy();
    expect(screen.getByText('70')).toBeTruthy();
    expect(screen.getByText('99')).toBeTruthy();
  });

  it('참고치가 없으면 그리지 않는다', async () => {
    await render(<RangeBar name="소변 단백" value={1} unit="" range={{ text: '' }} flag="normal" />);
    expect(screen.queryByRole('image')).toBeNull();
  });
});

describe('LabResultCard', () => {
  it('검사명·원어·판정·벗어난 정도·해설을 보여주고 수치 변화 보기를 누를 수 있다', async () => {
    const onPressTrend = jest.fn();
    await render(<LabResultCard lab={glucose} onPressTrend={onPressTrend} />);
    expect(screen.getByText('공복혈당')).toBeTruthy();
    expect(screen.getByText('Glucose (FBS) · 당뇨')).toBeTruthy();
    expect(screen.getByText('높음')).toBeTruthy();
    expect(screen.getByText('참고치 70 ~ 99 mg/dL')).toBeTruthy();
    expect(screen.getByText('기준 상한보다 33 mg/dL 높아요')).toBeTruthy();
    expect(screen.getByText('8시간 이상 굶은 뒤 잰 혈당이에요.')).toBeTruthy();
    // 화면에 보이는 문구가 버튼 이름에 그대로 들어 있어야 음성 제어로 누를 수 있다
    expect(screen.getByText('수치 변화 보기')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '공복혈당 수치 변화 보기' }));
    expect(onPressTrend).toHaveBeenCalledTimes(1);
  });

  it('큰 값 표시: 단위가 %면 숫자에 붙이고, 그 외 단위는 띄운다', async () => {
    const hba1c: LabResult = {
      ...glucose,
      name: '당화혈색소',
      value: 7.4,
      unit: '%',
      referenceRange: { low: 4, high: 6, text: '4.0-6.0' },
    };
    // 단위 글자를 감싼 가장 가까운 View (숫자·단위를 나란히 놓는 줄)의 간격
    const gapOf = (unit: string) => {
      let node = screen.getByText(unit).parent;
      while (node && node.type !== 'View') node = node.parent;
      return StyleSheet.flatten(node?.props.style).gap ?? 0;
    };

    await render(<LabResultCard lab={hba1c} onPressTrend={jest.fn()} />);
    expect(gapOf('%')).toBe(0);

    await render(<LabResultCard lab={glucose} onPressTrend={jest.fn()} />);
    expect(gapOf('mg/dL')).toBeGreaterThan(0);
  });
});

describe('TrendChart', () => {
  it('폭을 잰 뒤 그래프를 그리고 요약 문구를 제공한다', async () => {
    const { toJSON } = await render(
      <TrendChart name="공복혈당" unit="mg/dL" points={points} referenceRange={glucose.referenceRange} />,
    );
    const chart = screen.getByRole('image');
    expect(chart.props.accessibilityLabel).toContain('3번 측정');
    await fireEvent.layout(chart, { width: 320 });
    // Polyline 은 네이티브에서 RNSVGPath 로 그려진다
    expect(JSON.stringify(toJSON())).toContain('RNSVGPath');
    // 범례는 그래프 요약과 중복되어 스크린 리더에서는 숨긴다
    expect(screen.getByText('참고치 범위 70 ~ 99 mg/dL', { includeHiddenElements: true })).toBeTruthy();
  });

  it('그래프 글자는 caption 크기 이상이며 기기 글자 크기 설정을 따른다', async () => {
    const { toJSON } = await render(
      <TrendChart name="공복혈당" unit="mg/dL" points={points} referenceRange={glucose.referenceRange} />,
    );
    await fireEvent.layout(screen.getByRole('image'), { width: 320 });
    // SVG 글자(RNSVGText 의 font)만 — 범례 등 일반 Text 는 운영체제가 알아서 키운다
    const sizes = [...JSON.stringify(toJSON()).matchAll(/"font":\{[^}]*"fontSize":(\d+(?:\.\d+)?)/g)].map((m) =>
      Number(m[1]),
    );
    const expected = computeChartTextMetrics(Typography.caption.fontSize, Dimensions.get('window').fontScale).fontSize;
    expect(sizes.length).toBeGreaterThan(0);
    expect(new Set(sizes)).toEqual(new Set([expected]));
    expect(expected).toBeGreaterThanOrEqual(Typography.caption.fontSize);
  });

  it('측정이 한 번뿐이어도 그린다', async () => {
    const { toJSON } = await render(
      <TrendChart name="공복혈당" unit="mg/dL" points={points.slice(-1)} referenceRange={glucose.referenceRange} />,
    );
    await fireEvent.layout(screen.getByRole('image'), { width: 320 });
    const json = JSON.stringify(toJSON());
    expect(json).toContain('RNSVGCircle');
    expect(json).not.toContain('RNSVGPath');
    expect(screen.getByRole('image').props.accessibilityLabel).toContain('1번 측정');
  });
});
