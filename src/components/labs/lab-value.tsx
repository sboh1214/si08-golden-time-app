import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { LabFlagBadge } from '@/components/domain/lab-flag-badge';
import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { Colors, HitSize, Spacing } from '@/constants/theme';
import { formatNumber } from '@/lib/format';
import { flagColor, isAbnormal } from '@/lib/labs';
import type { LabFlag } from '@/types/domain';

import { attachesUnit, formatLabValue } from './lab-utils';

/** 측정값 글자색 — 참고치를 벗어나면 판정 색, 정상이면 기본 글자색 */
function valueColor(flag: LabFlag): string {
  return isAbnormal(flag) ? flagColor(flag).fg : 'text';
}

export interface LabValueDisplayProps {
  value: number;
  unit: string;
  flag: LabFlag;
  /** 지정하면 숫자·단위를 한 덩어리로 읽는다 */
  accessibilityLabel?: string;
}

/**
 * 크게 보여주는 측정값 + 단위 (카드 상단).
 * 숫자와 단위의 글자 크기가 달라 따로 그리되, 간격은 `formatLabValue` 와 같다 ('7.4%', '132 mg/dL').
 */
export function LabValueDisplay({ value, unit, flag, accessibilityLabel }: LabValueDisplayProps) {
  return (
    <View
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
      style={[styles.display, !attachesUnit(unit) && styles.displaySpaced]}>
      <AppText variant="display" color={valueColor(flag)}>
        {formatNumber(value)}
      </AppText>
      {unit ? (
        <AppText variant="callout" color="textSecondary">
          {unit}
        </AppText>
      ) : null}
    </View>
  );
}

export interface LabValueRowProps {
  /** 검사명 또는 측정일 */
  title: string;
  /** 제목 아래 옅은 보조 문구 (원어명 등) */
  subtitle?: string;
  /** 추가 안내 문구 (측정 횟수·최근 검사일 등) */
  caption?: string;
  value: number;
  unit: string;
  flag: LabFlag;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  /** 행 여백 조정 (예: 아래에 '원문 보기' 링크가 붙을 때 아래 여백 줄이기) */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * 검사 수치 목록의 한 줄 — 왼쪽 제목·보조 문구, 오른쪽 측정값(판정 색) + 판정 배지, 이동 화살표.
 * 홈·정리 결과·검사 수치 화면이 같은 행을 쓴다.
 * 카드 안에서 쓸 때는 눌림 배경이 모서리를 넘지 않게 `<Card padding={0} clip>` 에 넣는다.
 */
export function LabValueRow({
  title,
  subtitle,
  caption,
  value,
  unit,
  flag,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: LabValueRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={({ pressed }) => [styles.row, style, pressed && styles.pressed]}>
      <View style={styles.texts}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color="textTertiary">
            {subtitle}
          </AppText>
        ) : null}
        {caption ? (
          <AppText variant="caption" color="textSecondary">
            {caption}
          </AppText>
        ) : null}
      </View>
      <View style={styles.right}>
        <AppText variant="bodyStrong" color={valueColor(flag)}>
          {formatLabValue(value, unit)}
        </AppText>
        <LabFlagBadge flag={flag} />
      </View>
      <Icon name="chevron-forward" size={18} color="textTertiary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  display: { flexDirection: 'row', alignItems: 'baseline' },
  displaySpaced: { gap: Spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: HitSize + Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  pressed: { backgroundColor: Colors.surfaceMuted },
  texts: { flex: 1, gap: Spacing.xxs },
  right: { alignItems: 'flex-end', gap: Spacing.xs },
});
