import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { HitSize, Spacing } from '@/constants/theme';

export interface SourceLinkProps {
  onPress: () => void;
  /** 스크린리더용 대상 이름 (예: 제2형 당뇨병) */
  subject: string;
}

/** "원문 보기" — 항목의 근거가 된 진료기록 원문 문장으로 이동 */
export function SourceLink({ onPress, subject }: SourceLinkProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${subject} 원문 보기`}
      accessibilityHint="원문 대조 해설 화면에서 근거 문장을 보여드려요"
      hitSlop={4}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      <Icon name="swap-horizontal" size={18} color="primary" />
      <AppText variant="calloutStrong" color="primary">
        원문 보기
      </AppText>
      <Icon name="chevron-forward" size={16} color="primary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    minHeight: HitSize,
    paddingRight: Spacing.sm,
  },
  pressed: { opacity: 0.6 },
});
