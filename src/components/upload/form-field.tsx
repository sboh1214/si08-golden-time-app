import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';

export interface FormFieldProps {
  label: string;
  /** 필수 항목이면 '필수', 아니면 '선택' 표시 (색상만으로 구분하지 않음) */
  required?: boolean;
  /** 오류가 없을 때 보여줄 도움말 */
  hint?: string;
  error?: string;
  children: ReactNode;
}

/** 입력 항목 공통 틀: 라벨 + 필수/선택 표시 + 입력(`TextField` 등) + 도움말/오류 */
export function FormField({ label, required = false, hint, error, children }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <AppText variant="bodyStrong">{label}</AppText>
        <AppText variant="captionStrong" color={required ? 'danger' : 'textTertiary'}>
          {required ? '필수' : '선택'}
        </AppText>
      </View>
      {children}
      {error ? (
        <View style={styles.messageRow} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Icon name="alert-circle" size={16} color="danger" />
          <AppText variant="caption" color="danger" style={styles.messageText}>
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText variant="caption" color="textTertiary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs },
  messageText: { flex: 1 },
});
