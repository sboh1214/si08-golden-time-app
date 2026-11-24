import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

import { Chip } from './chip';
import type { IconName } from './icon';

export interface ChoiceOption<T extends string | number> {
  value: T;
  label: string;
  icon?: IconName;
}

export interface ChoiceChipsProps<T extends string | number> {
  options: readonly ChoiceOption<T>[];
  /** 선택된 값 (없으면 null) */
  selected: T | null;
  onSelect: (value: T) => void;
  /** 잠금 (업로드 중 등) — 칩이 흐려지고 스크린리더에 '사용할 수 없음'으로 읽힌다 */
  disabled?: boolean;
  /** 선택지 묶음 이름 (스크린리더) */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** 지정하면 각 칩의 testID 는 `${testID}-${value}` */
  testID?: string;
}

/** 줄바꿈되는 단일 선택 칩 묶음 (문서 종류·진료과·빠른 날짜 선택·설정 선택지) */
export function ChoiceChips<T extends string | number>({
  options,
  selected,
  onSelect,
  disabled = false,
  accessibilityLabel,
  style,
  testID,
}: ChoiceChipsProps<T>) {
  return (
    <View style={[styles.wrap, style]} accessibilityLabel={accessibilityLabel} testID={testID}>
      {options.map((option) => (
        <Chip
          key={String(option.value)}
          label={option.label}
          icon={option.icon}
          selected={option.value === selected}
          disabled={disabled}
          onPress={() => {
            haptics.selection();
            onSelect(option.value);
          }}
          testID={testID ? `${testID}-${option.value}` : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
