import { StyleSheet, View } from 'react-native';

import { toApiError } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface ErrorStateProps {
  error?: unknown;
  title?: string;
  /** 지정하지 않으면 error 에서 사용자용 문구를 만든다 */
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  fill?: boolean;
}

/** 오류 + 다시 시도 */
export function ErrorState({
  error,
  title,
  message,
  onRetry,
  retrying = false,
  fill = true,
}: ErrorStateProps) {
  const apiError = error !== undefined ? toApiError(error) : undefined;
  const isNetwork = apiError?.code === 'NETWORK' || apiError?.code === 'TIMEOUT';
  const resolvedTitle = title ?? (isNetwork ? '연결이 원활하지 않아요' : '문제가 발생했어요');
  const resolvedMessage = message ?? apiError?.userMessage ?? '잠시 후 다시 시도해 주세요.';
  return (
    <View
      style={[styles.container, fill && styles.fill]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      testID="error-state">
      <View style={styles.iconWrap}>
        <Icon name={isNetwork ? 'cloud-offline-outline' : 'alert-circle-outline'} size={32} color="danger" />
      </View>
      <AppText variant="heading" align="center">
        {resolvedTitle}
      </AppText>
      <AppText variant="callout" color="textSecondary" align="center">
        {resolvedMessage}
      </AppText>
      {onRetry ? (
        <Button
          label="다시 시도"
          icon="refresh"
          variant="secondary"
          onPress={onRetry}
          loading={retrying}
          style={styles.button}
          testID="error-retry"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.huge,
    paddingHorizontal: Spacing.xxl,
  },
  fill: { flex: 1, backgroundColor: Colors.background },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  button: { marginTop: Spacing.md, minWidth: 140 },
});
