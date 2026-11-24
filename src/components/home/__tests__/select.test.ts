import type { LabCatalogItem, MedicalDocument, Question } from '@/types/domain';

import {
  selectAbnormalLabs,
  selectDocumentStatusGroups,
  selectPendingQuestions,
  selectRecentDocuments,
} from '../select';

function lab(
  code: string,
  latestFlag: LabCatalogItem['latestFlag'],
  latestMeasuredAt: string,
): LabCatalogItem {
  return {
    code,
    name: code,
    originalName: code,
    category: '혈액',
    unit: 'mg/dL',
    latestValue: 100,
    latestFlag,
    latestMeasuredAt,
    count: 1,
  };
}

function doc(id: string, overrides: Partial<MedicalDocument> = {}): MedicalDocument {
  return {
    id,
    title: id,
    documentType: 'medical_record',
    hospitalName: '샘플내과의원',
    visitDate: '2026-03-01',
    source: 'camera',
    pageCount: 1,
    status: 'completed',
    progress: 100,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

function question(id: string, isAsked: boolean, createdAt: string): Question {
  return { id, text: id, source: 'user', isAsked, createdAt, updatedAt: createdAt };
}

const ids = (list: { id: string }[]) => list.map((x) => x.id);

describe('selectAbnormalLabs', () => {
  it('정상 항목을 빼고 심각한 순 → 최근 측정 순으로 정렬한다', () => {
    const result = selectAbnormalLabs([
      lab('NORMAL', 'normal', '2026-03-10'),
      lab('HIGH_OLD', 'high', '2026-01-01'),
      lab('CRIT', 'critical_low', '2025-12-01'),
      lab('LOW_NEW', 'low', '2026-03-01'),
    ]);
    expect(result.map((x) => x.code)).toEqual(['CRIT', 'LOW_NEW', 'HIGH_OLD']);
  });

  it('모두 정상이면 빈 배열', () => {
    expect(selectAbnormalLabs([lab('A', 'normal', '2026-01-01')])).toEqual([]);
  });
});

describe('selectRecentDocuments', () => {
  it('진료일 최신순으로 개수를 제한한다', () => {
    const result = selectRecentDocuments(
      [
        doc('a', { visitDate: '2026-01-01' }),
        doc('b', { visitDate: '2026-03-01' }),
        doc('c', { visitDate: '2026-02-01' }),
      ],
      2,
    );
    expect(ids(result)).toEqual(['b', 'c']);
  });
});

describe('selectDocumentStatusGroups', () => {
  it('처리 중은 등록 순, 실패는 최근 등록 순으로 나눈다', () => {
    const result = selectDocumentStatusGroups([
      doc('done'),
      doc('ocr', { status: 'ocr', createdAt: '2026-03-02T00:00:00.000Z' }),
      doc('uploaded', { status: 'uploaded', createdAt: '2026-03-01T12:00:00.000Z' }),
      doc('failed_old', { status: 'failed', createdAt: '2026-02-01T00:00:00.000Z' }),
      doc('failed_new', { status: 'failed', createdAt: '2026-03-03T00:00:00.000Z' }),
    ]);
    expect(ids(result.processing)).toEqual(['uploaded', 'ocr']);
    expect(ids(result.failed)).toEqual(['failed_new', 'failed_old']);
  });
});

describe('selectPendingQuestions', () => {
  it('물어본 질문을 빼고 최근 작성 순으로 정렬한다', () => {
    const result = selectPendingQuestions([
      question('old', false, '2026-01-01T00:00:00.000Z'),
      question('asked', true, '2026-03-01T00:00:00.000Z'),
      question('new', false, '2026-02-01T00:00:00.000Z'),
    ]);
    expect(ids(result)).toEqual(['new', 'old']);
  });
});
