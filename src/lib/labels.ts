/**
 * 도메인 enum → 화면 표시용 한국어 라벨.
 */
import type {
  DiagnosisStatus,
  DocumentSource,
  DocumentType,
  LabFlag,
  MedicalDocument,
  ProcessingStatus,
  TimelineEventType,
} from '@/types/domain';

/**
 * 환자에게 보이는 이름 — 등록한 항목은 어느 화면에서나 '진료기록'(붙여 씀)이라고 부르고,
 * 등록 버튼은 같은 문구를 쓴다. ('문서'는 코드·API 용어로만 쓴다)
 */
export const RECORD_NOUN = '진료기록';
export const UPLOAD_CTA_LABEL = `${RECORD_NOUN} 등록하기`;

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  medical_record: '진료기록',
  lab_result: '검사 결과지',
  prescription: '처방전',
  opinion: '소견서·진단서',
  discharge_summary: '퇴원요약지',
  other: '기타 문서',
};

/** 문서 등록 화면 선택지 순서 */
export const DOCUMENT_TYPE_OPTIONS: DocumentType[] = [
  'medical_record',
  'lab_result',
  'prescription',
  'opinion',
  'discharge_summary',
  'other',
];

export const DOCUMENT_SOURCE_LABEL: Record<DocumentSource, string> = {
  camera: '촬영',
  gallery: '사진',
  pdf: 'PDF',
};

export const PROCESSING_STATUS_LABEL: Record<ProcessingStatus, string> = {
  uploaded: '업로드 완료',
  ocr: '글자 인식 중',
  structuring: '항목 정리 중',
  explaining: '쉬운 해설 만드는 중',
  completed: '해설 완료',
  failed: '분석 실패',
};

/** 처리 단계 안내 (진행 화면) */
export const PROCESSING_STEPS: { status: Exclude<ProcessingStatus, 'completed' | 'failed'>; title: string; description: string }[] = [
  // 데모 서버(기기 안 저장)와 실서버 모두에 맞는 문구 — '서버로 전송' 같은 저장 위치 표현은 쓰지 않는다
  { status: 'uploaded', title: '파일 업로드', description: '올린 파일을 받아 처리를 시작했어요.' },
  { status: 'ocr', title: '글자 인식', description: '사진과 PDF에서 글자를 읽고 있어요.' },
  { status: 'structuring', title: '항목 정리', description: '진단명·검사 수치·처방 약을 찾아 정리해요.' },
  { status: 'explaining', title: '쉬운 해설', description: '어려운 의학 용어를 쉬운 말로 풀어요.' },
];

export function isProcessing(status: ProcessingStatus): boolean {
  return status !== 'completed' && status !== 'failed';
}

/** 처리 진행률 0~100 정수 (서버 값이 소수·범위 밖이어도 안전하게 표시) */
export function formatProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

/** 분석 실패 안내 제목 — 상태 배지('분석 실패')와 같은 말을 쓴다 */
export const ANALYSIS_FAILED_TITLE = '분석에 실패했어요';

/** 서버가 실패 사유를 주지 않았을 때(빈 문자열 포함) 보여 줄 안내 — 사진·PDF 어느 쪽에도 맞는 말 */
export const DEFAULT_FAILURE_REASON = '글자가 흐리거나 잘 보이지 않았을 수 있어요.';

export function failureReasonText(document: Pick<MedicalDocument, 'failureReason'>): string {
  return document.failureReason?.trim() || DEFAULT_FAILURE_REASON;
}

/** AI 해설 고지 기본 문구 — 앱 화면(AiDisclaimer)과 데모 서버 해설 응답이 같은 문장을 쓴다 */
export const AI_DISCLAIMER_TEXT =
  '이 해설은 AI가 진료기록을 쉽게 풀어 쓴 참고 자료예요. 의학적 진단이나 처방을 대신하지 않으니, 치료에 관한 결정은 꼭 담당 의료진과 상의하세요.';

/** 문서 상세 3개 화면 이름 — 헤더 제목·상단 탭·안내 문구에서 같은 이름을 쓴다 */
export const DOCUMENT_SECTION_LABEL = {
  result: '정리 결과',
  explanation: '원문 대조 해설',
  labs: '검사 수치',
} as const;

/** 상단 탭(세그먼트)용 짧은 이름 — 좁은 화면에서 잘리지 않도록. 스크린 리더에는 전체 이름을 읽어 준다 */
export const DOCUMENT_SECTION_SHORT_LABEL = {
  result: '정리 결과',
  explanation: '원문 해설',
  labs: '검사 수치',
} as const;

/** 정리 결과 항목 이름 — 결과 화면 개수 타일·해설 완료 요약·기록 카드가 같은 이름을 쓴다 */
export const SUMMARY_ITEM_LABEL = {
  diagnosis: '진단',
  lab: '검사',
  medication: '처방 약',
} as const;

/** 참고치를 벗어난 검사 개수 안내 (예: '확인 필요 3개') */
export function abnormalCountText(count: number): string {
  return `확인 필요 ${count}개`;
}

export const DIAGNOSIS_STATUS_LABEL: Record<DiagnosisStatus, string> = {
  confirmed: '확진',
  suspected: '의심',
  ruled_out: '배제',
  history: '과거력',
};

export const LAB_FLAG_LABEL: Record<LabFlag, string> = {
  critical_low: '매우 낮음',
  low: '낮음',
  normal: '정상',
  high: '높음',
  critical_high: '매우 높음',
};

export const TIMELINE_EVENT_LABEL: Record<TimelineEventType, string> = {
  visit: '진료',
  diagnosis: '진단',
  lab: '검사',
  prescription: '처방',
};
