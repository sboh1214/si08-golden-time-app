import { StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'normal' | 'high' | 'low' | 'caution' | 'info' | 'danger';

/** 배지 톤별 글자·배경색 (대비 검사 테스트에서도 사용) */
export const BADGE_TONE_COLORS: Record<BadgeTone, { fg: string; bg: string }> = {
  neutral: { fg: Colors.textSecondary, bg: Colors.surfaceMuted },
  primary: { fg: Colors.primary, bg: Colors.primarySoft },
  accent: { fg: Colors.accentStrong, bg: Colors.accentSoft },
  normal: { fg: Colors.normal, bg: Colors.normalSoft },
  high: { fg: Colors.high, bg: Colors.highSoft },
  low: { fg: Colors.low, bg: Colors.lowSoft },
  caution: { fg: Colors.caution, bg: Colors.cautionSoft },
  info: { fg: Colors.info, bg: Colors.infoSoft },
  danger: { fg: Colors.danger, bg: Colors.dangerSoft },
};

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
  size?: 'sm' | 'md';
}

/** 상태·분류 표시용 작은 라벨 */
export function Badge({ label, tone = 'neutral', icon, size = 'sm' }: BadgeProps) {
  const t = BADGE_TONE_COLORS[tone] ?? BADGE_TONE_COLORS.neutral;
  return (
    <View
      style={[styles.base, size === 'md' && styles.md, { backgroundColor: t.bg }]}
      accessibilityRole="text"
      accessibilityLabel={label}>
      {icon ? <Icon name={icon} size={size === 'md' ? 15 : 13} color={t.fg} /> : null}
      <AppText variant={size === 'md' ? 'calloutStrong' : 'captionStrong'} color={t.fg}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.pill,
  },
  md: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
});
