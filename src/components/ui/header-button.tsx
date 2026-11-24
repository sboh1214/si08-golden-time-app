import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { Colors, HitSize, Radius, Spacing, type ColorToken } from '@/constants/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

export interface HeaderButtonProps {
  onPress: () => void;
  /** 화면에 보이는 글자. 아이콘과 함께 주면 '아이콘 + 글자' 버튼이 된다 */
  label?: string;
  icon?: IconName;
  /** 스크린리더 이름 (기본: label). 아이콘만 있는 버튼은 반드시 지정한다 */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** 아이콘·글자 색 (기본 primary) */
  color?: ColorToken;
  /** 요청 중 — 중복 탭을 막고 진행 표시 */
  loading?: boolean;
  disabled?: boolean;
  /** 켜고 끄는 버튼이면 현재 켜짐 여부 (스크린리더에 스위치로 읽히고, 켜지면 옅은 배경) */
  active?: boolean;
  testID?: string;
}

/** 내비게이션 헤더 좌·우에 두는 버튼 (최소 44pt) — 글자 · 아이콘 · 아이콘+글자 */
export function HeaderButton({
  onPress,
  label,
  icon,
  accessibilityLabel,
  accessibilityHint,
  color = 'primary',
  loading = false,
  disabled = false,
  active,
  testID,
}: HeaderButtonProps) {
  const isToggle = active !== undefined;
  const inactive = disabled || loading;
  const tint: ColorToken = isToggle && !active ? 'text' : color;
  const iconOnly = icon !== undefined && !label;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole={isToggle ? 'switch' : 'button'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={isToggle ? { checked: active, disabled: inactive } : { disabled: inactive, busy: loading }}
      hitSlop={4}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        iconOnly ? styles.iconOnly : styles.withLabel,
        active && styles.active,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      {loading ? (
        <ActivityIndicator color={Colors[tint]} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={label ? 22 : 24} color={tint} /> : null}
          {label ? (
            <AppText variant={icon ? 'calloutStrong' : 'bodyStrong'} color={tint}>
              {label}
            </AppText>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    minWidth: HitSize,
    minHeight: HitSize,
  },
  iconOnly: { borderRadius: Radius.pill },
  withLabel: { paddingHorizontal: Spacing.sm, borderRadius: Radius.md },
  active: { backgroundColor: Colors.primarySoft },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.3 },
});
