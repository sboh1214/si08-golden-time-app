import type { MedicalDocument } from '@/types/domain';

import {
  applyRecordFilter,
  countByDocumentType,
  DEFAULT_RECORD_FILTER,
  isFilterActive,
  matchesQuery,
  normalizeSearchText,
  sortDocuments,
} from '../filter';

function makeDocument(overrides: Partial<MedicalDocument> & Pick<MedicalDocument, 'id'>): MedicalDocument {
  return {
    title: '샘플내과의원 · 진료기록',
    documentType: 'medical_record',
    hospitalName: '샘플내과의원',
    department: '내과',
    visitDate: '2026-03-12',
    source: 'camera',
    pageCount: 1,
    status: 'completed',
    progress: 100,
    createdAt: '2026-03-12T09:00:00.000Z',
    updatedAt: '2026-03-12T09:00:00.000Z',
    ...overrides,
  };
}

const documents: MedicalDocument[] = [
  makeDocument({ id: 'a', visitDate: '2026-01-05', title: '1월 정기 진료' }),
  makeDocument({
    id: 'b',
    visitDate: '2026-03-20',
    documentType: 'lab_result',
    title: '혈액검사 결과',
    hospitalName: '한빛 대학병원',
    department: '내분비내과',
  }),
  makeDocument({
    id: 'c',
    visitDate: '2026-02-14',
    documentType: 'prescription',
    title: 'Metformin 처방전',
    hospitalName: '바른약국',
    department: undefined,
  }),
  makeDocument({
    id: 'd',
    visitDate: '2026-03-20',
    documentType: 'lab_result',
    title: '소변검사 결과',
    hospitalName: '한빛 대학병원',
    createdAt: '2026-03-21T09:00:00.000Z',
  }),
];

const ids = (list: MedicalDocument[]) => list.map((d) => d.id);

describe('normalizeSearchText', () => {
  it('대소문자와 공백을 무시한다', () => {
    expect(normalizeSearchText('  HbA1c 검사 ')).toBe('hba1c검사');
  });
});

describe('matchesQuery', () => {
  it('빈 검색어는 모든 문서와 일치한다', () => {
    expect(matchesQuery(documents[0], '   ')).toBe(true);
  });

  it('제목·병원명·진료과에서 찾는다', () => {
    expect(matchesQuery(documents[1], '혈액')).toBe(true);
    expect(matchesQuery(documents[1], '한빛')).toBe(true);
    expect(matchesQuery(documents[1], '내분비')).toBe(true);
    expect(matchesQuery(documents[1], '정형외과')).toBe(false);
  });

  it('영문은 대소문자를 구분하지 않는다', () => {
    expect(matchesQuery(documents[2], 'metFORMIN')).toBe(true);
  });

  it('띄어쓰기가 달라도 찾는다', () => {
    expect(matchesQuery(documents[1], '한빛대학병원')).toBe(true);
    expect(matchesQuery(documents[0], '샘플 내과')).toBe(true);
  });

  it('진료과가 없는 문서도 오류 없이 검사한다', () => {
    expect(matchesQuery(documents[2], '내과')).toBe(false);
  });
});

describe('sortDocuments', () => {
  it('진료일 최신순으로 정렬하고, 같은 날은 나중에 등록한 문서가 먼저 온다', () => {
    expect(ids(sortDocuments(documents, 'visit_desc'))).toEqual(['d', 'b', 'c', 'a']);
  });

  it('진료일 오래된순으로 정렬한다', () => {
    expect(ids(sortDocuments(documents, 'visit_asc'))).toEqual(['a', 'c', 'b', 'd']);
  });

  it('원본 배열을 바꾸지 않는다', () => {
    const before = ids(documents);
    sortDocuments(documents, 'visit_asc');
    expect(ids(documents)).toEqual(before);
  });
});

describe('countByDocumentType', () => {
  it('존재하는 종류만 등록 화면 선택지 순서로 센다', () => {
    expect(countByDocumentType(documents)).toEqual([
      { type: 'medical_record', count: 1 },
      { type: 'lab_result', count: 2 },
      { type: 'prescription', count: 1 },
    ]);
  });

  it('문서가 없으면 빈 배열', () => {
    expect(countByDocumentType([])).toEqual([]);
  });
});

describe('applyRecordFilter', () => {
  it('기본 조건은 전체 문서를 최신순으로 돌려준다', () => {
    expect(ids(applyRecordFilter(documents, DEFAULT_RECORD_FILTER))).toEqual(['d', 'b', 'c', 'a']);
  });

  it('문서 종류와 검색어를 함께 적용한다', () => {
    const result = applyRecordFilter(documents, {
      query: '소변',
      documentType: 'lab_result',
      sort: 'visit_desc',
    });
    expect(ids(result)).toEqual(['d']);
  });

  it('일치하는 문서가 없으면 빈 배열', () => {
    const result = applyRecordFilter(documents, {
      query: '혈액',
      documentType: 'prescription',
      sort: 'visit_desc',
    });
    expect(result).toEqual([]);
  });
});

describe('isFilterActive', () => {
  it('정렬만 바꾼 경우는 필터가 아니다', () => {
    expect(isFilterActive({ ...DEFAULT_RECORD_FILTER, sort: 'visit_asc' })).toBe(false);
  });

  it('공백뿐인 검색어는 필터가 아니다', () => {
    expect(isFilterActive({ ...DEFAULT_RECORD_FILTER, query: '  ' })).toBe(false);
  });

  it('검색어나 종류가 있으면 필터가 적용된 상태', () => {
    expect(isFilterActive({ ...DEFAULT_RECORD_FILTER, query: '혈액' })).toBe(true);
    expect(isFilterActive({ ...DEFAULT_RECORD_FILTER, documentType: 'opinion' })).toBe(true);
  });
});
