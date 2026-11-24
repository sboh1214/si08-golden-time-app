import { StyleSheet, View } from 'react-native';

import { toApiError } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface InlineErrorBannerProps {
  error: unknown;
  /** 기본: 네트워크 오류면 '연결이 원활하지 않아요', 그 외 '업로드하지 못했어요' */
  title?: string;
}

/**
 * 화면 안에 붙는 작은 오류 안내 (ErrorState 의 한 줄 버전).
 * 문구는 API 오류의 사용자용 메시지를 그대로 사용한다. 다시 시도는 바로 아래 CTA 가 담당한다.
 */
export function InlineErrorBanner({ error, title }: InlineErrorBannerProps) {
  const apiError = toApiError(error);
  const isNetwork = apiError.code === 'NETWORK' || apiError.code === 'TIMEOUT';
  const resolvedTitle = title ?? (isNetwork ? '연결이 원활하지 않아요' : '업로드하지 못했어요');
  return (
    <View
      style={styles.banner}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      testID="upload-error">
      <Icon name={isNetwork ? 'cloud-offline-outline' : 'alert-circle'} size={20} color="danger" />
      <View style={styles.texts}>
        <AppText variant="calloutStrong" color="danger">
          {resolvedTitle}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {apiError.userMessage}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.dangerSoft,
  },
  texts: { flex: 1, gap: Spacing.xxs },
});
