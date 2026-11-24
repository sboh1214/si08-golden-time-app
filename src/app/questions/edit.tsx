/**
 * 질문 작성/수정 (모달) — 과업 ⑤ 질문 리스트.
 *
 * 파라미터
 * - id           : 있으면 수정, 없으면 새 질문 작성
 * - documentId   : 작성 시 미리 연결할 문서
 * - text         : 작성 시 미리 채울 질문 문장
 * - relatedLabel : 작성 시 함께 저장할 관련 항목 라벨 (예: 당화혈색소 7.4%)
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { HeaderButton } from '@/components/ui/header-button';
import { CreateQuestionForm, EditQuestionForm } from '@/components/questions/question-editor';
import { ErrorState, QueryState } from '@/components/states';
import { useQuestions } from '@/hooks/api';

type QuestionEditParams = {
  id?: string | string[];
  documentId?: string | string[];
  text?: string | string[];
  relatedLabel?: string | string[];
};

/** 쿼리 파라미터는 배열로 올 수도 있어 첫 값만 사용 (빈 문자열은 없는 값으로) */
function firstParam(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first ? first : undefined;
}

export default function QuestionEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<QuestionEditParams>();
  const id = firstParam(params.id);

  const close = useCallback(() => {
    // 딥링크로 바로 열린 경우처럼 돌아갈 화면이 없으면 질문 노트로 이동
    if (router.canGoBack()) router.back();
    else router.replace('/questions');
  }, [router]);

  const screenOptions = useMemo(
    () => ({
      title: id ? '질문 수정' : '질문 작성',
      headerLeft: () => <HeaderButton label="취소" onPress={close} />,
    }),
    [id, close],
  );

  return (
    <>
      <Stack.Screen options={screenOptions} />
      {id ? (
        <ExistingQuestion id={id} onClose={close} />
      ) : (
        <CreateQuestionForm
          initialText={firstParam(params.text)}
          initialDocumentId={firstParam(params.documentId)}
          relatedLabel={firstParam(params.relatedLabel)}
          onDone={close}
        />
      )}
    </>
  );
}

/** 수정할 질문을 목록 캐시에서 찾아 폼을 연다 (질문 단건 조회 API 는 없음) */
function ExistingQuestion({ id, onClose }: { id: string; onClose: () => void }) {
  const questionsQuery = useQuestions();
  // 삭제 직후 목록이 갱신되며 '찾을 수 없음'이 잠깐 보이지 않도록, 닫히는 동안은 빈 화면 유지
  const [deleted, setDeleted] = useState(false);
  if (deleted) return null;

  return (
    <QueryState query={questionsQuery} loadingMessage="질문을 불러오는 중이에요…">
      {(questions) => {
        const question = questions.find((q) => q.id === id);
        if (!question) {
          return <ErrorState title="질문을 찾을 수 없어요" message="이미 삭제된 질문일 수 있어요." />;
        }
        return (
          <EditQuestionForm
            key={question.id}
            question={question}
            onDone={onClose}
            onDeleted={() => {
              setDeleted(true);
              onClose();
            }}
          />
        );
      }}
    </QueryState>
  );
}
