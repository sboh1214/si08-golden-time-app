/**
 * 날짜·숫자 포맷 유틸 (한국어).
 * Intl 지원이 플랫폼마다 달라 직접 포맷한다.
 */

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 'YYYY-MM-DD' 또는 ISO 문자열 → 로컬 Date (YYYY-MM-DD 는 로컬 자정으로 해석) */
export function parseDate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

/** Date → 'YYYY-MM-DD' (로컬 기준) */
export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayString(): string {
  return toDateString(new Date());
}

/** '2026.03.12' */
export function formatDate(value: string): string {
  const d = parseDate(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/** '2026년 3월 12일 (목)' */
export function formatDateLong(value: string): string {
  const d = parseDate(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

/** '3월 12일' */
export function formatMonthDay(value: string): string {
  const d = parseDate(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** '2026년 3월' (타임라인 그룹 헤더) */
export function formatYearMonth(value: string): string {
  const d = parseDate(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

/** '2026.03' (타임라인 기간) */
export function formatYearMonthDot(value: string): string {
  const d = parseDate(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}`;
}

/** '26.03' (차트 축) */
export function formatShortDate(value: string): string {
  const d = parseDate(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${String(d.getFullYear()).slice(2)}.${pad(d.getMonth() + 1)}`;
}

/** 상대 시간 ('방금 전', '5분 전', '3일 전', 그 이상은 날짜) */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (Number.isNaN(diff)) return iso;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  return formatDate(toDateString(d));
}

/** 'YYYY-MM-DD' 형식이고 실제 존재하는 날짜인지 */
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = parseDate(value);
  return !Number.isNaN(d.getTime()) && toDateString(d) === value;
}

/** 파일 크기 '1.2MB' */
export function formatBytes(bytes?: number): string {
  if (bytes === undefined || !Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

/** 검사 수치 표시 (불필요한 소수점 제거) */
export function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 100) / 100);
}
