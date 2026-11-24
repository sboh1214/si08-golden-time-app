/**
 * 건강수첩 도메인 모델.
 *
 * 창업동아리 백엔드·AI 해설 API 응답과 1:1로 대응하도록 설계했다.
 * API 계약 상세는 `docs/API_CONTRACT.md`, `docs/openapi.yaml` 참고.
 *
 * 날짜 규칙
 * - `YYYY-MM-DD` : 진료일·검사일 등 날짜만 의미가 있는 값 (`DateString`)
 * - ISO 8601     : 생성·수정 시각 등 시점 값 (`IsoDateTime`)
 */

export type DateString = string;
export type IsoDateTime = string;

/* ------------------------------------------------------------------ */
/* 문서                                                                */
/* ------------------------------------------------------------------ */

/** 문서 등록 경로 */
export type DocumentSource = 'camera' | 'gallery' | 'pdf';

/** 문서 종류 */
export type DocumentType =
  | 'medical_record' // 진료기록(외래/입원 경과기록)
  | 'lab_result' // 검사 결과지
  | 'prescription' // 처방전·약제 정보
  | 'opinion' // 소견서·진단서
  | 'discharge_summary' // 퇴원요약지
  | 'other';

/**
 * 문서 처리 상태 (AI 해설 파이프라인 단계)
 * uploaded → ocr(글자 인식) → structuring(항목 구조화) → explaining(해설 생성) → completed
 * 어느 단계에서든 실패하면 failed.
 */
export type ProcessingStatus =
  | 'uploaded'
  | 'ocr'
  | 'structuring'
  | 'explaining'
  | 'completed'
  | 'failed';

/** 업로드할 원본 파일 (사진 1장 = 1파일, PDF 1개 = 1파일) */
export interface DocumentFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  width?: number;
  height?: number;
}

export interface DocumentSummaryCounts {
  diagnosisCount: number;
  labCount: number;
  abnormalLabCount: number;
  medicationCount: number;
}

export interface MedicalDocument {
  id: string;
  title: string;
  documentType: DocumentType;
  hospitalName: string;
  department?: string;
  /** 진료(검사)일 */
  visitDate: DateString;
  source: DocumentSource;
  pageCount: number;
  /** 첫 페이지 미리보기 이미지 (PDF는 없을 수 있음) */
  thumbnailUri?: string;
  status: ProcessingStatus;
  /** 처리 진행률 0~100 */
  progress: number;
  /** status === 'failed' 일 때 사용자에게 보여줄 사유 */
  failureReason?: string;
  /** status === 'completed' 일 때 채워짐 */
  summary?: DocumentSummaryCounts;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface UploadDocumentInput {
  files: DocumentFile[];
  source: DocumentSource;
  documentType: DocumentType;
  hospitalName: string;
  department?: string;
  visitDate: DateString;
  /** 비워두면 서버가 `병원명 · 문서종류` 형식으로 생성 */
  title?: string;
}

/* ------------------------------------------------------------------ */
/* 구조화 결과                                                          */
/* ------------------------------------------------------------------ */

export type DiagnosisStatus = 'confirmed' | 'suspected' | 'ruled_out' | 'history';

export interface Diagnosis {
  id: string;
  /** 환자용 한글 진단명 (예: 제2형 당뇨병) */
  name: string;
  /** 원문 표기 (예: Type 2 DM, uncontrolled) */
  originalTerm: string;
  /** KCD-8 코드 (예: E11.9) */
  code?: string;
  status: DiagnosisStatus;
  /** 환자 눈높이 설명 */
  plainExplanation: string;
  /** 근거가 된 원문 문장 id (ExplainedSentence.id) */
  sentenceIds: string[];
}

export type LabFlag = 'critical_low' | 'low' | 'normal' | 'high' | 'critical_high';

export interface ReferenceRange {
  /** 하한 (없으면 상한만 있는 항목) */
  low?: number;
  /** 상한 (없으면 하한만 있는 항목) */
  high?: number;
  /** 결과지에 표기된 참고치 원문 (예: "4.0-6.0", "<100") */
  text: string;
}

export interface LabResult {
  id: string;
  /** 표준화 검사 코드 — 여러 문서의 같은 검사를 묶어 추이를 볼 때 사용 (예: HBA1C) */
  code: string;
  /** 환자용 한글 검사명 (예: 당화혈색소) */
  name: string;
  /** 원문 표기 (예: HbA1c) */
  originalName: string;
  /** 검사 분류 (예: 당뇨, 지질, 간기능, 신장기능, 혈액) */
  category: string;
  /** 측정값 — 수치형 결과만 계약 범위 (음성/양성 같은 정성 결과는 MVP 계약에서 보내지 않음) */
  value: number;
  unit: string;
  referenceRange: ReferenceRange;
  flag: LabFlag;
  measuredAt: DateString;
  plainExplanation: string;
  sentenceIds: string[];
}

export interface Medication {
  id: string;
  /** 제품명 (예: 다이아벡스정 500mg) */
  name: string;
  /** 성분명 (예: 메트포르민) */
  ingredient: string;
  /** 원문 표기 (예: Metformin 500mg 1T bid pc) */
  originalText: string;
  /** 1회 복용량 (예: 1정) */
  dose: string;
  /** 복용 방법 (예: 하루 2번, 아침·저녁 식사 직후) */
  frequency: string;
  durationDays?: number;
  /** 왜 먹는 약인지 쉬운 설명 */
  purpose: string;
  /** 복용 시 주의사항 */
  cautions: string[];
  sentenceIds: string[];
}

/* ------------------------------------------------------------------ */
/* 원문 대조 해설                                                        */
/* ------------------------------------------------------------------ */

export interface GlossaryTerm {
  term: string;
  meaning: string;
}

export interface ExplainedSentence {
  id: string;
  order: number;
  /** 원문 내 구역 (예: 주호소, 현병력, 검사 결과, 진단, 처방, 향후 계획) */
  section: string;
  /** 진료기록 원문 문장 */
  original: string;
  /** 환자 눈높이 해설 */
  plain: string;
  /** 문장 안의 의학 용어 풀이 */
  terms: GlossaryTerm[];
  /** AI 해설 신뢰도 0~1 (낮으면 "의료진 확인 권장" 표시) */
  confidence: number;
  /** 관련 구조화 항목 id (Diagnosis/LabResult/Medication) */
  relatedItemIds: string[];
}

export interface DocumentAnalysis {
  documentId: string;
  generatedAt: IsoDateTime;
  /** AI 해설 파이프라인 버전 */
  modelVersion: string;
  /** 문서 전체 3~4문장 요약 */
  overallSummary: string;
  diagnoses: Diagnosis[];
  labResults: LabResult[];
  medications: Medication[];
  sentences: ExplainedSentence[];
  /** AI가 추천하는 "다음 진료 때 물어볼 질문" */
  suggestedQuestions: string[];
  /** 해설 하단 고지 문구 */
  disclaimer: string;
}

/* ------------------------------------------------------------------ */
/* 검사 추이                                                            */
/* ------------------------------------------------------------------ */

export interface LabTrendPoint {
  documentId: string;
  labResultId: string;
  measuredAt: DateString;
  value: number;
  flag: LabFlag;
}

export interface LabTrend {
  code: string;
  name: string;
  originalName: string;
  category: string;
  unit: string;
  /** 가장 최근 결과의 참고치 */
  referenceRange: ReferenceRange;
  /** 측정일 오름차순 */
  points: LabTrendPoint[];
  plainExplanation: string;
}

/** 지금까지 측정된 검사 항목 목록 (추이 화면 진입용) */
export interface LabCatalogItem {
  code: string;
  name: string;
  originalName: string;
  category: string;
  unit: string;
  latestValue: number;
  latestFlag: LabFlag;
  latestMeasuredAt: DateString;
  count: number;
  /** 최근 측정값 (오래된 순, 최대 6개) — 목록의 미니 추이 그래프용. 서버가 생략할 수 있음 */
  recentValues?: number[];
}

/* ------------------------------------------------------------------ */
/* 질문 리스트                                                          */
/* ------------------------------------------------------------------ */

export type QuestionSource = 'ai' | 'user';

export interface Question {
  id: string;
  text: string;
  source: QuestionSource;
  /** 질문이 나온 문서 */
  documentId?: string;
  /** 관련 항목 표시용 라벨 (예: 당화혈색소 7.4%) */
  relatedLabel?: string;
  /** 진료 때 물어봤는지 */
  isAsked: boolean;
  /** 의사에게 들은 답변 메모 */
  answerNote?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CreateQuestionInput {
  text: string;
  source?: QuestionSource;
  documentId?: string;
  relatedLabel?: string;
}

export interface UpdateQuestionInput {
  text?: string;
  isAsked?: boolean;
  answerNote?: string;
}

export interface QuestionFilter {
  documentId?: string;
}

/* ------------------------------------------------------------------ */
/* 건강 타임라인                                                        */
/* ------------------------------------------------------------------ */

export type TimelineEventType = 'visit' | 'diagnosis' | 'lab' | 'prescription';

export interface TimelineEvent {
  id: string;
  date: DateString;
  type: TimelineEventType;
  title: string;
  description: string;
  documentId: string;
  hospitalName: string;
  department?: string;
  /** type === 'lab' 일 때 */
  labCode?: string;
  flag?: LabFlag;
}

/* ------------------------------------------------------------------ */
/* 시스템                                                              */
/* ------------------------------------------------------------------ */

export interface HealthStatus {
  ok: boolean;
  version: string;
  /** AI 해설 파이프라인 버전 */
  modelVersion?: string;
}
