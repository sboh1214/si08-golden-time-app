import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, HitSize, Radius, Spacing, type ColorToken } from '@/constants/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: ColorToken;
  iconBackground?: ColorToken;
  /** 오른쪽 영역 (기본: onPress 있으면 chevron) */
  right?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  testID?: string;
}

/** 설정·목록용 한 줄 행 */
export function ListRow({
  title,
  subtitle,
  icon,
  iconColor = 'primary',
  iconBackground = 'primarySoft',
  right,
  onPress,
  destructive = false,
  testID,
}: ListRowProps) {
  const content = (
    <>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: Colors[iconBackground] }]}>
          <Icon name={icon} size={20} color={destructive ? 'danger' : iconColor} />
        </View>
      ) : null}
      <View style={styles.texts}>
        <AppText variant="bodyStrong" color={destructive ? 'danger' : 'text'}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="textTertiary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-forward" size={18} color="textTertiary" /> : null)}
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.row} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: Colors.surfaceMuted }]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: HitSize + 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 2 },
});
