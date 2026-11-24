/**
 * 질문 작성/수정 화면 규칙 — 글자 수 제한, 입력 검증, 예시 문장, 관련 기록 후보.
 * (서버 검증과 같은 기준을 화면에서도 미리 적용한다)
 */
import type { MedicalDocument, Question, UpdateQuestionInput } from '@/types/domain';

/** 질문 최대 길이 (API 계약: 300자) */
export const QUESTION_MAX_LENGTH = 300;

/** 의사 답변 메모 최대 길이 */
export const ANSWER_NOTE_MAX_LENGTH = 500;

/** 관련 기록 선택지로 보여 줄 최근 문서 수 */
export const RECENT_DOCUMENT_LIMIT = 6;

/** 질문 작성이 막막할 때 누르면 바로 채워지는 예시 문장 */
export const QUESTION_TEMPLATES: readonly string[] = [
  '이 약은 언제까지 먹어야 하나요?',
  '검사 수치가 왜 높게 나왔나요?',
  '생활습관에서 무엇을 바꾸면 좋을까요?',
  '다음 검사는 언제 하나요?',
];

/** 입력값이 올바르면 null, 아니면 사용자에게 보여 줄 안내 문구 */
export function validateQuestionText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return '질문 내용을 입력해 주세요.';
  if (trimmed.length > QUESTION_MAX_LENGTH) return `질문은 ${QUESTION_MAX_LENGTH}자 이내로 입력해 주세요.`;
  return null;
}

export interface QuestionFormValues {
  text: string;
  isAsked: boolean;
  answerNote: string;
}

/**
 * 수정 화면에서 바뀐 항목만 담은 PATCH 본문. 바뀐 것이 없으면 null.
 * (답변 메모를 비우면 빈 문자열을 보내 서버에서 삭제되게 한다)
 */
export function buildQuestionPatch(question: Question, values: QuestionFormValues): UpdateQuestionInput | null {
  const patch: UpdateQuestionInput = {};
  const text = values.text.trim();
  const answerNote = values.answerNote.trim();
  if (text !== question.text) patch.text = text;
  if (values.isAsked !== question.isAsked) patch.isAsked = values.isAsked;
  if (answerNote !== (question.answerNote ?? '')) patch.answerNote = answerNote;
  return Object.keys(patch).length > 0 ? patch : null;
}

/**
 * 관련 기록 선택지:해설이 끝난 문서를 최근 진료일 순으로 `limit` 개.
 * 이미 선택된 문서가 범위 밖이어도 선택 상태가 보이도록 목록에 포함한다.
 */
export function pickRecentDocuments(
  documents: readonly MedicalDocument[],
  selectedId?: string,
  limit: number = RECENT_DOCUMENT_LIMIT,
): MedicalDocument[] {
  const completed = documents
    .filter((d) => d.status === 'completed')
    .sort((a, b) => (a.visitDate === b.visitDate ? 0 : a.visitDate < b.visitDate ? 1 : -1));
  const recent = completed.slice(0, limit);
  if (selectedId && !recent.some((d) => d.id === selectedId)) {
    const selected = completed.find((d) => d.id === selectedId);
    if (selected) recent.push(selected);
  }
  return recent;
}
