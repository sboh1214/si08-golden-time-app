import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';

export interface ResultSectionProps {
  title: string;
  count?: number;
  subtitle?: string;
  children: ReactNode;
  testID?: string;
}

/** 정리 결과 화면의 항목 구역 (제목 + 카드 목록) */
export function ResultSection({ title, count, subtitle, children, testID }: ResultSectionProps) {
  return (
    <View testID={testID}>
      <SectionHeader title={title} count={count} subtitle={subtitle} />
      <View style={styles.list}>{children}</View>
    </View>
  );
}

export interface SectionEmptyProps {
  icon: IconName;
  message: string;
}

/** 구역 안에 표시할 항목이 없을 때의 간단한 안내 */
export function SectionEmpty({ icon, message }: SectionEmptyProps) {
  return (
    <Card variant="muted" style={styles.empty}>
      <Icon name={icon} size={20} color="textTertiary" />
      <AppText variant="callout" color="textSecondary" style={styles.emptyText}>
        {message}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.md },
  empty: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  emptyText: { flex: 1 },
});
