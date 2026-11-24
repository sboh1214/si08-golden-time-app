import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';

export const PRIVACY_NOTE =
  '진료기록은 민감한 의료정보예요. 올린 진료기록은 AI 해설을 만드는 데에만 사용하고, 다른 목적으로 쓰지 않아요.';

/** 민감정보 처리 안내 (문서 등록 화면 하단) */
export function PrivacyNote({ text = PRIVACY_NOTE }: { text?: string }) {
  return (
    <View style={styles.row} accessibilityRole="text">
      <Icon name="lock-closed-outline" size={16} color="textTertiary" />
      <AppText variant="caption" color="textTertiary" style={styles.text}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingHorizontal: Spacing.xs },
  text: { flex: 1 },
});
