/**
 * AI 추천 질문 카드 (문서 정리 결과 화면에 삽입) — 과업 ⑤ 질문 리스트.
 *
 * 흐름: 'AI 추천 질문 받기' → 추천 생성 중 → 추천 목록(+ 담기 / 모두 담기) → 질문 노트
 * 사용자가 버튼을 눌렀을 때만 AI 추천을 요청한다 (불필요한 AI 호출 방지).
 */
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { getErrorMessage } from '@/api/errors';
import { ErrorState, LoadingState } from '@/components/states';
import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Colors, HitSize, Radius, Spacing } from '@/constants/theme';
import { useCreateQuestion, useQuestionSuggestions } from '@/hooks/api';
import { notify } from '@/lib/dialog';
import { haptics } from '@/lib/haptics';

export interface SuggestedQuestionsCardProps {
  documentId: string;
}

export function SuggestedQuestionsCard({ documentId }: SuggestedQuestionsCardProps) {
  const router = useRouter();
  const [requested, setRequested] = useState(false);
  const suggestionsQuery = useQuestionSuggestions(documentId, requested);
  // 문서 화면은 탭 위에 쌓인 화면이다. navigate 는 탭 묶음을 하나 더 쌓으므로
  // 아래에 있는 탭으로 돌아가(dismissTo) 질문 노트 탭을 연다.
  const openQuestionNote = () => router.dismissTo('/questions');

  let body: ReactNode;
  if (!requested) {
    body = (
      <Button
        label="AI 추천 질문 받기"
        icon="sparkles"
        variant="secondary"
        fullWidth
        onPress={() => {
          haptics.light();
          setRequested(true);
        }}
        accessibilityHint="이 기록을 바탕으로 진료 때 물어볼 질문을 추천받아요"
        testID="suggestions-request"
      />
    );
  } else if (suggestionsQuery.data) {
    // 백그라운드 재조회가 실패해도 이미 받은 목록은 계속 보여 준다
    body = (
      <SuggestionList
        key={documentId}
        documentId={documentId}
        initialSuggestions={suggestionsQuery.data}
        onOpenQuestionNote={openQuestionNote}
      />
    );
  } else if (suggestionsQuery.isError) {
    body = (
      <ErrorState
        fill={false}
        title="추천 질문을 받지 못했어요"
        error={suggestionsQuery.error}
        onRetry={() => void suggestionsQuery.refetch()}
        retrying={suggestionsQuery.isRefetching}
      />
    );
  } else {
    body = <LoadingState fill={false} message="AI가 이 기록에 맞는 질문을 고르고 있어요…" />;
  }

  return (
    <Card testID="suggested-questions-card">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Icon name="chatbubbles" size={20} color="primary" />
          </View>
          <View style={styles.headerTexts}>
            <AppText variant="heading" accessibilityRole="header">
              다음 진료 때 이렇게 물어보세요
            </AppText>
            <AppText variant="caption" color="textTertiary">
              AI가 이 기록을 보고 진료 때 물어보면 좋을 질문을 골라 드려요.
            </AppText>
          </View>
        </View>
        {body}
      </View>
    </Card>
  );
}

interface SuggestionListProps {
  documentId: string;
  /** 처음 받은 추천 목록 */
  initialSuggestions: string[];
  onOpenQuestionNote: () => void;
}

/**
 * 추천 목록 + 담기.
 *
 * 질문을 담으면 서버 추천 목록에서 그 질문이 빠진다 (API 계약 §4.8).
 * '담았어요 ✓' 표시가 사라지지 않도록 처음 받은 목록을 그대로 고정해 보여 준다.
 */
function SuggestionList({ documentId, initialSuggestions, onOpenQuestionNote }: SuggestionListProps) {
  const [suggestions] = useState(initialSuggestions);
  const [added, setAdded] = useState<ReadonlySet<string>>(() => new Set());
  const [saving, setSaving] = useState<ReadonlySet<string>>(() => new Set());
  const [addingAll, setAddingAll] = useState(false);
  const { mutateAsync: createQuestion } = useCreateQuestion();

  const remaining = suggestions.filter((text) => !added.has(text));

  /** 질문 1개 저장. 성공하면 true */
  const save = async (text: string): Promise<boolean> => {
    setSaving((prev) => new Set(prev).add(text));
    try {
      // 캐시된 추천 목록에서 담은 질문을 빼는 일은 useCreateQuestion 이 한다 (지금 보이는 목록은 고정이라 그대로다)
      await createQuestion({ text, source: 'ai', documentId });
      setAdded((prev) => new Set(prev).add(text));
      return true;
    } catch (error) {
      haptics.error();
      notify('질문을 담지 못했어요', getErrorMessage(error));
      return false;
    } finally {
      setSaving((prev) => {
        const next = new Set(prev);
        next.delete(text);
        return next;
      });
    }
  };

  const addOne = async (text: string) => {
    if (await save(text)) haptics.success();
  };

  const addAll = async () => {
    setAddingAll(true);
    // 저장 순서를 지키고 실패하면 멈추도록 하나씩 저장
    let allSaved = true;
    for (const text of remaining.filter((t) => !saving.has(t))) {
      if (!(await save(text))) {
        allSaved = false;
        break;
      }
    }
    setAddingAll(false);
    if (allSaved) haptics.success();
  };

  if (suggestions.length === 0) {
    return (
      <View style={styles.empty}>
        <Icon name="checkmark-done-circle-outline" size={28} color="primary" />
        <AppText variant="bodyStrong" align="center">
          추천할 새 질문이 없어요
        </AppText>
        <AppText variant="caption" color="textSecondary" align="center">
          이 기록에서 추천한 질문을 이미 담았을 수 있어요. 궁금한 점은 질문 노트에 직접 적어 보세요.
        </AppText>
        <Button label="질문 노트 보기" variant="ghost" icon="arrow-forward" iconPosition="right" onPress={onOpenQuestionNote} />
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {suggestions.map((text, index) => {
        const isAdded = added.has(text);
        return (
          <View key={text} style={[styles.item, index > 0 && styles.itemDivider]}>
            <View style={styles.bullet} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <AppText variant="captionStrong" color="primary">
                Q
              </AppText>
            </View>
            <AppText variant="body" scalable style={styles.itemText}>
              {text}
            </AppText>
            <View style={styles.itemAction}>
              {isAdded ? (
                <Badge label="담았어요" tone="normal" icon="checkmark" size="md" />
              ) : (
                <Button
                  label="담기"
                  icon="add"
                  variant="secondary"
                  loading={saving.has(text)}
                  disabled={addingAll}
                  onPress={() => void addOne(text)}
                  accessibilityHint={`‘${text}’ 질문을 질문 노트에 담아요`}
                />
              )}
            </View>
          </View>
        );
      })}

      <View style={styles.footer}>
        {remaining.length > 0 ? (
          <Button
            label={`모두 담기 (${remaining.length})`}
            icon="albums-outline"
            fullWidth
            loading={addingAll}
            disabled={saving.size > 0 && !addingAll}
            onPress={() => void addAll()}
            testID="suggestions-add-all"
          />
        ) : (
          <View style={styles.done} accessibilityLiveRegion="polite">
            <Icon name="checkmark-circle" size={18} color="normal" />
            <AppText variant="calloutStrong" color="normal">
              추천 질문을 모두 질문 노트에 담았어요
            </AppText>
          </View>
        )}
        <Button
          label="질문 노트 보기"
          variant="ghost"
          icon="arrow-forward"
          iconPosition="right"
          fullWidth
          onPress={onOpenQuestionNote}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  headerTexts: { flex: 1, gap: Spacing.xxs },
  list: { gap: Spacing.xs },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  itemDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  bullet: {
    width: 26,
    height: 26,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  itemText: { flex: 1 },
  itemAction: { minWidth: 96, alignItems: 'flex-end' },
  footer: { gap: Spacing.xs, marginTop: Spacing.sm },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: HitSize,
  },
  empty: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
});
