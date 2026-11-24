import type { Question } from '@/types/domain';

import {
  compareQuestions,
  countQuestionsByFilter,
  describeLinkedDocument,
  filterQuestions,
  matchesQuestionFilter,
  sortQuestions,
} from '../filters';

function question(id: string, overrides: Partial<Question> = {}): Question {
  return {
    id,
    text: `질문 ${id}`,
    source: 'user',
    isAsked: false,
    createdAt: '2026-03-01T09:00:00.000Z',
    updatedAt: '2026-03-01T09:00:00.000Z',
    ...overrides,
  };
}

const list: Question[] = [
  question('old-pending', { createdAt: '2026-01-01T00:00:00.000Z' }),
  question('asked', { isAsked: true, createdAt: '2026-03-10T00:00:00.000Z' }),
  question('new-pending', { createdAt: '2026-03-05T00:00:00.000Z' }),
];

describe('질문 정렬', () => {
  it('안 물어본 질문을 먼저, 그 안에서는 최신 작성순으로 정렬한다', () => {
    expect(sortQuestions(list).map((q) => q.id)).toEqual(['new-pending', 'old-pending', 'asked']);
  });

  it('원본 배열을 바꾸지 않는다', () => {
    const before = list.map((q) => q.id);
    sortQuestions(list);
    expect(list.map((q) => q.id)).toEqual(before);
  });

  it('작성 시각이 같으면 순서를 유지한다', () => {
    const a = question('a');
    const b = question('b');
    expect(compareQuestions(a, b)).toBe(0);
  });
});

describe('질문 필터', () => {
  it('물어볼 질문은 isAsked=false 만', () => {
    expect(filterQuestions(list, 'pending').map((q) => q.id)).toEqual(['new-pending', 'old-pending']);
  });

  it('물어본 질문은 isAsked=true 만', () => {
    expect(filterQuestions(list, 'asked').map((q) => q.id)).toEqual(['asked']);
  });

  it('전체는 모든 질문을 표시 순서로', () => {
    expect(filterQuestions(list, 'all')).toHaveLength(3);
  });

  it('matchesQuestionFilter 는 필터 키와 일치 여부를 반환한다', () => {
    const asked = question('x', { isAsked: true });
    expect(matchesQuestionFilter(asked, 'pending')).toBe(false);
    expect(matchesQuestionFilter(asked, 'asked')).toBe(true);
    expect(matchesQuestionFilter(asked, 'all')).toBe(true);
  });
});

describe('필터별 개수', () => {
  it('각 필터의 질문 수를 센다', () => {
    expect(countQuestionsByFilter(list)).toEqual({ pending: 2, asked: 1, all: 3 });
  });

  it('질문이 없으면 모두 0', () => {
    expect(countQuestionsByFilter([])).toEqual({ pending: 0, asked: 0, all: 0 });
  });
});

describe('연결 문서 캡션', () => {
  it('문서 제목과 진료일을 함께 보여 준다', () => {
    expect(describeLinkedDocument({ title: '샘플내과의원 · 진료기록', visitDate: '2026-03-12' })).toBe(
      '샘플내과의원 · 진료기록 · 2026.03.12',
    );
  });
});
