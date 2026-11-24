import { StyleSheet, View } from 'react-native';

import { LabFlagBadge } from '@/components/domain/lab-flag-badge';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatDate } from '@/lib/format';
import { LAB_FLAG_LABEL } from '@/lib/labels';
import type { LabTrend, LabTrendPoint } from '@/types/domain';

import { formatLabValue, referenceRangeText, type LabChange } from './lab-utils';
import { LabValueDisplay } from './lab-value';

const CHANGE_ICON: Record<LabChange['direction'], IconName> = {
  up: 'arrow-up',
  down: 'arrow-down',
  same: 'remove',
};

export interface LatestResultCardProps {
  trend: LabTrend;
  latest: LabTrendPoint;
  /** 지난 검사 대비 변화 (처음 측정이면 없음) */
  change: LabChange | undefined;
}

/** 수치 변화 화면 상단: 최근 결과 요약 — 값 · 판정 · 참고치 · 지난 검사 대비 변화 */
export function LatestResultCard({ trend, latest, change }: LatestResultCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="caption" color="textTertiary">
            {trend.originalName} · {trend.category}
          </AppText>
          <AppText variant="calloutStrong" color="textSecondary">
            최근 검사 {formatDate(latest.measuredAt)}
          </AppText>
        </View>
        <LabFlagBadge flag={latest.flag} size="md" />
      </View>

      <LabValueDisplay
        value={latest.value}
        unit={trend.unit}
        flag={latest.flag}
        accessibilityLabel={`최근 결과 ${formatLabValue(latest.value, trend.unit)}, ${LAB_FLAG_LABEL[latest.flag]}`}
      />

      <AppText variant="callout" color="textSecondary">
        {referenceRangeText(trend.referenceRange, trend.unit)}
      </AppText>

      <View style={styles.changeBox}>
        <Icon
          name={change ? CHANGE_ICON[change.direction] : 'information-circle-outline'}
          size={18}
          color="textSecondary"
        />
        <AppText variant="calloutStrong" color="textSecondary" style={styles.flex}>
          {change ? change.text : '처음 측정한 기록이에요'}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  changeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
});
