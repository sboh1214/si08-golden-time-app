import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, HitSize, Radius, Spacing, type ColorToken } from '@/constants/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
}

const VARIANT: Record<ButtonVariant, { bg: string; fg: ColorToken; border?: string }> = {
  primary: { bg: Colors.primary, fg: 'onPrimary' },
  secondary: { bg: Colors.primarySoft, fg: 'primary' },
  outline: { bg: Colors.surface, fg: 'text', border: Colors.borderStrong },
  ghost: { bg: 'transparent', fg: 'primary' },
  danger: { bg: Colors.dangerSoft, fg: 'danger' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const v = VARIANT[variant];
  const inactive = disabled || loading;
  const iconNode = icon ? <Icon name={icon} size={size === 'lg' ? 22 : 20} color={v.fg} /> : null;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor: v.bg },
        v.border ? { borderWidth: 1, borderColor: v.border } : null,
        fullWidth && styles.fullWidth,
        pressed && !inactive && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={Colors[v.fg]} />
      ) : (
        <View style={styles.content}>
          {iconPosition === 'left' && iconNode}
          <AppText variant={size === 'lg' ? 'bodyStrong' : 'calloutStrong'} color={v.fg}>
            {label}
          </AppText>
          {iconPosition === 'right' && iconNode}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  md: { minHeight: HitSize },
  lg: { minHeight: 54, borderRadius: Radius.lg },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },
});
