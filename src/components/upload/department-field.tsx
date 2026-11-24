import { useRef } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { ChoiceChips, type ChoiceOption } from '@/components/ui/choice-chips';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';

import { DEPARTMENT_PRESETS, FIELD_MAX_LENGTH } from './upload-form';

/** '기타' 칩 값 (선택 시 입력칸을 비우고 직접 입력하도록 안내) */
const OTHER = '기타';

const OPTIONS: readonly ChoiceOption<string>[] = [...DEPARTMENT_PRESETS, OTHER].map((label) => ({
  value: label,
  label,
}));

const PRESET_SET: ReadonlySet<string> = new Set(DEPARTMENT_PRESETS);

export interface DepartmentFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  testID?: string;
}

/**
 * 진료과 입력 (선택 항목).
 * 자주 가는 진료과는 칩으로 바로 고르고, 목록에 없으면 '기타'를 눌러 직접 입력한다.
 * 선택된 칩을 다시 누르면 선택이 해제된다.
 */
export function DepartmentField({ value, onChange, disabled = false, testID }: DepartmentFieldProps) {
  const inputRef = useRef<TextInputInstance>(null);
  const trimmed = value.trim();
  const selected = PRESET_SET.has(trimmed) ? trimmed : trimmed ? OTHER : null;

  const handleSelect = (option: string) => {
    if (option === OTHER) {
      if (selected !== OTHER) onChange('');
      inputRef.current?.focus();
      return;
    }
    onChange(option === selected ? '' : option);
  };

  return (
    <View style={styles.container}>
      <ChoiceChips
        options={OPTIONS}
        selected={selected}
        onSelect={handleSelect}
        disabled={disabled}
        testID={testID ? `${testID}-chips` : undefined}
      />
      <TextField
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        placeholder="목록에 없으면 직접 입력 (예: 내분비내과)"
        maxLength={FIELD_MAX_LENGTH.department}
        returnKeyType="done"
        editable={!disabled}
        accessibilityLabel="진료과 직접 입력"
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
});
