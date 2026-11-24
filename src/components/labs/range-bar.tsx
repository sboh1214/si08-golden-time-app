import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatNumber } from '@/lib/format';
import { flagColor } from '@/lib/labs';
import type { LabFlag, ReferenceRange } from '@/types/domain';

import { clamp, clampLabelOffset, computeRangeBarLayout } from './chart-math';
import { rangeBarA11yLabel } from './lab-utils';

const TRACK_HEIGHT = 10;
const MARKER_SIZE = 18;

export interface RangeBarProps {
  /** 스크린 리더용 검사명 */
  name: string;
  value: number;
  unit: string;
  range: ReferenceRange;
  flag: LabFlag;
}

/**
 * 참고치 막대 — 측정값이 낮음 / 정상 / 높음 구간 중 어디에 있는지 보여준다.
 *
 * - 정상 구간은 초록 테두리, 낮음·높음 구간은 옅은 파랑·빨강으로 칠한다.
 * - 한쪽만 있는 참고치(<100, >40)는 해당 쪽 구간만 그린다.
 * - 값이 너무 멀리 벗어나면 막대 끝에 고정하고 화살표로 '범위 밖'임을 표시한다.
 * - 참고치 경계가 하나도 없으면 아무것도 그리지 않는다.
 */
export function RangeBar({ name, value, unit, range, flag }: RangeBarProps) {
  const [width, setWidth] = useState(0);
  const layout = computeRangeBarLayout(value, range);
  if (!layout.hasRange) return null;

  const color = flagColor(flag).fg;
  const markerCenter = layout.valuePosition * width;
  const markerLeft = clamp(markerCenter - MARKER_SIZE / 2, 0, Math.max(0, width - MARKER_SIZE));
  const lowWidth = layout.normalStart * 100;
  const normalWidth = (layout.normalEnd - layout.normalStart) * 100;

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={rangeBarA11yLabel(name, value, unit, range, flag)}
      onLayout={onLayout}
      style={styles.container}>
      {/* 측정값 라벨 */}
      <View style={styles.labelRow}>
        {width > 0 ? (
          <FloatingLabel center={markerCenter} containerWidth={width}>
            {layout.overflow === 'below' ? <Icon name="caret-back" size={12} color={color} /> : null}
            <AppText variant="captionStrong" color={color}>
              {formatNumber(value)}
            </AppText>
            {layout.overflow === 'above' ? <Icon name="caret-forward" size={12} color={color} /> : null}
          </FloatingLabel>
        ) : null}
      </View>

      {/* 구간 막대 + 표시점 */}
      <View style={styles.barArea}>
        <View style={styles.track}>
          <View style={[styles.lowZone, { width: `${lowWidth}%` }]} />
          <View style={[styles.normalZone, { width: `${normalWidth}%` }]} />
          <View style={styles.highZone} />
        </View>
        {width > 0 ? (
          <View style={[styles.marker, { left: markerLeft, backgroundColor: color }]} />
        ) : null}
      </View>

      {/* 참고치 경계 눈금 */}
      <View style={styles.tickRow}>
        {width > 0
          ? layout.ticks.map((tick) => (
              <FloatingLabel key={tick.kind} center={tick.position * width} containerWidth={width}>
                <AppText variant="caption" color="textTertiary">
                  {formatNumber(tick.value)}
                </AppText>
              </FloatingLabel>
            ))
          : null}
      </View>
    </View>
  );
}

/**
 * 막대 위 특정 위치를 가운데로 하는 라벨.
 * 자기 폭을 잰 뒤 막대 밖으로 나가지 않게 위치를 보정한다 (측정 전에는 숨김).
 */
function FloatingLabel({
  center,
  containerWidth,
  children,
}: {
  center: number;
  containerWidth: number;
  children: ReactNode;
}) {
  const [labelWidth, setLabelWidth] = useState<number | null>(null);
  const left = labelWidth === null ? 0 : clampLabelOffset(center, labelWidth, containerWidth);
  return (
    <View
      onLayout={(event) => setLabelWidth(event.nativeEvent.layout.width)}
      style={[styles.floating, { left, opacity: labelWidth === null ? 0 : 1 }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xxs },
  labelRow: { height: 18 },
  barArea: { height: MARKER_SIZE, justifyContent: 'center' },
  track: {
    flexDirection: 'row',
    height: TRACK_HEIGHT,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceMuted,
  },
  lowZone: { backgroundColor: Colors.lowSoft },
  normalZone: {
    backgroundColor: Colors.normalSoft,
    borderWidth: 1.5,
    borderColor: Colors.normal,
  },
  highZone: { flex: 1, backgroundColor: Colors.highSoft },
  marker: {
    position: 'absolute',
    top: 0,
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    borderWidth: 3,
    borderColor: Colors.surface,
  },
  tickRow: { height: 18 },
  floating: {
    position: 'absolute',
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
