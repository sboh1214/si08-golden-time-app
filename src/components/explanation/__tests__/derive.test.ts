import type { Diagnosis, ExplainedSentence, LabResult, Medication } from '@/types/domain';

import {
  FALLBACK_SECTION,
  TOOLBAR_ROW_KEY,
  buildRelatedItemIndex,
  buildRows,
  collectGlossary,
  dedupeTerms,
  findSentenceRowIndex,
  getSectionHint,
  groupSentencesBySection,
  isLowConfidence,
  resolveRelatedItems,
} from '../derive';

function makeSentence(overrides: Partial<ExplainedSentence> & Pick<ExplainedSentence, 'id' | 'order'>): ExplainedSentence {
  return {
    section: '현병력',
    original: 'original',
    plain: '쉬운 해설',
    terms: [],
    confidence: 0.9,
    relatedItemIds: [],
    ...overrides,
  };
}

const diagnosis: Diagnosis = {
  id: 'dx1',
  name: '제2형 당뇨병',
  originalTerm: 'Type 2 DM',
  status: 'confirmed',
  plainExplanation: '',
  sentenceIds: [],
};

const lab: LabResult = {
  id: 'lab1',
  code: 'HBA1C',
  name: '당화혈색소',
  originalName: 'HbA1c',
  category: '당뇨',
  value: 7.4,
  unit: '%',
  referenceRange: { low: 4, high: 6, text: '4.0-6.0' },
  flag: 'high',
  measuredAt: '2026-03-12',
  plainExplanation: '',
  sentenceIds: [],
};

const medication: Medication = {
  id: 'med1',
  name: '다이아벡스정 500mg',
  ingredient: '메트포르민',
  originalText: 'Metformin 500mg 1T bid',
  dose: '1정',
  frequency: '하루 2번',
  purpose: '',
  cautions: [],
  sentenceIds: [],
};

describe('isLowConfidence', () => {
  it('0.7 미만이면 확인 권장', () => {
    expect(isLowConfidence(0.69)).toBe(true);
    expect(isLowConfidence(0.7)).toBe(false);
    expect(isLowConfidence(0.95)).toBe(false);
  });

  it('값이 잘못되면 안전하게 확인 권장으로 본다', () => {
    expect(isLowConfidence(Number.NaN)).toBe(true);
  });
});

describe('groupSentencesBySection', () => {
  it('order 순으로 정렬하고 구역이 처음 나온 순서대로 묶는다', () => {
    const sections = groupSentencesBySection([
      makeSentence({ id: 's3', order: 3, section: '진단' }),
      makeSentence({ id: 's1', order: 1, section: '주호소' }),
      makeSentence({ id: 's4', order: 4, section: '주호소' }),
      makeSentence({ id: 's2', order: 2, section: '현병력' }),
    ]);
    expect(sections.map((s) => [s.title, s.sentences.map((x) => x.id)])).toEqual([
      ['주호소', ['s1', 's4']],
      ['현병력', ['s2']],
      ['진단', ['s3']],
    ]);
  });

  it('구역 이름이 비어 있으면 기타로 묶는다', () => {
    const sections = groupSentencesBySection([makeSentence({ id: 's1', order: 1, section: '  ' })]);
    expect(sections[0].title).toBe(FALLBACK_SECTION);
  });
});

describe('buildRows', () => {
  const sections = groupSentencesBySection([
    makeSentence({ id: 's1', order: 1, section: '주호소' }),
    makeSentence({ id: 's2', order: 2, section: '현병력' }),
    makeSentence({ id: 's3', order: 3, section: '현병력' }),
  ]);

  it('도구 막대 → 구역 제목 → 문장 순으로 만든다', () => {
    const rows = buildRows(sections, null);
    expect(rows.map((r) => r.key)).toEqual([
      TOOLBAR_ROW_KEY,
      'section:주호소',
      'sentence:s1',
      'section:현병력',
      'sentence:s2',
      'sentence:s3',
    ]);
    expect(rows[3]).toMatchObject({ type: 'section', title: '현병력', count: 2 });
  });

  it('선택한 구역만 남긴다', () => {
    const rows = buildRows(sections, '현병력');
    expect(rows.map((r) => r.key)).toEqual([TOOLBAR_ROW_KEY, 'section:현병력', 'sentence:s2', 'sentence:s3']);
  });

  it('문장이 없으면 빈 배열', () => {
    expect(buildRows([], null)).toEqual([]);
  });

  it('문장 행 인덱스를 찾는다', () => {
    const rows = buildRows(sections, null);
    expect(findSentenceRowIndex(rows, 's2')).toBe(4);
    expect(findSentenceRowIndex(rows, 'missing')).toBe(-1);
    expect(findSentenceRowIndex(buildRows(sections, '주호소'), 's2')).toBe(-1);
  });
});

describe('collectGlossary', () => {
  it('중복 용어를 합치고 가나다순으로 정렬한다', () => {
    const glossary = collectGlossary([
      makeSentence({
        id: 's2',
        order: 2,
        terms: [
          { term: '혈당', meaning: '피 속 포도당 농도' },
          { term: 'hba1c', meaning: '' },
        ],
      }),
      makeSentence({
        id: 's1',
        order: 1,
        terms: [
          { term: '고혈압', meaning: '혈압이 높은 상태' },
          { term: 'HbA1c ', meaning: '' },
        ],
      }),
      makeSentence({
        id: 's3',
        order: 3,
        terms: [
          { term: '당화혈색소', meaning: '2~3개월 평균 혈당' },
          { term: 'HBA1C', meaning: '최근 2~3개월 평균 혈당 수치' },
          { term: '  ', meaning: '무시' },
        ],
      }),
    ]);

    const korean = glossary.filter((g) => /[가-힣]/.test(g.term)).map((g) => g.term);
    expect(korean).toEqual(['고혈압', '당화혈색소', '혈당']);

    const hba1c = glossary.find((g) => g.key === 'hba1c');
    expect(hba1c).toEqual({
      key: 'hba1c',
      term: 'HbA1c',
      meaning: '최근 2~3개월 평균 혈당 수치',
      sentenceIds: ['s1', 's2', 's3'],
    });
    expect(glossary).toHaveLength(4);
  });
});

describe('dedupeTerms', () => {
  it('대소문자·공백만 다른 중복과 빈 용어를 제거한다', () => {
    expect(
      dedupeTerms([
        { term: 'BP', meaning: '혈압' },
        { term: ' bp', meaning: '중복' },
        { term: '', meaning: '빈 용어' },
        { term: 'HR', meaning: '심박수' },
      ]).map((t) => t.term),
    ).toEqual(['BP', 'HR']);
  });
});

describe('related items', () => {
  const index = buildRelatedItemIndex({ diagnoses: [diagnosis], labResults: [lab], medications: [medication] });

  it('id 로 종류·이름을 찾는다', () => {
    expect(index.get('dx1')).toEqual({ kind: 'diagnosis', id: 'dx1', label: '제2형 당뇨병' });
    expect(index.get('lab1')).toEqual({ kind: 'lab', id: 'lab1', label: '당화혈색소', code: 'HBA1C', flag: 'high' });
    expect(index.get('med1')).toEqual({ kind: 'medication', id: 'med1', label: '다이아벡스정 500mg' });
  });

  it('모르는 id 와 중복은 제외하고 순서를 유지한다', () => {
    expect(resolveRelatedItems(['med1', 'unknown', 'dx1', 'med1'], index).map((i) => i.id)).toEqual(['med1', 'dx1']);
  });
});

describe('getSectionHint', () => {
  it('띄어쓰기와 관계없이 구역 설명을 찾는다', () => {
    expect(getSectionHint('향후 계획')).toBe(getSectionHint('향후계획'));
    expect(getSectionHint('주호소')).toBeDefined();
    expect(getSectionHint('알 수 없는 구역')).toBeUndefined();
  });
});
