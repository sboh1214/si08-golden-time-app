import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Colors, Spacing } from '@/constants/theme';

export interface LoadingStateProps {
  message?: string;
  /** 화면 전체를 채울지 (기본 true) */
  fill?: boolean;
}

/** 데이터 불러오는 중 */
export function LoadingState({ message = '불러오는 중이에요…', fill = true }: LoadingStateProps) {
  return (
    <View
      style={[styles.container, fill && styles.fill]}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      accessibilityLiveRegion="polite"
      testID="loading-state">
      <ActivityIndicator size="large" color={Colors.primary} />
      <AppText variant="callout" color="textSecondary" align="center">
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.huge,
    paddingHorizontal: Spacing.xxl,
  },
  fill: { flex: 1, backgroundColor: Colors.background },
});
