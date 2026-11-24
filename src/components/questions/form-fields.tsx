import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';

export interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** 입력 화면의 한 구역 (제목 + 보조 설명 + 내용) */
export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <AppText variant="bodyStrong" accessibilityRole="header">
          {title}
        </AppText>
        {description ? (
          <AppText variant="caption" color="textTertiary">
            {description}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export interface TextAreaFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  /** 입력 칸 위 보조 설명 */
  helper?: string;
  /** 검증 오류 문구 (있으면 빨간 테두리 + 안내) */
  error?: string | null;
  minHeight?: number;
  testID?: string;
}

/** 여러 줄 입력 칸 — 글자 수 표시, 포커스·오류 테두리, 스크린리더 안내 포함 */
export function TextAreaField({
  label,
  value,
  onChangeText,
  maxLength,
  placeholder,
  helper,
  error,
  minHeight = 128,
  testID,
}: TextAreaFieldProps) {
  const nearLimit = value.length >= Math.floor(maxLength * 0.9);
  return (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <AppText variant="bodyStrong">{label}</AppText>
        <AppText
          variant="caption"
          color={nearLimit ? 'caution' : 'textTertiary'}
          accessibilityLabel={`${maxLength}자 중 ${value.length}자 입력`}>
          {value.length}/{maxLength}
        </AppText>
      </View>
      {helper ? (
        <AppText variant="caption" color="textTertiary">
          {helper}
        </AppText>
      ) : null}
      <TextField
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        placeholder={placeholder}
        multiline
        minHeight={minHeight}
        invalid={Boolean(error)}
        accessibilityLabel={label}
        accessibilityHint={helper}
        testID={testID}
      />
      {error ? (
        <View style={styles.errorRow} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Icon name="alert-circle" size={16} color="danger" />
          <AppText variant="caption" color="danger" style={styles.errorText}>
            {error}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  sectionHead: { gap: Spacing.xxs },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // 글자 크게 보기·좁은 화면에서도 오류 문구가 줄바꿈되도록 남은 폭을 채운다
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs },
  errorText: { flex: 1 },
});
