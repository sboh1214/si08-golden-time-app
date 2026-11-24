import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatRelative } from '@/lib/format';
import type { DocumentAnalysis } from '@/types/domain';

export interface SummaryCardProps {
  analysis: Pick<DocumentAnalysis, 'overallSummary' | 'generatedAt'>;
}

/** "AI 한눈에 요약" — 문서 전체를 3~4문장으로 요약한 AI 해설 */
export function SummaryCard({ analysis }: SummaryCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.iconWrap}>
          <Icon name="sparkles" size={16} color="onPrimary" />
        </View>
        <AppText variant="bodyStrong" color="primary" accessibilityRole="header">
          AI 한눈에 요약
        </AppText>
      </View>
      <AppText variant="body" scalable>
        {analysis.overallSummary}
      </AppText>
      {/* 내부 모델 식별자(modelVersion)는 환자에게 의미가 없어 보여주지 않는다 */}
      <AppText variant="caption" color="textTertiary">
        {`${formatRelative(analysis.generatedAt)} 생성`}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
    backgroundColor: Colors.primarySoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primary,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
