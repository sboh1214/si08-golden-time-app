import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { formatNumber, formatShortDate, parseDate } from '@/lib/format';
import { flagColor, formatReferenceRange } from '@/lib/labs';
import type { LabTrendPoint, ReferenceRange } from '@/types/domain';

import {
  clamp,
  computeChartTextMetrics,
  computeXPositions,
  computeYAxis,
  createLinearScale,
  estimateTextWidth,
  labelPriority,
  pickSpacedIndices,
  placeValueLabels,
  separateLabelPair,
  VALUE_LABEL_OFFSET,
  type ChartTextMetrics,
} from './chart-math';
import { trendA11yLabel } from './lab-utils';

const DEFAULT_HEIGHT = 230;
/** 그래프 영역 안쪽 좌우 여백 — 처음·마지막 점이 축에 붙지 않게 */
const INNER_X = 18;
const POINT_RADIUS = 5;
const LATEST_POINT_RADIUS = 7;
const MIN_POINT_GAP = 30;

export interface TrendChartProps {
  /** 검사명 (스크린 리더 요약용) */
  name: string;
  unit: string;
  /** 측정일 오름차순 */
  points: LabTrendPoint[];
  referenceRange: ReferenceRange;
  height?: number;
}

/**
 * 검사 수치 추이 그래프 (react-native-svg).
 *
 * - 가로: 측정일 간격에 비례(최소 간격 보장), 세로: 측정값 + 참고치를 모두 포함하도록 자동 축.
 * - 참고치 범위는 초록 띠와 점선, 오른쪽 여백에 경계값을 표시한다.
 * - 점 색은 판정(정상·높음·낮음)을 따르고, 값 라벨은 서로 겹치지 않게 배치한다.
 * - 그래프 글자는 caption 크기 이상이며 기기 글자 크기 설정을 따른다 (SVG 글자는 자동으로 커지지 않음).
 * - 스크린 리더는 그래프 전체를 한 문장 요약으로 읽는다.
 */
export function TrendChart({ name, unit, points, referenceRange, height = DEFAULT_HEIGHT }: TrendChartProps) {
  const [width, setWidth] = useState(0);
  const { fontScale } = useWindowDimensions();
  const text = computeChartTextMetrics(Typography.caption.fontSize, fontScale);
  const hasRange = referenceRange.low !== undefined || referenceRange.high !== undefined;

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View style={styles.container}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={trendA11yLabel(name, unit, points, referenceRange)}
        onLayout={onLayout}
        style={{ height }}>
        {width > 0 && points.length > 0 ? (
          <ChartCanvas width={width} height={height} points={points} referenceRange={referenceRange} text={text} />
        ) : null}
      </View>

      {hasRange ? (
        <View style={styles.legend} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <View style={styles.legendSwatch} />
          <AppText variant="caption" color="textSecondary">
            참고치 범위 {formatReferenceRange(referenceRange, unit)}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

interface ChartCanvasProps {
  width: number;
  height: number;
  points: LabTrendPoint[];
  referenceRange: ReferenceRange;
  text: ChartTextMetrics;
}

/** 실제 SVG 그리기 (컨테이너 폭을 잰 뒤에만 렌더) */
function ChartCanvas({ width, height, points, referenceRange, text }: ChartCanvasProps) {
  const { low, high } = referenceRange;
  const { fontSize, valueLabelHeight } = text;
  const values = points.map((p) => p.value);
  const axis = computeYAxis(values, referenceRange);

  // 좌우 여백: 눈금 라벨·참고치 경계 라벨 폭에 맞춘다
  const axisLabelWidth = (v: number) => estimateTextWidth(formatNumber(v), fontSize);
  const tickLabelWidth = Math.max(...axis.ticks.map(axisLabelWidth));
  const boundLabelWidth = Math.max(0, ...[low, high].filter((v): v is number => v !== undefined).map(axisLabelWidth));
  const plotLeft = Math.max(28, tickLabelWidth + 10);
  const plotRight = width - (boundLabelWidth > 0 ? boundLabelWidth + 12 : 8);
  const plotTop = text.padTop;
  const plotBottom = height - text.padBottom;

  const y = createLinearScale(axis.min, axis.max, plotBottom, plotTop);
  const xs = computeXPositions(
    points.map((p) => parseDate(p.measuredAt).getTime()),
    plotLeft + INNER_X,
    plotRight - INNER_X,
    MIN_POINT_GAP,
  );
  const ys = values.map(y);
  const lastIndex = points.length - 1;

  // 참고치 띠 (한쪽만 있으면 그래프 끝까지)
  const bandTop = high !== undefined ? clamp(y(high), plotTop, plotBottom) : plotTop;
  const bandBottom = low !== undefined ? clamp(y(low), plotTop, plotBottom) : plotBottom;
  // 상한·하한 경계값 라벨이 너무 가까우면 위아래로 벌린다
  let highLabelY = high !== undefined ? y(high) : 0;
  let lowLabelY = low !== undefined ? y(low) : 0;
  if (high !== undefined && low !== undefined) {
    [highLabelY, lowLabelY] = separateLabelPair(highLabelY, lowLabelY, fontSize + 3);
  }

  // 값 라벨 배치 (겹치면 반대쪽, 그래도 겹치면 숨김)
  const valueTexts = values.map((v) => formatNumber(v));
  const placed = placeValueLabels(
    xs.map((x, i) => ({ x, y: ys[i], width: estimateTextWidth(valueTexts[i], fontSize) + 8 })),
    {
      height: valueLabelHeight,
      offset: VALUE_LABEL_OFFSET,
      bounds: { left: plotLeft, right: plotRight, top: 2, bottom: plotBottom },
      order: labelPriority(values),
      pointRadius: POINT_RADIUS + 1,
    },
  );

  // 날짜 라벨 (겹치지 않게 솎아냄, 최근 날짜는 항상 표시)
  const dateTexts = points.map((p) => formatShortDate(p.measuredAt));
  const dateLabelWidth = Math.max(...dateTexts.map((t) => estimateTextWidth(t, fontSize)));
  const dateIndices = pickSpacedIndices(xs, dateLabelWidth);

  return (
    <Svg width={width} height={height}>
      {/* 가로 눈금선 + 세로축 값 */}
      {axis.ticks.map((tick) => (
        <G key={`tick-${tick}`}>
          <Line x1={plotLeft} x2={plotRight} y1={y(tick)} y2={y(tick)} stroke={Colors.border} strokeWidth={1} />
          <SvgText
            x={plotLeft - 8}
            y={y(tick) + fontSize / 3}
            fontSize={fontSize}
            fill={Colors.textTertiary}
            textAnchor="end">
            {formatNumber(tick)}
          </SvgText>
        </G>
      ))}

      {/* 참고치 범위 띠·경계 점선·경계값 */}
      {low !== undefined || high !== undefined ? (
        <Rect
          x={plotLeft}
          y={bandTop}
          width={Math.max(0, plotRight - plotLeft)}
          height={Math.max(0, bandBottom - bandTop)}
          fill={Colors.normalSoft}
          opacity={0.85}
        />
      ) : null}
      {[
        { key: 'high', value: high, labelY: highLabelY },
        { key: 'low', value: low, labelY: lowLabelY },
      ].map(({ key, value, labelY }) =>
        value === undefined ? null : (
          <G key={key}>
            <Line
              x1={plotLeft}
              x2={plotRight}
              y1={y(value)}
              y2={y(value)}
              stroke={Colors.normal}
              strokeWidth={1.2}
              strokeDasharray="5 4"
            />
            <SvgText
              x={plotRight + 6}
              y={labelY + fontSize / 3}
              fontSize={fontSize}
              fontWeight="600"
              fill={Colors.normal}
              textAnchor="start">
              {formatNumber(value)}
            </SvgText>
          </G>
        ),
      )}

      {/* 추이 선 */}
      {points.length > 1 ? (
        <Polyline
          points={xs.map((x, i) => `${x},${ys[i]}`).join(' ')}
          fill="none"
          stroke={Colors.primary}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}

      {/* 측정점 (최근 값은 크게) */}
      {points.map((point, i) => (
        <Circle
          key={point.labResultId}
          cx={xs[i]}
          cy={ys[i]}
          r={i === lastIndex ? LATEST_POINT_RADIUS : POINT_RADIUS}
          fill={flagColor(point.flag).fg}
          stroke={Colors.surface}
          strokeWidth={2}
        />
      ))}

      {/* 값 라벨 (흰 바탕으로 선·띠 위에서도 읽히게) */}
      {placed.map((label, i) => {
        if (label.side === 'hidden') return null;
        const labelWidth = estimateTextWidth(valueTexts[i], fontSize) + 8;
        return (
          <G key={`value-${points[i].labResultId}`}>
            <Rect
              x={label.centerX - labelWidth / 2}
              y={label.top}
              width={labelWidth}
              height={valueLabelHeight}
              rx={4}
              fill={Colors.surface}
              opacity={0.9}
            />
            <SvgText
              x={label.centerX}
              y={label.top + fontSize}
              fontSize={fontSize}
              fontWeight="700"
              fill={flagColor(points[i].flag).fg}
              textAnchor="middle">
              {valueTexts[i]}
            </SvgText>
          </G>
        );
      })}

      {/* 날짜 라벨 */}
      {dateIndices.map((i) => (
        <SvgText
          key={`date-${points[i].labResultId}`}
          x={clamp(xs[i], dateLabelWidth / 2, width - dateLabelWidth / 2)}
          y={height - 10}
          fontSize={fontSize}
          fontWeight={i === lastIndex ? '700' : '400'}
          fill={i === lastIndex ? Colors.text : Colors.textSecondary}
          textAnchor="middle">
          {dateTexts[i]}
        </SvgText>
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  legend: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  legendSwatch: {
    width: 18,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.normal,
    backgroundColor: Colors.normalSoft,
  },
});
