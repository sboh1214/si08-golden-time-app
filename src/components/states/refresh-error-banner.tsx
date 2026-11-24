import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { toApiError } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { Colors, HitSize, Radius, ScreenPadding, Spacing } from '@/constants/theme';

export interface RefreshErrorBannerProps {
  error?: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * 이미 받은 데이터가 있는데 새로고침(백그라운드 재조회)만 실패했을 때 화면 위에 띄우는 작은 안내.
 * 전체 오류 화면으로 바꾸지 않으므로 작성 중인 내용·필터·진료실 모드 같은 화면 상태가 유지된다.
 */
export function RefreshErrorBanner({ error, onRetry, retrying = false, style }: RefreshErrorBannerProps) {
  const code = error !== undefined ? toApiError(error).code : undefined;
  const isNetwork = code === 'NETWORK' || code === 'TIMEOUT';
  const message = isNetwork
    ? '연결이 원활하지 않아 최신 내용을 불러오지 못했어요.'
    : '최신 내용을 불러오지 못했어요.';
  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID="refresh-error-banner">
      <Icon name={isNetwork ? 'cloud-offline-outline' : 'alert-circle-outline'} size={18} color="caution" />
      <AppText variant="caption" color="textSecondary" style={styles.text}>
        {message} 이전에 받은 내용을 보여 드려요.
      </AppText>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          disabled={retrying}
          accessibilityRole="button"
          accessibilityLabel="다시 불러오기"
          accessibilityState={{ disabled: retrying, busy: retrying }}
          hitSlop={Spacing.xs}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
          testID="refresh-error-retry">
          <AppText variant="captionStrong" color="primary">
            {retrying ? '불러오는 중…' : '다시 불러오기'}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: ScreenPadding,
    marginVertical: Spacing.sm,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Colors.cautionSoft,
  },
  text: { flex: 1, paddingVertical: Spacing.sm },
  retry: {
    minHeight: HitSize,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  pressed: { opacity: 0.6 },
});
