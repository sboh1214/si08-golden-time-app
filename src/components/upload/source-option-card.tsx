import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, Radius, Shadow, Spacing, type ColorToken } from '@/constants/theme';

export interface SourceOptionCardProps {
  icon: IconName;
  title: string;
  description: string;
  /** 아이콘 색상 / 배경 토큰 */
  tone?: { color: ColorToken; background: ColorToken };
  onPress: () => void;
  /** 선택 창을 여는 중 */
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

/** 등록 방법 선택용 큰 카드 (아이콘 + 제목 + 한 줄 설명) */
export function SourceOptionCard({
  icon,
  title,
  description,
  tone = { color: 'primary', background: 'primarySoft' },
  onPress,
  loading = false,
  disabled = false,
  testID,
}: SourceOptionCardProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, disabled && styles.disabled]}>
      <View style={[styles.iconWrap, { backgroundColor: Colors[tone.background] }]}>
        <Icon name={icon} size={28} color={tone.color} />
      </View>
      <View style={styles.texts}>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="callout" color="textSecondary">
          {description}
        </AppText>
      </View>
      {loading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : (
        <Icon name="chevron-forward" size={20} color="textTertiary" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    minHeight: 88,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    ...Shadow,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: Spacing.xxs },
});
