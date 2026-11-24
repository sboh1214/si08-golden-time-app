/**
 * 건강수첩 API 클라이언트 계약.
 *
 * 화면은 이 인터페이스에만 의존한다. 구현체는 두 가지다.
 * - `HttpApiClient` : 창업동아리 백엔드·AI 해설 API (REST) 연동
 * - `MockApiClient` : 백엔드 없이 베타테스트·시연이 가능하도록 동일 계약을 흉내 내는 내장 서버
 *
 * 엔드포인트 명세는 `docs/API_CONTRACT.md` 참고.
 */
import type {
  CreateQuestionInput,
  DocumentAnalysis,
  HealthStatus,
  LabCatalogItem,
  LabTrend,
  MedicalDocument,
  Question,
  QuestionFilter,
  TimelineEvent,
  UpdateQuestionInput,
  UploadDocumentInput,
} from '@/types/domain';

import type { ApiMode } from './config';

/** 업로드 진행률 콜백 (0~1) */
export type UploadProgressHandler = (ratio: number) => void;

export interface ApiClient {
  readonly mode: ApiMode;

  /** GET /health */
  health(): Promise<HealthStatus>;

  /* 문서 ------------------------------------------------------------ */
  /** GET /v1/documents — 최신 진료일 순 */
  listDocuments(): Promise<MedicalDocument[]>;
  /** GET /v1/documents/{id} — 처리 상태 폴링에도 사용 */
  getDocument(id: string): Promise<MedicalDocument>;
  /** POST /v1/documents (multipart/form-data) */
  uploadDocument(
    input: UploadDocumentInput,
    onProgress?: UploadProgressHandler,
  ): Promise<MedicalDocument>;
  /** DELETE /v1/documents/{id} */
  deleteDocument(id: string): Promise<void>;
  /** POST /v1/documents/{id}/reanalyze — 실패한 문서 재분석 */
  reanalyzeDocument(id: string): Promise<MedicalDocument>;

  /* 구조화 결과·해설 ------------------------------------------------- */
  /** GET /v1/documents/{id}/analysis — status === 'completed' 일 때만 200 */
  getAnalysis(documentId: string): Promise<DocumentAnalysis>;

  /* 검사 수치 ------------------------------------------------------- */
  /** GET /v1/labs — 측정 이력이 있는 검사 항목 목록 */
  listLabCatalog(): Promise<LabCatalogItem[]>;
  /** GET /v1/labs/{code}/trend */
  getLabTrend(code: string): Promise<LabTrend>;

  /* 질문 리스트 ----------------------------------------------------- */
  /** GET /v1/questions?documentId= */
  listQuestions(filter?: QuestionFilter): Promise<Question[]>;
  /** POST /v1/questions */
  createQuestion(input: CreateQuestionInput): Promise<Question>;
  /** PATCH /v1/questions/{id} */
  updateQuestion(id: string, input: UpdateQuestionInput): Promise<Question>;
  /** DELETE /v1/questions/{id} */
  deleteQuestion(id: string): Promise<void>;
  /** POST /v1/documents/{id}/question-suggestions — AI 질문 추천 (저장하지 않음) */
  suggestQuestions(documentId: string): Promise<string[]>;

  /* 타임라인 -------------------------------------------------------- */
  /** GET /v1/timeline — 날짜 내림차순 */
  getTimeline(): Promise<TimelineEvent[]>;
}
