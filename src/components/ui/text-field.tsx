import { useState, type ReactNode, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

export interface TextFieldProps extends TextInputProps {
  /** 검증 오류 — 빨간 테두리 */
  invalid?: boolean;
  /** 입력칸 안 왼쪽 요소 (검색 아이콘 등) */
  leading?: ReactNode;
  /** 입력칸 안 오른쪽 요소 (지우기 버튼 등) */
  trailing?: ReactNode;
  /** 여러 줄 입력의 최소 높이 */
  minHeight?: number;
  ref?: Ref<TextInputInstance>;
}

/**
 * 테마 토큰을 적용한 입력칸 — 한 줄·여러 줄(`multiline`), 포커스·오류·비활성 상태를 같은 모양으로 보여 준다.
 * 테두리는 흰 바탕에서 입력칸 경계가 보이도록 `borderStrong` 을 쓴다.
 */
export function TextField({
  invalid = false,
  editable = true,
  multiline = false,
  leading,
  trailing,
  minHeight,
  style,
  onFocus,
  onBlur,
  ref,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const framed = leading !== undefined || trailing !== undefined;
  const frameStyle = [
    styles.frame,
    focused && styles.focused,
    invalid && styles.invalid,
    !editable && styles.disabled,
  ];

  const input = (
    <TextInput
      ref={ref}
      editable={editable}
      multiline={multiline}
      placeholderTextColor={Colors.textTertiary}
      selectionColor={Colors.primary}
      cursorColor={Colors.primary}
      accessibilityState={{ disabled: !editable }}
      {...rest}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        styles.input,
        multiline && styles.multiline,
        minHeight !== undefined && { minHeight },
        !editable && styles.inputDisabled,
        framed ? styles.inputInFrame : frameStyle,
        style,
      ]}
    />
  );

  if (!framed) return input;
  return (
    <View style={[frameStyle, styles.row]}>
      {leading}
      {input}
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  focused: { borderColor: Colors.primary, borderWidth: 1.5 },
  invalid: { borderColor: Colors.danger, borderWidth: 1.5 },
  disabled: { backgroundColor: Colors.surfaceMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingLeft: Spacing.md },
  input: {
    minHeight: 52,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text,
    fontSize: Typography.body.fontSize,
  },
  multiline: {
    paddingHorizontal: Spacing.md,
    lineHeight: Typography.body.lineHeight,
    textAlignVertical: 'top',
  },
  inputInFrame: { flex: 1, minHeight: 46, paddingHorizontal: 0, paddingVertical: Spacing.sm },
  inputDisabled: { color: Colors.textSecondary },
});
