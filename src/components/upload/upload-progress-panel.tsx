import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Spacing } from '@/constants/theme';

/** 파일 전송 진행률 (하단 CTA 위) */
export function UploadProgressPanel({ ratio }: { ratio: number }) {
  const percent = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  const label = percent < 100 ? `업로드 중 ${percent}%` : '업로드 완료! 분석을 준비하고 있어요';
  return (
    <View style={styles.panel} accessibilityLiveRegion="polite" testID="upload-progress">
      <AppText variant="calloutStrong" color="primary">
        {label}
      </AppText>
      <ProgressBar value={percent / 100} accessibilityLabel="업로드 진행률" />
      <AppText variant="caption" color="textTertiary">
        업로드가 끝날 때까지 이 화면을 닫지 말아 주세요.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: Spacing.xs, paddingBottom: Spacing.xs },
});
