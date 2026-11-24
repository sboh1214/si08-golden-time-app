import { StyleSheet, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

export interface ProgressBarProps {
  /** 0~1 */
  value: number;
  color?: string;
  trackColor?: string;
  height?: number;
  accessibilityLabel?: string;
}

export function ProgressBar({
  value,
  color = Colors.primary,
  trackColor = Colors.surfaceMuted,
  height = 8,
  accessibilityLabel,
}: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height, backgroundColor: trackColor, borderRadius: height / 2 }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color, borderRadius: height / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden', borderRadius: Radius.pill },
  fill: { height: '100%' },
});
