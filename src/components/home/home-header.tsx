import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useToday } from '@/hooks/use-today';
import { formatDateLong } from '@/lib/format';

/** 홈 상단 인사말 (앱 이름 · 오늘 날짜) */
export function HomeHeader() {
  const today = useToday();
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.brand} accessibilityRole="header" accessibilityLabel="건강수첩">
          <View style={styles.logo}>
            <Icon name="heart" size={16} color="onPrimary" />
          </View>
          <AppText variant="calloutStrong" color="primary">
            건강수첩
          </AppText>
        </View>
        <AppText variant="caption" color="textTertiary">
          {formatDateLong(today)}
        </AppText>
      </View>
      <View style={styles.greeting}>
        <AppText variant="display">안녕하세요</AppText>
        <AppText variant="body" color="textSecondary">
          오늘도 건강 기록을 쉽게 이해해 보세요
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  logo: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { gap: Spacing.xs },
});
