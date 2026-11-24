import type { Ref } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { ChoiceChips, type ChoiceOption } from '@/components/ui/choice-chips';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useToday } from '@/hooks/use-today';
import { parseDate } from '@/lib/format';

import { daysAgoString, formatDateInput } from './upload-form';

type QuickDate = 'today' | 'yesterday';

const QUICK_OPTIONS: readonly ChoiceOption<QuickDate>[] = [
  { value: 'today', label: '오늘', icon: 'today-outline' },
  { value: 'yesterday', label: '어제' },
];

export interface DateFieldProps {
  /** YYYY-MM-DD (입력 중에는 미완성 값) */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
  invalid?: boolean;
  disabled?: boolean;
  ref?: Ref<TextInputInstance>;
  testID?: string;
}

/**
 * 진료일 입력.
 * 숫자만 입력하면 `YYYY-MM-DD` 로 자동 정리되고, 자주 쓰는 날짜는 칩으로 바로 고른다.
 * (네이티브 날짜 선택기는 추가 의존성이 필요해 MVP 에서는 텍스트 입력 + 빠른 선택으로 대신한다)
 */
export function DateField({
  value,
  onChange,
  onBlur,
  onSubmitEditing,
  invalid = false,
  disabled = false,
  ref,
  testID,
}: DateFieldProps) {
  // 렌더 중에 시계를 읽으면 React Compiler 가 첫 값을 캐시하므로, 자정·앱 복귀 때 갱신되는 오늘 날짜에서 계산한다
  const today = useToday();
  const quickValues: Record<QuickDate, string> = {
    today,
    yesterday: daysAgoString(1, parseDate(today)),
  };
  const selectedQuick = (Object.keys(quickValues) as QuickDate[]).find((key) => quickValues[key] === value) ?? null;

  return (
    <View style={styles.container}>
      <TextField
        ref={ref}
        value={value}
        onChangeText={(text) => onChange(formatDateInput(text))}
        onBlur={onBlur}
        onSubmitEditing={onSubmitEditing}
        placeholder="예: 2026-03-12"
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={10}
        returnKeyType="next"
        editable={!disabled}
        invalid={invalid}
        accessibilityLabel="진료일"
        accessibilityHint="연도 4자리, 월 2자리, 일 2자리 숫자를 차례로 입력해 주세요."
        testID={testID}
      />
      <ChoiceChips
        options={QUICK_OPTIONS}
        selected={selectedQuick}
        onSelect={(key) => onChange(quickValues[key])}
        disabled={disabled}
        testID={testID ? `${testID}-quick` : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
});
