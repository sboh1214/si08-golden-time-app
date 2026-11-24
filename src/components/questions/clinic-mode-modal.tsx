import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Colors, HitSize, MaxContentWidth, Radius, ScreenPadding, Spacing } from '@/constants/theme';
import type { Question } from '@/types/domain';

import { CheckboxMark } from './question-checkbox';
import { useToggleAsked } from './use-toggle-asked';

export interface ClinicModeModalProps {
  /**
   * 진료실 모드를 연 순간의 '물어볼 질문' id 목록 (null 이면 닫힘).
   * 모드 안에서 체크해도 목록에서 사라지지 않도록 연 시점의 목록을 고정해 둔다.
   */
  questionIds: readonly string[] | null;
  /** 최신 질문 목록 (체크 상태 반영용) */
  questions: readonly Question[];
  onClose: () => void;
}

/**
 * 진료실 모드 — 의사에게 그대로 보여 줄 수 있도록 물어볼 질문을 큰 글씨로 띄운다.
 * React Native Modal 은 iOS·Android·웹에서 모두 동작한다.
 */
export function ClinicModeModal({ questionIds, questions, onClose }: ClinicModeModalProps) {
  const insets = useSafeAreaInsets();
  const items = (questionIds ?? [])
    .map((id) => questions.find((q) => q.id === id))
    .filter((q): q is Question => q !== undefined);
  const askedCount = items.filter((q) => q.isAsked).length;

  return (
    <Modal
      visible={questionIds !== null}
      animationType="slide"
      presentationStyle="fullScreen"
      // 안드로이드도 상태바·내비게이션 바 아래까지 그리고, 안전 영역 여백은 아래에서 직접 적용한다
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: Math.max(insets.bottom, Spacing.lg) },
        ]}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <View style={styles.headerTexts}>
              <AppText variant="captionStrong" color="primary">
                진료실 모드
              </AppText>
              <AppText variant="title" accessibilityRole="header">
                선생님, 여쭤보고 싶은 게 있어요
              </AppText>
              <AppText variant="callout" color="textSecondary" accessibilityLiveRegion="polite">
                {items.length}개 중 {askedCount}개 물어봤어요 · 물어본 질문은 눌러서 표시하세요
              </AppText>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="진료실 모드 닫기"
              hitSlop={8}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <Icon name="close" size={28} color="text" />
            </Pressable>
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {items.map((question, index) => (
              <ClinicQuestionRow key={question.id} question={question} number={index + 1} />
            ))}
          </ScrollView>

          <Button label="진료실 모드 닫기" size="lg" variant="outline" fullWidth onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

/** 진료실 모드의 질문 한 줄 — 줄 전체가 하나의 큰 체크박스 */
function ClinicQuestionRow({ question, number }: { question: Question; number: number }) {
  const toggleAsked = useToggleAsked();
  const { isAsked } = question;
  return (
    <Pressable
      onPress={() => toggleAsked(question)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isAsked }}
      accessibilityLabel={`${number}번 질문. ${question.text}`}
      accessibilityHint={isAsked ? '물어볼 질문으로 되돌려요' : '물어본 질문으로 표시해요'}
      style={({ pressed }) => [styles.row, isAsked && styles.rowAsked, pressed && styles.pressed]}>
      <View style={styles.number}>
        <AppText variant="heading" color="primary">
          {number}
        </AppText>
      </View>
      <AppText variant="title" color={isAsked ? 'textTertiary' : 'text'} style={styles.text}>
        {question.text}
      </AppText>
      <CheckboxMark checked={isAsked} size="lg" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface, paddingHorizontal: ScreenPadding },
  inner: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  headerTexts: { flex: 1, gap: Spacing.xs },
  close: {
    width: HitSize,
    height: HitSize,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceMuted,
  },
  pressed: { opacity: 0.7 },
  list: { flex: 1 },
  listContent: { gap: Spacing.md, paddingBottom: Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  rowAsked: { backgroundColor: Colors.surfaceMuted },
  number: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  text: { flex: 1 },
});
