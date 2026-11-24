import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { QueryLike } from '@/components/states/query-state';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/section-header';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Question } from '@/types/domain';

import { SectionNote, SectionQueryState } from './section-state';
import { selectPendingQuestions } from './select';

const PREVIEW_COUNT = 2;

/** 홈: 다음 진료 때 물어볼 질문 (아직 물어보지 않은 질문 수 + 미리보기 2개) */
export function QuestionsSection({ query }: { query: QueryLike<Question[]> }) {
  const router = useRouter();
  const openQuestions = () => router.navigate('/questions');
  const pending = query.data ? selectPendingQuestions(query.data) : [];

  return (
    <View>
      <SectionHeader
        title="다음 진료 때 물어볼 질문"
        count={pending.length > 0 ? pending.length : undefined}
        actionLabel="전체 보기"
        onActionPress={openQuestions}
      />
      <SectionQueryState query={query} loadingLabel="질문 노트를 불러오는 중이에요" skeletonRows={2}>
        {(questions) => {
          if (questions.length === 0) {
            return (
              <SectionNote
                icon="chatbubble-ellipses-outline"
                title="아직 준비한 질문이 없어요"
                description="해설을 읽다 궁금한 점을 적어 두면 진료 시간을 알차게 쓸 수 있어요."
              />
            );
          }
          if (pending.length === 0) {
            return (
              <SectionNote
                icon="checkmark-done-circle"
                tone="normal"
                title="준비한 질문을 모두 물어봤어요"
                description="의사에게 들은 답변은 질문 노트에 메모해 둘 수 있어요."
              />
            );
          }
          const preview = pending.slice(0, PREVIEW_COUNT);
          return (
            <Card
              onPress={openQuestions}
              accessibilityLabel={`아직 물어보지 않은 질문 ${pending.length}개. ${preview.map((q) => q.text).join('. ')}`}
              accessibilityHint="눌러서 질문 노트를 열어요"
              testID="home-questions">
              <View style={styles.summaryRow}>
                <View style={styles.iconCircle}>
                  <Icon name="chatbubbles" size={20} color="caution" />
                </View>
                <AppText variant="bodyStrong" style={styles.flex}>
                  아직 물어보지 않은 질문 {pending.length}개
                </AppText>
                <Icon name="chevron-forward" size={18} color="textTertiary" />
              </View>
              <View style={styles.list}>
                {preview.map((question) => (
                  <View key={question.id} style={styles.item}>
                    <AppText variant="bodyStrong" color="primary">
                      Q.
                    </AppText>
                    <View style={styles.flex}>
                      <AppText variant="body" numberOfLines={2}>
                        {question.text}
                      </AppText>
                      {question.relatedLabel ? (
                        <AppText variant="caption" color="textTertiary" numberOfLines={1}>
                          {question.relatedLabel}
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          );
        }}
      </SectionQueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  item: { flexDirection: 'row', gap: Spacing.sm },
});
