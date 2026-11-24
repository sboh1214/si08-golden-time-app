import { Pressable, StyleSheet, View } from 'react-native';

import { LabFlagBadge } from '@/components/domain/lab-flag-badge';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Icon } from '@/components/ui/icon';
import { Colors, HitSize, Radius, Spacing } from '@/constants/theme';
import { describeDeviation, flagColor } from '@/lib/labs';
import type { LabResult } from '@/types/domain';

import { referenceRangeText } from './lab-utils';
import { LabValueDisplay } from './lab-value';
import { RangeBar } from './range-bar';

export interface LabResultCardProps {
  lab: LabResult;
  /** '수치 변화 보기'를 눌렀을 때 (수치 변화 화면으로 이동) */
  onPressTrend: () => void;
}

/**
 * 검사 결과 1항목 카드.
 * 검사명(쉬운 말 + 원어) · 측정값 · 판정 배지 · 참고치 막대 · 벗어난 정도 · 쉬운 해설 · 수치 변화 보기.
 */
export function LabResultCard({ lab, onPressTrend }: LabResultCardProps) {
  const { referenceRange: range } = lab;
  const colors = flagColor(lab.flag);
  const deviation = describeDeviation(lab.value, range, lab.unit);
  const isAboveRange = range.high !== undefined && lab.value > range.high;

  return (
    <Card padding={0}>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <AppText variant="heading">{lab.name}</AppText>
            <AppText variant="caption" color="textTertiary">
              {lab.originalName} · {lab.category}
            </AppText>
          </View>
          <LabFlagBadge flag={lab.flag} size="md" />
        </View>

        <LabValueDisplay value={lab.value} unit={lab.unit} flag={lab.flag} />

        <RangeBar name={lab.name} value={lab.value} unit={lab.unit} range={range} flag={lab.flag} />

        <AppText variant="caption" color="textSecondary">
          {referenceRangeText(range, lab.unit)}
        </AppText>

        {deviation ? (
          <View style={[styles.deviation, { backgroundColor: colors.bg }]}>
            <Icon name={isAboveRange ? 'arrow-up' : 'arrow-down'} size={16} color={colors.fg} />
            <AppText variant="calloutStrong" color={colors.fg} style={styles.flex}>
              {deviation}
            </AppText>
          </View>
        ) : null}

        {lab.plainExplanation ? (
          <View style={styles.explanation}>
            <AppText variant="body" scalable>
              {lab.plainExplanation}
            </AppText>
          </View>
        ) : null}
      </View>

      <Divider />
      <Pressable
        onPress={onPressTrend}
        accessibilityRole="button"
        accessibilityLabel={`${lab.name} 수치 변화 보기`}
        accessibilityHint="지금까지 검사한 기록을 그래프로 보여줘요"
        style={({ pressed }) => [styles.footer, pressed && styles.footerPressed]}>
        <Icon name="trending-up" size={18} color="primary" />
        <AppText variant="calloutStrong" color="primary" style={styles.flex}>
          수치 변화 보기
        </AppText>
        <Icon name="chevron-forward" size={18} color="primary" />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { padding: Spacing.lg, gap: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  titleWrap: { flex: 1, gap: Spacing.xxs },
  deviation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  explanation: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: HitSize + 4,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  footerPressed: { backgroundColor: Colors.surfaceMuted },
  flex: { flex: 1 },
});
