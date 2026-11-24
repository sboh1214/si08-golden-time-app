import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';

import { formatTimelinePeriod, type TimelineSummary } from './group';

/** 타임라인 상단 요약: 진료기록 n건 · 병원 m곳 · 기간 */
export function TimelineSummaryCard({ summary }: { summary: TimelineSummary }) {
  const period = formatTimelinePeriod(summary);
  return (
    <Card
      accessibilityLabel={`진료기록 ${summary.recordCount}건, 병원 ${summary.hospitalCount}곳${period ? `, 기간 ${period}` : ''}`}>
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <AppText variant="title">
            진료기록{' '}
            <AppText variant="title" color="primary">
              {summary.recordCount}건
            </AppText>
          </AppText>
          <AppText variant="callout" color="textSecondary">
            여러 병원의 기록을 날짜순으로 한곳에 모았어요.
          </AppText>
        </View>
        <View style={styles.stats}>
          <Stat icon="business-outline" label="병원" value={`${summary.hospitalCount}곳`} />
          {period ? <Stat icon="calendar-outline" label="기간" value={period} /> : null}
        </View>
      </View>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={16} color="primary" />
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
      <AppText variant="captionStrong">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  titleRow: { gap: Spacing.xxs },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
  },
});
