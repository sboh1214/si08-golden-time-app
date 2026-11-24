import { Pressable, StyleSheet, View } from 'react-native';

import { HitSize, Spacing } from '@/constants/theme';

import { AppText } from './app-text';
import { Icon } from './icon';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** 제목 옆 개수 등 */
  count?: number;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function SectionHeader({ title, subtitle, count, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.titleWrap}>
        <AppText variant="heading" accessibilityRole="header">
          {title}
          {count !== undefined ? <AppText variant="heading" color="primary">{` ${count}`}</AppText> : null}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="textTertiary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onActionPress ? (
        <Pressable
          onPress={onActionPress}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={8}
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}>
          <AppText variant="calloutStrong" color="textSecondary">
            {actionLabel}
          </AppText>
          <Icon name="chevron-forward" size={16} color="textSecondary" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  titleWrap: { flex: 1, gap: Spacing.xxs },
  action: { flexDirection: 'row', alignItems: 'center', minHeight: HitSize / 1.5, gap: 2 },
});
