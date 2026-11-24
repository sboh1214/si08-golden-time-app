import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Colors, HitSize, Radius } from '@/constants/theme';

type CheckboxSize = 'md' | 'lg';

const BOX_SIZE: Record<CheckboxSize, number> = { md: 28, lg: 36 };

/** 체크박스 모양만 (누르는 동작은 감싸는 요소가 담당) */
export function CheckboxMark({ checked, size = 'md' }: { checked: boolean; size?: CheckboxSize }) {
  const box = BOX_SIZE[size];
  return (
    <View
      style={[
        styles.box,
        { width: box, height: box, borderRadius: size === 'lg' ? Radius.md : Radius.sm },
        checked ? styles.checked : styles.unchecked,
      ]}>
      {checked ? <Icon name="checkmark" size={Math.round(box * 0.72)} color="onPrimary" /> : null}
    </View>
  );
}

export interface QuestionCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  /** 스크린리더가 함께 읽을 질문 문장 */
  questionText: string;
}

/** '진료 때 물어봤어요' 체크박스 — 최소 44pt 터치 영역, 체크 표시(아이콘)로 상태를 구분한다. */
export function QuestionCheckbox({ checked, onToggle, questionText }: QuestionCheckboxProps) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`진료 때 물어봤어요: ${questionText}`}
      accessibilityHint={checked ? '물어볼 질문으로 되돌려요' : '물어본 질문으로 표시해요'}
      hitSlop={4}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}>
      <CheckboxMark checked={checked} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    minWidth: HitSize,
    minHeight: HitSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  checked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  unchecked: { backgroundColor: Colors.surface, borderColor: Colors.borderStrong },
});
