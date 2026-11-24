/**
 * 질문 노트 탭 — 다음 진료 때 물어볼 질문 리스트 (과업 ⑤).
 *
 * - 물어볼 질문 / 물어본 질문 / 전체 필터 (개수 표시)
 * - 체크박스로 '물어봤어요' 즉시 토글 (낙관적 업데이트)
 * - 진료실 모드: 물어볼 질문을 큰 글씨 전체 화면으로 띄워 의사에게 보여 준다
 */
import { Tabs, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ClinicModeModal } from '@/components/questions/clinic-mode-modal';
import {
  countQuestionsByFilter,
  filterQuestions,
  type QuestionFilterKey,
} from '@/components/questions/filters';
import { QuestionFilterTabs } from '@/components/questions/question-filter-tabs';
import { QuestionItem } from '@/components/questions/question-item';
import { EmptyState, QueryState, type EmptyStateProps } from '@/components/states';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { HeaderButton } from '@/components/ui/header-button';
import { Screen } from '@/components/ui/screen';
import { Colors, ScreenPadding, Spacing } from '@/constants/theme';
import { useDocuments, useQuestions } from '@/hooks/api';
import { useManualRefresh } from '@/hooks/use-manual-refresh';
import type { MedicalDocument, Question } from '@/types/domain';

export default function QuestionsScreen() {
  const router = useRouter();
  const questionsQuery = useQuestions();
  const documentsQuery = useDocuments();
  const { refreshing, onRefresh } = useManualRefresh([questionsQuery.refetch, documentsQuery.refetch]);

  const openCreate = useCallback(() => router.push('/questions/edit'), [router]);

  // 탭 헤더 오른쪽 '질문 쓰기' 버튼 (목록을 스크롤해도 항상 보이도록)
  const headerOptions = useMemo(
    () => ({ headerRight: () => <HeaderButton icon="add-circle-outline" accessibilityLabel="질문 쓰기" onPress={openCreate} /> }),
    [openCreate],
  );

  return (
    <Screen scroll={false} padded={false}>
      <Tabs.Screen options={headerOptions} />
      <QueryState query={questionsQuery} loadingMessage="질문 노트를 불러오는 중이에요…">
        {(questions) => (
          <QuestionNote
            questions={questions}
            documents={documentsQuery.data}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onCreate={openCreate}
            onEdit={(question) => router.push({ pathname: '/questions/edit', params: { id: question.id } })}
            onOpenDocument={(id) => router.push({ pathname: '/documents/[id]', params: { id } })}
          />
        )}
      </QueryState>
    </Screen>
  );
}

interface QuestionNoteProps {
  questions: Question[];
  /** 연결 문서 캡션용 (불러오기 전·실패 시에는 캡션만 생략) */
  documents: MedicalDocument[] | undefined;
  refreshing: boolean;
  onRefresh: () => void;
  onCreate: () => void;
  onEdit: (question: Question) => void;
  onOpenDocument: (documentId: string) => void;
}

function QuestionNote({
  questions,
  documents,
  refreshing,
  onRefresh,
  onCreate,
  onEdit,
  onOpenDocument,
}: QuestionNoteProps) {
  const [filter, setFilter] = useState<QuestionFilterKey>('pending');
  const [clinicQuestionIds, setClinicQuestionIds] = useState<string[] | null>(null);

  const counts = useMemo(() => countQuestionsByFilter(questions), [questions]);
  const visible = useMemo(() => filterQuestions(questions, filter), [questions, filter]);
  const documentById = useMemo(
    () => new Map((documents ?? []).map((d) => [d.id, d] as const)),
    [documents],
  );

  const openClinicMode = () => {
    setClinicQuestionIds(filterQuestions(questions, 'pending').map((q) => q.id));
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.intro}>
        <AppText variant="heading">다음 진료 때 물어볼 질문을 모아 두세요</AppText>
        <AppText variant="callout" color="textSecondary">
          진료실에서는 ‘진료실 모드’를 켜서 큰 글씨로 보여 줄 수 있어요.
        </AppText>
      </View>
      <View style={styles.actions}>
        <Button label="질문 쓰기" icon="add" onPress={onCreate} style={styles.action} testID="question-create" />
        <Button
          label="진료실 모드"
          icon="expand-outline"
          variant="secondary"
          onPress={openClinicMode}
          disabled={counts.pending === 0}
          style={styles.action}
          accessibilityHint="물어볼 질문을 큰 글씨 전체 화면으로 보여 줘요"
          testID="question-clinic-mode"
        />
      </View>
      {counts.all > 0 ? <QuestionFilterTabs value={filter} counts={counts} onChange={setFilter} /> : null}
    </View>
  );

  return (
    <>
      <FlatList
        data={visible}
        keyExtractor={(q) => q.id}
        renderItem={({ item }) => (
          <QuestionItem
            question={item}
            document={item.documentId ? documentById.get(item.documentId) : undefined}
            onEdit={onEdit}
            onOpenDocument={onOpenDocument}
          />
        )}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyState {...emptyStateFor(filter, counts.all, onCreate)} />}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      />
      <ClinicModeModal
        questionIds={clinicQuestionIds}
        questions={questions}
        onClose={() => setClinicQuestionIds(null)}
      />
    </>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

/** 필터별 빈 상태 안내 */
function emptyStateFor(filter: QuestionFilterKey, total: number, onCreate: () => void): EmptyStateProps {
  if (total === 0) {
    return {
      icon: 'chatbubbles-outline',
      title: '아직 저장한 질문이 없어요',
      description: '진료 전에 궁금한 점을 적어 두면 진료실에서 잊지 않고 물어볼 수 있어요.',
      actionLabel: '첫 질문 쓰기',
      onAction: onCreate,
    };
  }
  if (filter === 'asked') {
    return {
      icon: 'chatbox-ellipses-outline',
      title: '아직 물어본 질문이 없어요',
      description: '진료 때 물어본 질문을 체크하면 여기에 모여요.',
    };
  }
  return {
    icon: 'checkmark-done-outline',
    title: '물어볼 질문을 모두 확인했어요',
    description: '새로 궁금한 점이 생기면 질문을 추가해 보세요.',
    actionLabel: '질문 쓰기',
    onAction: onCreate,
  };
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: ScreenPadding,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.huge,
  },
  header: { gap: Spacing.lg, marginBottom: Spacing.lg },
  intro: { gap: Spacing.xs },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  action: { flex: 1 },
  separator: { height: Spacing.md },
});
