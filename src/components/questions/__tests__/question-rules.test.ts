import type { MedicalDocument, ProcessingStatus, Question } from '@/types/domain';

import {
  QUESTION_MAX_LENGTH,
  buildQuestionPatch,
  pickRecentDocuments,
  validateQuestionText,
} from '../question-rules';

function document(id: string, visitDate: string, status: ProcessingStatus = 'completed'): MedicalDocument {
  return {
    id,
    title: `문서 ${id}`,
    documentType: 'medical_record',
    hospitalName: '샘플병원',
    visitDate,
    source: 'camera',
    pageCount: 1,
    status,
    progress: status === 'completed' ? 100 : 40,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  };
}

describe('질문 입력 검증', () => {
  it('비어 있거나 공백뿐이면 안내 문구를 반환한다', () => {
    expect(validateQuestionText('')).toBe('질문 내용을 입력해 주세요.');
    expect(validateQuestionText('   \n ')).toBe('질문 내용을 입력해 주세요.');
  });

  it('최대 길이를 넘으면 안내 문구를 반환한다', () => {
    expect(validateQuestionText('가'.repeat(QUESTION_MAX_LENGTH + 1))).toBe('질문은 300자 이내로 입력해 주세요.');
  });

  it('앞뒤 공백은 길이에서 제외한다', () => {
    expect(validateQuestionText(`  ${'가'.repeat(QUESTION_MAX_LENGTH)}  `)).toBeNull();
  });

  it('올바른 질문이면 null', () => {
    expect(validateQuestionText('이 약은 언제까지 먹어야 하나요?')).toBeNull();
  });
});

describe('관련 기록 후보', () => {
  const documents = [
    document('a', '2025-11-02'),
    document('b', '2026-03-12'),
    document('processing', '2026-04-01', 'ocr'),
    document('failed', '2026-04-02', 'failed'),
    document('c', '2026-01-20'),
  ];

  it('해설이 끝난 문서만 최근 진료일 순으로', () => {
    expect(pickRecentDocuments(documents).map((d) => d.id)).toEqual(['b', 'c', 'a']);
  });

  it('개수를 제한한다', () => {
    expect(pickRecentDocuments(documents, undefined, 2).map((d) => d.id)).toEqual(['b', 'c']);
  });

  it('선택된 문서가 범위 밖이면 뒤에 덧붙인다', () => {
    expect(pickRecentDocuments(documents, 'a', 2).map((d) => d.id)).toEqual(['b', 'c', 'a']);
  });

  it('선택된 문서가 완료되지 않았거나 없으면 덧붙이지 않는다', () => {
    expect(pickRecentDocuments(documents, 'processing', 2).map((d) => d.id)).toEqual(['b', 'c']);
    expect(pickRecentDocuments(documents, 'missing', 2).map((d) => d.id)).toEqual(['b', 'c']);
  });
});

describe('수정 내용(PATCH) 계산', () => {
  const question: Question = {
    id: 'q1',
    text: '이 약은 언제까지 먹어야 하나요?',
    source: 'ai',
    isAsked: false,
    answerNote: undefined,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  };
  const unchanged = { text: question.text, isAsked: false, answerNote: '' };

  it('바뀐 것이 없으면 null', () => {
    expect(buildQuestionPatch(question, unchanged)).toBeNull();
    expect(buildQuestionPatch(question, { ...unchanged, text: `  ${question.text} ` })).toBeNull();
  });

  it('바뀐 항목만 담는다 (앞뒤 공백 제거)', () => {
    expect(buildQuestionPatch(question, { ...unchanged, isAsked: true, answerNote: ' 3개월 더 복용 ' })).toEqual({
      isAsked: true,
      answerNote: '3개월 더 복용',
    });
    expect(buildQuestionPatch(question, { ...unchanged, text: '새 질문' })).toEqual({ text: '새 질문' });
  });

  it('답변 메모를 비우면 빈 문자열로 보낸다', () => {
    expect(buildQuestionPatch({ ...question, answerNote: '기존 메모' }, unchanged)).toEqual({ answerNote: '' });
  });
});
