import { getErrorMessage } from '@/api/errors';
import { useUpdateQuestion } from '@/hooks/api';
import { notify } from '@/lib/dialog';
import { haptics } from '@/lib/haptics';
import type { Question } from '@/types/domain';

/**
 * '물어봤어요' 체크 토글.
 *
 * 화면에는 즉시 반영되고(낙관적 업데이트) 저장에 실패하면 원래대로 돌아간 뒤 안내한다.
 * 행마다 이 훅을 따로 쓰면, 여러 질문을 빠르게 연달아 체크해도 각 실패 알림이 누락되지 않는다.
 */
export function useToggleAsked(): (question: Question) => void {
  const { mutate } = useUpdateQuestion();
  return (question: Question) => {
    haptics.selection();
    mutate(
      { id: question.id, input: { isAsked: !question.isAsked } },
      {
        onError: (error) => {
          haptics.error();
          notify('체크 상태를 저장하지 못했어요', getErrorMessage(error));
        },
      },
    );
  };
}
