/**
 * 내 기록(문서 목록) 검색·필터·정렬 순수 함수.
 *
 * 화면 상태와 분리해 단위 테스트로 검증한다 (`__tests__/filter.test.ts`).
 */
import { DOCUMENT_TYPE_OPTIONS } from '@/lib/labels';
import type { DocumentType, MedicalDocument } from '@/types/domain';

/** 진료일 최신순 / 오래된순 */
export type RecordSort = 'visit_desc' | 'visit_asc';

/** 문서 종류 필터 ('all' = 전체) */
export type RecordTypeFilter = DocumentType | 'all';

export interface RecordFilter {
  /** 검색어 (제목·병원명·진료과) */
  query: string;
  documentType: RecordTypeFilter;
  sort: RecordSort;
}

export const DEFAULT_RECORD_FILTER: RecordFilter = {
  query: '',
  documentType: 'all',
  sort: 'visit_desc',
};

export interface DocumentTypeCount {
  type: DocumentType;
  count: number;
}

/**
 * 검색용 문자열 정규화.
 * 대소문자를 구분하지 않고, 띄어쓰기가 제각각인 한국어 병원명("샘플 내과의원" / "샘플내과의원")도
 * 같은 것으로 찾을 수 있도록 공백을 모두 제거한다.
 */
export function normalizeSearchText(value: string): string {
  return value.toLocaleLowerCase('ko-KR').replace(/\s+/g, '');
}

/** 검색어가 제목·병원명·진료과 중 하나에 포함되면 true (빈 검색어는 항상 true) */
export function matchesQuery(document: MedicalDocument, query: string): boolean {
  const needle = normalizeSearchText(query);
  if (!needle) return true;
  return [document.title, document.hospitalName, document.department ?? ''].some((field) =>
    normalizeSearchText(field).includes(needle),
  );
}

/**
 * 진료일 기준 정렬 (원본 배열은 바꾸지 않는다).
 * 진료일이 같으면 나중에 등록한 문서를 최신으로 본다.
 */
export function sortDocuments(documents: readonly MedicalDocument[], sort: RecordSort): MedicalDocument[] {
  const direction = sort === 'visit_desc' ? -1 : 1;
  return [...documents].sort((a, b) => {
    const byVisit = a.visitDate.localeCompare(b.visitDate);
    if (byVisit !== 0) return byVisit * direction;
    return a.createdAt.localeCompare(b.createdAt) * direction;
  });
}

/** 문서 종류별 개수 — 실제로 존재하는 종류만, 등록 화면 선택지 순서대로 */
export function countByDocumentType(documents: readonly MedicalDocument[]): DocumentTypeCount[] {
  const counts = new Map<DocumentType, number>();
  for (const document of documents) {
    counts.set(document.documentType, (counts.get(document.documentType) ?? 0) + 1);
  }
  return DOCUMENT_TYPE_OPTIONS.filter((type) => counts.has(type)).map((type) => ({
    type,
    count: counts.get(type) ?? 0,
  }));
}

/** 검색어 → 문서 종류 → 정렬 순으로 적용한 목록 */
export function applyRecordFilter(
  documents: readonly MedicalDocument[],
  filter: RecordFilter,
): MedicalDocument[] {
  const filtered = documents.filter(
    (document) =>
      (filter.documentType === 'all' || document.documentType === filter.documentType) &&
      matchesQuery(document, filter.query),
  );
  return sortDocuments(filtered, filter.sort);
}

/** 기본값과 다른 검색·필터 조건이 있는지 (정렬은 결과 개수에 영향이 없어 제외) */
export function isFilterActive(filter: RecordFilter): boolean {
  return filter.documentType !== 'all' || normalizeSearchText(filter.query) !== '';
}
