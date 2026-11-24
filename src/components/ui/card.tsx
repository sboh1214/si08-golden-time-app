import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  /** 카드 내부 여백 (기본 lg) */
  padding?: keyof typeof Spacing | 0;
  /** 그림자 대신 테두리만 */
  variant?: 'elevated' | 'outlined' | 'muted';
  style?: StyleProp<ViewStyle>;
  /**
   * 안쪽 내용을 카드 모서리에 맞춰 잘라낸다 — 누름 배경이 있는 목록 행을 `padding={0}` 카드에 넣을 때.
   * (그림자는 바깥 카드에 두고 안쪽 View 만 overflow: hidden 으로 자른다)
   */
  clip?: boolean;
  /** 누를 수 없는 카드에 지정하면 내용을 하나의 요소로 묶어 이 이름으로 읽는다 */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

/** 흰 배경 둥근 카드. onPress 가 있으면 눌림 효과가 있는 버튼이 된다. */
export function Card({
  children,
  onPress,
  padding = 'lg',
  variant = 'elevated',
  style,
  clip = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: CardProps) {
  const containerStyle = [
    styles.base,
    variant === 'elevated' && styles.elevated,
    variant === 'outlined' && styles.outlined,
    variant === 'muted' && styles.muted,
    { padding: padding === 0 ? 0 : Spacing[padding] },
    style,
  ];
  const content = clip ? <View style={styles.clip}>{children}</View> : children;
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        testID={testID}
        style={({ pressed }) => [containerStyle, pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }
  // accessibilityLabel 은 accessible 요소에만 읽힌다 (iOS VoiceOver 는 없으면 무시하고 자식을 하나씩 읽음)
  const labelled = accessibilityLabel !== undefined;
  return (
    <View
      style={containerStyle}
      accessible={labelled || undefined}
      accessibilityRole={labelled ? 'summary' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
  },
  elevated: {
    ...Shadow,
  },
  outlined: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderStrong,
  },
  muted: {
    backgroundColor: Colors.surfaceMuted,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.995 }],
  },
  clip: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
});
