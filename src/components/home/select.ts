/**
 * 홈 화면 요약용 순수 선택 함수 (`__tests__/select.test.ts`).
 */
import { sortDocuments } from '@/components/records/filter';
import { flagSeverity, isAbnormal } from '@/lib/labs';
import { isProcessing } from '@/lib/labels';
import type { LabCatalogItem, MedicalDocument, Question } from '@/types/domain';

/** 확인이 필요한(참고치를 벗어난) 검사 — 심각한 순, 같으면 최근 측정 순 */
export function selectAbnormalLabs(catalog: readonly LabCatalogItem[]): LabCatalogItem[] {
  return catalog
    .filter((item) => isAbnormal(item.latestFlag))
    .sort(
      (a, b) =>
        flagSeverity(b.latestFlag) - flagSeverity(a.latestFlag) ||
        b.latestMeasuredAt.localeCompare(a.latestMeasuredAt),
    );
}

/** 진료일 최신순 상위 N건 */
export function selectRecentDocuments(
  documents: readonly MedicalDocument[],
  limit: number,
): MedicalDocument[] {
  return sortDocuments(documents, 'visit_desc').slice(0, limit);
}

export interface DocumentStatusGroups {
  /** AI 해설 처리 중 (등록 순) */
  processing: MedicalDocument[];
  /** 분석 실패 (최근 등록 순) */
  failed: MedicalDocument[];
}

/** 홈 상단 알림 배너용 — 처리 중·실패 문서 */
export function selectDocumentStatusGroups(documents: readonly MedicalDocument[]): DocumentStatusGroups {
  const byCreated = [...documents].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return {
    processing: byCreated.filter((d) => isProcessing(d.status)),
    failed: byCreated.filter((d) => d.status === 'failed').reverse(),
  };
}

/** 아직 물어보지 않은 질문 — 최근 작성 순 */
export function selectPendingQuestions(questions: readonly Question[]): Question[] {
  return questions.filter((q) => !q.isAsked).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
