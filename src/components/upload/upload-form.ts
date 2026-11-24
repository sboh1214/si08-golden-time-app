/**
 * 문서 등록 정보 입력 폼 — 값·검증·업로드 입력 변환 (순수 함수).
 */
import { isValidDateString, toDateString, todayString } from '@/lib/format';
import { DOCUMENT_TYPE_LABEL } from '@/lib/labels';
import type { DocumentFile, DocumentSource, DocumentType, MedicalDocument, UploadDocumentInput } from '@/types/domain';

export interface UploadFormValues {
  documentType: DocumentType;
  hospitalName: string;
  department: string;
  /** YYYY-MM-DD (입력 중에는 미완성 값일 수 있음) */
  visitDate: string;
  title: string;
}

export type UploadFormField = keyof UploadFormValues;
export type UploadFormErrors = Partial<Record<UploadFormField, string>>;

export const INITIAL_UPLOAD_FORM: UploadFormValues = {
  documentType: 'medical_record',
  hospitalName: '',
  department: '',
  visitDate: '',
  title: '',
};

/** 입력 글자 수 제한 */
export const FIELD_MAX_LENGTH = {
  hospitalName: 40,
  department: 20,
  title: 60,
} as const;

/** 진료과 빠른 선택 (마지막 '기타'는 직접 입력) */
export const DEPARTMENT_PRESETS = [
  '내과',
  '가정의학과',
  '정형외과',
  '신경과',
  '피부과',
  '안과',
  '이비인후과',
  '산부인과',
  '소아청소년과',
] as const;

const MIN_VISIT_YEAR = 1900;

/**
 * 숫자만 남겨 `YYYY-MM-DD` 형태로 하이픈을 넣는다.
 * 다음 숫자가 있을 때만 하이픈을 붙여 지우기(백스페이스)가 자연스럽게 동작한다.
 * @example formatDateInput('20260312') // '2026-03-12'
 */
export function formatDateInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

/** 오늘 기준 n일 전 날짜 (YYYY-MM-DD, 로컬 기준) */
export function daysAgoString(days: number, base: Date = new Date()): string {
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() - days);
  return toDateString(date);
}

/** 진료일 검증. 문제가 없으면 undefined */
export function validateVisitDate(value: string, today: string = todayString()): string | undefined {
  if (!value) return '진료일을 입력해 주세요.';
  if (!isValidDateString(value)) return `날짜를 정확히 입력해 주세요. (예: ${today})`;
  if (value > today) return '오늘 이후의 날짜는 입력할 수 없어요.';
  if (Number(value.slice(0, 4)) < MIN_VISIT_YEAR) return '날짜를 다시 확인해 주세요.';
  return undefined;
}

export function validateUploadForm(values: UploadFormValues, today: string = todayString()): UploadFormErrors {
  const errors: UploadFormErrors = {};
  if (!values.hospitalName.trim()) errors.hospitalName = '병원 이름을 입력해 주세요.';
  const visitDateError = validateVisitDate(values.visitDate, today);
  if (visitDateError) errors.visitDate = visitDateError;
  return errors;
}

export function hasErrors(errors: UploadFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export interface RecentHospital {
  hospitalName: string;
  /** 그 병원에서 가장 최근에 받은 기록의 진료과 (없으면 undefined) */
  department?: string;
}

/**
 * 최근 방문한 병원 (진료일 최신순, 같은 병원은 한 번만) — 같은 병원을 반복 방문하는 환자가
 * 병원 이름을 매번 입력하지 않도록 빠른 선택에 쓴다.
 */
export function recentHospitals(
  documents: Pick<MedicalDocument, 'hospitalName' | 'department' | 'visitDate'>[],
  limit = 4,
): RecentHospital[] {
  const sorted = [...documents].sort((a, b) => b.visitDate.localeCompare(a.visitDate));
  const seen = new Set<string>();
  const result: RecentHospital[] = [];
  for (const doc of sorted) {
    const name = doc.hospitalName.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    result.push({ hospitalName: name, department: doc.department?.trim() || undefined });
    if (result.length >= limit) break;
  }
  return result;
}

/** 제목을 비워 두었을 때 서버가 만드는 제목과 같은 형식 (`병원명 · 문서종류`) */
export function autoTitle(values: Pick<UploadFormValues, 'hospitalName' | 'documentType'>): string {
  const hospital = values.hospitalName.trim() || '병원 이름';
  return `${hospital} · ${DOCUMENT_TYPE_LABEL[values.documentType]}`;
}

export function toUploadInput(
  values: UploadFormValues,
  files: DocumentFile[],
  source: DocumentSource,
): UploadDocumentInput {
  const department = values.department.trim();
  const title = values.title.trim();
  return {
    files,
    source,
    documentType: values.documentType,
    hospitalName: values.hospitalName.trim(),
    visitDate: values.visitDate,
    ...(department ? { department } : {}),
    ...(title ? { title } : {}),
  };
}
