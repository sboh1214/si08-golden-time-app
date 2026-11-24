import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { AI_DISCLAIMER_TEXT } from '@/lib/labels';

export const DEFAULT_DISCLAIMER = AI_DISCLAIMER_TEXT;

/** AI 해설 고지 — 해설·구조화 결과 화면 하단에 반드시 표시 */
export function AiDisclaimer({ text = DEFAULT_DISCLAIMER, compact = false }: { text?: string; compact?: boolean }) {
  return (
    <View style={[styles.box, compact && styles.compact]} accessibilityRole="text">
      <Icon name="information-circle-outline" size={18} color="textSecondary" />
      <AppText variant="caption" color="textSecondary" scalable style={styles.text}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  compact: { padding: Spacing.sm },
  text: { flex: 1 },
});
