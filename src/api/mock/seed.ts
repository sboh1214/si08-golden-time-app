/**
 * 내장 데모 서버 샘플 데이터.
 *
 * - `createSeedData`        : 앱 첫 실행(또는 데모 데이터 초기화) 때 채워 넣는 가상 환자의 1년치 기록
 * - `buildAnalysisForUpload`: 새로 등록한 문서의 처리가 끝났을 때 붙일 샘플 해설
 *
 * 실제 데이터 내용은 `samples/` 에 있다.
 * - samples/catalog.ts          검사 항목·약·진단명 공통 사전 (이름·단위·참고치·코드)
 * - samples/patient-story.ts    시드 문서 4건 + 분석 실패 문서 1건 + 질문 리스트
 * - samples/upload-templates.ts 업로드 문서용 해설 템플릿 (문서 종류별 2가지)
 * - samples/builder.ts          명세 → DocumentAnalysis 조립 (id·판정·문장↔항목 연결 계산)
 */
import { AI_DISCLAIMER_TEXT } from '@/lib/labels';
import type { DocumentAnalysis, IsoDateTime, MedicalDocument, Question } from '@/types/domain';

import {
  assembleAnalysis,
  documentIdScheme,
  seedIdScheme,
  summarizeAnalysis,
  type AnalysisContent,
} from './samples/builder';
import { createFailedDocument, STORY_DOCUMENTS, STORY_QUESTIONS } from './samples/patient-story';
import { createUploadContext, pickUploadTemplate } from './samples/upload-templates';

/** 시드 구조가 바뀌면 올린다 → 기기에 저장된 데모 데이터가 초기화된다 */
export const SEED_VERSION = 1;
export const MOCK_MODEL_VERSION = 'health-note-explainer-mock-1';
/** 앱의 AiDisclaimer 기본 문구와 같은 문장 (한 곳에서 관리) */
export const DISCLAIMER = AI_DISCLAIMER_TEXT;

export interface SeedData {
  documents: MedicalDocument[];
  analyses: Record<string, DocumentAnalysis>;
  questions: Question[];
}

/** 해설 본문에 문서·생성 정보와 고지 문구를 붙인다 */
function toAnalysis(content: AnalysisContent, documentId: string, generatedAt: IsoDateTime): DocumentAnalysis {
  return {
    documentId,
    generatedAt,
    modelVersion: MOCK_MODEL_VERSION,
    ...content,
    disclaimer: DISCLAIMER,
  };
}

/**
 * 시드 데이터 생성. 호출할 때마다 새 객체를 만들어 반환한다(공유 참조 없음).
 * @param now 앱 기준 현재 시각 — '최근 업로드' 로 보여야 하는 분석 실패 문서의 시각 계산에 쓴다.
 */
export function createSeedData(now: Date): SeedData {
  const documents: MedicalDocument[] = [];
  const analyses: Record<string, DocumentAnalysis> = {};

  for (const story of STORY_DOCUMENTS) {
    const { id, visitDate } = story.document;
    const content = assembleAnalysis(story.analysis, seedIdScheme(story.tag), visitDate);
    analyses[id] = toAnalysis(content, id, story.analyzedAt);
    documents.push({
      ...story.document,
      status: 'completed',
      progress: 100,
      summary: summarizeAnalysis(content),
      updatedAt: story.analyzedAt,
    });
  }
  documents.push(createFailedDocument(now));

  return {
    documents,
    analyses,
    questions: STORY_QUESTIONS.map((q) => ({ ...q })),
  };
}

export interface BuildAnalysisParams {
  document: MedicalDocument;
  /** 몇 번째 업로드인지 (템플릿 순환 선택용) */
  templateIndex: number;
  generatedAt: string;
}

/**
 * 업로드 문서의 처리가 끝났을 때 붙일 해설.
 * 문서 종류에 맞는 템플릿을 고르고, 모든 항목·문장 id 앞에 문서 id 를 붙여
 * 같은 템플릿을 여러 번 써도 id 가 겹치지 않게 한다. 검사 측정일은 문서의 진료일이다.
 */
export function buildAnalysisForUpload({
  document,
  templateIndex,
  generatedAt,
}: BuildAnalysisParams): DocumentAnalysis {
  const template = pickUploadTemplate(document.documentType, templateIndex);
  const spec = template(createUploadContext(document));
  const content = assembleAnalysis(spec, documentIdScheme(document.id), document.visitDate);
  return toAnalysis(content, document.id, generatedAt);
}
