/**
 * API 오류 정규화.
 *
 * HTTP·네트워크·타임아웃 등 어떤 실패든 화면에서는 `ApiError` 하나로 다룬다.
 * `userMessage` 는 그대로 사용자에게 보여줘도 되는 한국어 문장이다.
 */

export type ApiErrorCode =
  | 'NETWORK' // 네트워크 연결 실패
  | 'TIMEOUT' // 응답 지연
  | 'UNAUTHORIZED' // 401/403
  | 'NOT_FOUND' // 404
  | 'VALIDATION' // 400/422
  | 'PAYLOAD_TOO_LARGE' // 413
  | 'RATE_LIMITED' // 429
  | 'SERVER' // 5xx
  | 'ANALYSIS_FAILED' // AI 해설 파이프라인 실패
  | 'UNKNOWN';

const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
  NETWORK: '인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
  TIMEOUT: '서버 응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.',
  UNAUTHORIZED: '접근 권한이 없어요. 앱을 다시 실행해 주세요.',
  NOT_FOUND: '요청한 정보를 찾을 수 없어요. 삭제되었을 수 있어요.',
  VALIDATION: '입력한 내용을 다시 확인해 주세요.',
  PAYLOAD_TOO_LARGE: '파일 용량이 너무 커요. 페이지 수를 줄이거나 화질을 낮춰 주세요.',
  RATE_LIMITED: '요청이 많아 잠시 대기 중이에요. 잠시 후 다시 시도해 주세요.',
  SERVER: '서버에 일시적인 문제가 있어요. 잠시 후 다시 시도해 주세요.',
  ANALYSIS_FAILED: '문서를 분석하지 못했어요. 더 선명한 사진으로 다시 등록해 주세요.',
  UNKNOWN: '알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
};

/** 재시도하면 성공할 가능성이 있는 오류 */
const RETRYABLE: ReadonlySet<ApiErrorCode> = new Set([
  'NETWORK',
  'TIMEOUT',
  'RATE_LIMITED',
  'SERVER',
]);

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  readonly userMessage: string;
  readonly details?: unknown;

  constructor(
    code: ApiErrorCode,
    options: { message?: string; status?: number; userMessage?: string; details?: unknown } = {},
  ) {
    super(options.message ?? `${code}${options.status ? ` (${options.status})` : ''}`);
    this.name = 'ApiError';
    this.code = code;
    this.status = options.status;
    this.userMessage = options.userMessage ?? DEFAULT_MESSAGES[code];
    this.details = options.details;
  }

  get retryable(): boolean {
    return RETRYABLE.has(this.code);
  }
}

export function codeFromStatus(status: number): ApiErrorCode {
  if (status === 401 || status === 403) return 'UNAUTHORIZED';
  if (status === 404) return 'NOT_FOUND';
  if (status === 400 || status === 422) return 'VALIDATION';
  if (status === 408) return 'TIMEOUT';
  if (status === 413) return 'PAYLOAD_TOO_LARGE';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER';
  return 'UNKNOWN';
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * fetch 가 네트워크 실패 때 던지는 TypeError 문구 (RN · Chrome · Node · Firefox · Safari).
 * 그 밖의 TypeError(응답 형식이 달라 생긴 프로그램 오류 등)는 네트워크 문제가 아니므로 UNKNOWN 으로 둔다.
 */
const FETCH_NETWORK_ERROR =
  /network request failed|failed to fetch|fetch failed|networkerror|load failed|network connection was lost/i;

/** 어떤 값이든 ApiError 로 변환 */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  if (error instanceof Error) {
    if (error.name === 'AbortError') return new ApiError('TIMEOUT', { message: error.message });
    if (error instanceof TypeError && FETCH_NETWORK_ERROR.test(error.message)) {
      return new ApiError('NETWORK', { message: error.message });
    }
    return new ApiError('UNKNOWN', { message: error.message });
  }
  return new ApiError('UNKNOWN', { message: String(error) });
}

/** fetch·응답 본문 읽기 단계에서 난 오류 — 중단은 TIMEOUT, 그 밖의 Error 는 문구와 관계없이 네트워크 실패로 본다 */
export function toTransportError(error: unknown): ApiError {
  if (!(error instanceof Error) || isApiError(error)) return toApiError(error);
  if (error.name === 'AbortError') return new ApiError('TIMEOUT', { message: error.message });
  return new ApiError('NETWORK', { message: error.message });
}

/** 화면 표시용 오류 문구 */
export function getErrorMessage(error: unknown): string {
  return toApiError(error).userMessage;
}
