import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, Radius, Spacing, type ColorToken } from '@/constants/theme';

export interface StatusHeroProps {
  icon: IconName;
  /** 아이콘 색 / 배경 토큰 */
  tone: { color: ColorToken; background: ColorToken };
  title: string;
  description?: ReactNode;
  testID?: string;
}

/** 진행 화면 상단의 큰 상태 표시 (아이콘 + 제목 + 설명) */
export function StatusHero({ icon, tone, title, description, testID }: StatusHeroProps) {
  return (
    <View style={styles.container} accessibilityLiveRegion="polite" testID={testID}>
      <View style={[styles.iconWrap, { backgroundColor: Colors[tone.background] }]}>
        <Icon name={icon} size={36} color={tone.color} />
      </View>
      <AppText variant="title" align="center" accessibilityRole="header">
        {title}
      </AppText>
      {typeof description === 'string' ? (
        <AppText variant="body" color="textSecondary" align="center">
          {description}
        </AppText>
      ) : (
        description
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.lg },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
});
