import { StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

/** 페이지 위치 표시 점 (현재 페이지는 길게) */
export function PageDots({ count, index }: { count: number; index: number }) {
  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`전체 ${count}쪽 중 ${index + 1}쪽`}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === index && styles.active]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  dot: {
    width: Spacing.sm,
    height: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.borderStrong,
  },
  active: { width: Spacing.xxl, backgroundColor: Colors.primary },
});
