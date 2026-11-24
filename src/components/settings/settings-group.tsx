import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Spacing } from '@/constants/theme';

export interface SettingsGroupProps {
  title: string;
  /** 제목 옆 배지 (예: 베타테스트·시연용) */
  badge?: BadgeProps;
  description?: string;
  children: ReactNode;
  testID?: string;
}

/** 설정 화면 그룹 — 제목 + 구분선으로 나뉜 행 목록 카드 */
export function SettingsGroup({ title, badge, description, children, testID }: SettingsGroupProps) {
  const rows = Children.toArray(children);
  return (
    <View style={styles.group} testID={testID}>
      <View style={styles.header}>
        <AppText variant="calloutStrong" color="textSecondary" accessibilityRole="header">
          {title}
        </AppText>
        {badge ? <Badge {...badge} /> : null}
      </View>
      {description ? (
        <AppText variant="caption" color="textTertiary" style={styles.description}>
          {description}
        </AppText>
      ) : null}
      <Card padding={0} clip>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? <Divider inset={Spacing.lg} /> : null}
            {row}
          </Fragment>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  description: { paddingHorizontal: Spacing.xs, marginTop: -Spacing.xs },
});
