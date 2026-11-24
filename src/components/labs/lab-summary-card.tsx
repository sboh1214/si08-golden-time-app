import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, Radius, Spacing, type ColorToken } from '@/constants/theme';

import type { FlagSummary } from './lab-utils';

const ITEMS: { key: keyof FlagSummary; label: string; icon: IconName; color: ColorToken; background: ColorToken }[] = [
  { key: 'normal', label: '정상', icon: 'checkmark-circle', color: 'normal', background: 'normalSoft' },
  { key: 'high', label: '높음', icon: 'arrow-up-circle', color: 'high', background: 'highSoft' },
  { key: 'low', label: '낮음', icon: 'arrow-down-circle', color: 'low', background: 'lowSoft' },
];

export interface LabSummaryCardProps {
  /** 예: 검사 결과 8항목 */
  title: string;
  /** 예: 2026.03.12 · 샘플내과의원 */
  subtitle: string;
  summary: FlagSummary;
}

/** 문서 검사 결과 요약 — 정상·높음·낮음 개수 (색 + 아이콘 + 글자) */
export function LabSummaryCard({ title, subtitle, summary }: LabSummaryCardProps) {
  const abnormalCount = summary.high + summary.low;
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Icon name="flask-outline" size={22} color="primary" />
        </View>
        <View style={styles.headerTexts}>
          <AppText variant="heading" accessibilityRole="header">
            {title}
          </AppText>
          <AppText variant="caption" color="textTertiary">
            {subtitle}
          </AppText>
        </View>
      </View>

      <View style={styles.stats}>
        {ITEMS.map((item) => (
          <View
            key={item.key}
            accessible
            accessibilityLabel={`${item.label} ${summary[item.key]}개`}
            style={[styles.stat, { backgroundColor: Colors[item.background] }]}>
            <AppText variant="number" color={item.color}>
              {summary[item.key]}
            </AppText>
            <View style={styles.statLabel}>
              <Icon name={item.icon} size={14} color={item.color} />
              <AppText variant="captionStrong" color={item.color}>
                {item.label}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <AppText variant="callout" color="textSecondary">
        {abnormalCount > 0
          ? `참고치를 벗어난 항목이 ${abnormalCount}개 있어요. 다음 진료 때 의료진과 함께 확인해 보세요.`
          : '모든 검사 수치가 참고치 안에 있어요.'}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: { flex: 1, gap: Spacing.xxs },
  stats: { flexDirection: 'row', gap: Spacing.sm },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  statLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
});
