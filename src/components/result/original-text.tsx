import { Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

/** 원문 표기는 의료진이 쓴 그대로임을 드러내도록 고정폭 글꼴로 표시 */
const MONOSPACE = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, Menlo, Consolas, monospace',
});

export interface OriginalTextProps {
  /** 앞에 붙는 설명 (예: 원문 표기, 처방 원문) */
  label: string;
  text: string;
}

/** 진료기록·처방전에 적힌 원래 표기 (예: Type 2 DM, Metformin 500mg 1T bid pc) */
export function OriginalText({ label, text }: OriginalTextProps) {
  return (
    <View style={styles.box} accessible accessibilityLabel={`${label}: ${text}`}>
      <AppText variant="caption" color="textTertiary">
        {label}
      </AppText>
      <AppText variant="callout" color="textSecondary" style={styles.mono} selectable>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceMuted,
  },
  mono: { fontFamily: MONOSPACE, letterSpacing: 0 },
});
