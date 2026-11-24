import { Pressable, StyleSheet } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** 개수 표시 */
  count?: number;
  /** 누를 수 없음 — 흐리게 표시하고 스크린리더에 '사용할 수 없음'으로 읽힌다 */
  disabled?: boolean;
  testID?: string;
}

/** 선택형 필터·옵션 칩 */
export function Chip({ label, selected = false, onPress, icon, count, disabled = false, testID }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={count !== undefined ? `${label} ${count}개` : label}
      testID={testID}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.unselected,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      {icon ? <Icon name={icon} size={16} color={selected ? 'onPrimary' : 'textSecondary'} /> : null}
      <AppText variant="calloutStrong" color={selected ? 'onPrimary' : 'textSecondary'}>
        {label}
        {count !== undefined ? ` ${count}` : ''}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  selected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  unselected: { backgroundColor: Colors.surface, borderColor: Colors.border },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
});
