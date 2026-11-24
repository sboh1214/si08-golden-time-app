/**
 * 질문 노트 순수 함수 — 필터·정렬·개수 계산, 연결 문서 표시 문구.
 * 화면과 분리해 단위 테스트한다 (`__tests__/filters.test.ts`).
 */
import { formatDate } from '@/lib/format';
import type { MedicalDocument, Question } from '@/types/domain';

/** 질문 노트 상단 필터 */
export type QuestionFilterKey = 'pending' | 'asked' | 'all';

export const QUESTION_FILTERS: readonly { key: QuestionFilterKey; label: string }[] = [
  { key: 'pending', label: '물어볼 질문' },
  { key: 'asked', label: '물어본 질문' },
  { key: 'all', label: '전체' },
];

/**
 * 표시 순서: 아직 안 물어본 질문 먼저, 같은 그룹 안에서는 최신 작성순.
 * (서버 정렬과 같지만, 낙관적 업데이트 직후에도 순서가 일관되도록 화면에서 한 번 더 정렬한다)
 */
export function compareQuestions(a: Question, b: Question): number {
  if (a.isAsked !== b.isAsked) return a.isAsked ? 1 : -1;
  if (a.createdAt === b.createdAt) return 0;
  return a.createdAt < b.createdAt ? 1 : -1;
}

export function sortQuestions(questions: readonly Question[]): Question[] {
  return [...questions].sort(compareQuestions);
}

export function matchesQuestionFilter(question: Question, key: QuestionFilterKey): boolean {
  if (key === 'pending') return !question.isAsked;
  if (key === 'asked') return question.isAsked;
  return true;
}

/** 필터를 적용하고 표시 순서로 정렬한 목록 */
export function filterQuestions(questions: readonly Question[], key: QuestionFilterKey): Question[] {
  return sortQuestions(questions.filter((q) => matchesQuestionFilter(q, key)));
}

/** 필터별 개수 (세그먼트 라벨용) */
export function countQuestionsByFilter(questions: readonly Question[]): Record<QuestionFilterKey, number> {
  const asked = questions.filter((q) => q.isAsked).length;
  return { pending: questions.length - asked, asked, all: questions.length };
}

/** 질문에 연결된 문서 캡션 (예: '샘플내과의원 · 진료기록 · 2026.03.12') */
export function describeLinkedDocument(document: Pick<MedicalDocument, 'title' | 'visitDate'>): string {
  return `${document.title} · ${formatDate(document.visitDate)}`;
}
