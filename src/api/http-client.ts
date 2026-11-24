/**
 * 창업동아리 백엔드·AI 해설 API (REST) 연동 구현체.
 *
 * - 성공 응답은 JSON 본문 그대로 또는 `{ "data": ... }` 래핑 모두 허용한다.
 * - 오류 응답은 `{ "error": { "code", "message" } }` 또는 `{ "message" }` 를 해석한다.
 * - 모든 실패는 `ApiError` 로 정규화한다 (화면 상태 처리 일원화).
 * - 업로드는 진행률 표시를 위해 XMLHttpRequest 로 전송한다.
 */
import { Platform } from 'react-native';

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

import type { ApiClient, UploadProgressHandler } from './client';
import { ApiError, codeFromStatus, toApiError, toTransportError, type ApiErrorCode } from './errors';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
type Query = Record<string, string | number | boolean | undefined>;

export interface HttpApiClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  /** 인증이 도입되면 Bearer 토큰을 반환하도록 주입 */
  getAuthToken?: () => Promise<string | undefined> | string | undefined;
  /** 테스트용 주입 */
  fetchImpl?: typeof fetch;
  xhrFactory?: () => XMLHttpRequest;
}

const CLIENT_HEADER = 'health-note-app/1.0.0';

/** 업로드 타임아웃 계산용 최저 업로드 속도 (느린 모바일 회선 ≈ 1Mbps) */
export const UPLOAD_MIN_BYTES_PER_SEC = 128 * 1024;
/** 크기 정보가 없는 파일의 추정 크기 (휴대폰 사진 1장) */
const UPLOAD_ASSUMED_FILE_BYTES = 5 * 1024 * 1024;

const KNOWN_CODES: ReadonlySet<string> = new Set<ApiErrorCode>([
  'NETWORK',
  'TIMEOUT',
  'UNAUTHORIZED',
  'NOT_FOUND',
  'VALIDATION',
  'PAYLOAD_TOO_LARGE',
  'RATE_LIMITED',
  'SERVER',
  'ANALYSIS_FAILED',
  'UNKNOWN',
]);

export function buildUrl(baseUrl: string, path: string, query?: Query): string {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return params ? `${url}?${params}` : url;
}

/** 래핑 응답에서 `data` 옆에 올 수 있는 부가 정보 키 (페이지 정보 등) */
const ENVELOPE_EXTRA_KEYS: ReadonlySet<string> = new Set(['meta', 'links', 'pagination']);

/** `{ data: T }` (+ meta·links·pagination) 래핑 응답을 풀어준다 */
export function unwrapEnvelope<T>(body: unknown): T {
  if (
    body !== null &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    'data' in body &&
    Object.keys(body as object).every((k) => k === 'data' || ENVELOPE_EXTRA_KEYS.has(k))
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}

/**
 * 응답 모양 최소 검사 — 목록이 배열이 아니거나 단건이 객체가 아니면 화면에서 예외가 나기 전에
 * SERVER 오류(다시 시도 안내)로 바꾼다. 필드 단위 검증은 하지 않는다.
 */
function expectArray<T>(value: unknown, endpoint: string): T[] {
  if (Array.isArray(value)) return value as T[];
  throw new ApiError('SERVER', { message: `${endpoint}: 목록(배열) 응답이 아닙니다`, details: value });
}

function expectObject<T>(value: unknown, endpoint: string): T {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) return value as T;
  throw new ApiError('SERVER', { message: `${endpoint}: 객체 응답이 아닙니다`, details: value });
}

/** 업로드 시간 제한 — 기본(일반 요청의 3배)에 파일 용량을 느린 회선으로 보내는 시간을 더한다 */
export function uploadTimeoutMs(baseTimeoutMs: number, files: readonly { size?: number }[]): number {
  const totalBytes = files.reduce(
    (sum, f) => sum + (typeof f.size === 'number' && f.size > 0 ? f.size : UPLOAD_ASSUMED_FILE_BYTES),
    0,
  );
  return baseTimeoutMs * 3 + Math.ceil((totalBytes / UPLOAD_MIN_BYTES_PER_SEC) * 1000);
}

/**
 * 업로드 중복 방지 키. 같은 등록 내용(파일·문서 정보)을 '다시 시도'하면 같은 키가 나가므로,
 * 첫 요청이 서버에 도착했지만 응답만 늦어 실패한 경우에도 서버가 문서를 두 번 만들지 않게 할 수 있다.
 */
export function uploadIdempotencyKey(input: UploadDocumentInput): string {
  const source = JSON.stringify([
    input.files.map((f) => [f.uri, f.name, f.size ?? null]),
    input.source,
    input.documentType,
    input.hospitalName,
    input.department ?? null,
    input.visitDate,
    input.title ?? null,
  ]);
  // FNV-1a 32비트 해시 두 개(시드 다름)를 이어 16자리 16진수로 만든다
  const fnv = (seed: number) => {
    let h = seed >>> 0;
    for (let i = 0; i < source.length; i += 1) {
      h ^= source.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  };
  return `upload-${fnv(0x811c9dc5)}${fnv(0x01234567)}`;
}

/** 오류 응답 본문 → ApiError */
export function parseErrorBody(status: number, body: unknown): ApiError {
  let code: ApiErrorCode = codeFromStatus(status);
  let serverMessage: string | undefined;
  if (body && typeof body === 'object') {
    const err = (body as { error?: unknown }).error;
    if (err && typeof err === 'object') {
      const c = (err as { code?: unknown }).code;
      const m = (err as { message?: unknown }).message;
      if (typeof c === 'string' && KNOWN_CODES.has(c)) code = c as ApiErrorCode;
      if (typeof m === 'string') serverMessage = m;
    } else if (typeof (body as { message?: unknown }).message === 'string') {
      serverMessage = (body as { message: string }).message;
    }
  }
  return new ApiError(code, {
    status,
    message: serverMessage ?? `HTTP ${status}`,
    // 검증 오류는 서버 문구가 더 구체적이므로 그대로 노출
    userMessage: code === 'VALIDATION' && serverMessage ? serverMessage : undefined,
    details: body,
  });
}

function safeJsonParse(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * 2xx 응답 본문 해석. 빈 본문(DELETE 204 등)은 허용하고,
 * JSON 이 아닌 본문(프록시·캡티브 포털의 HTML 등)은 화면이 깨지지 않도록 SERVER 오류로 처리한다.
 */
export function parseSuccessBody<T>(status: number, text: string): T {
  if (!text) return undefined as T;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ApiError('SERVER', { status, message: 'invalid JSON response body', details: text.slice(0, 200) });
  }
  return unwrapEnvelope<T>(parsed);
}

export class HttpApiClient implements ApiClient {
  readonly mode = 'http' as const;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly getAuthToken?: HttpApiClientOptions['getAuthToken'];
  private readonly fetchImpl: typeof fetch;
  private readonly xhrFactory: () => XMLHttpRequest;

  constructor(options: HttpApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.getAuthToken = options.getAuthToken;
    this.fetchImpl = options.fetchImpl ?? ((...args) => fetch(...args));
    this.xhrFactory = options.xhrFactory ?? (() => new XMLHttpRequest());
  }

  private async headers(extra?: Record<string, string>): Promise<Record<string, string>> {
    const token = await this.getAuthToken?.();
    return {
      Accept: 'application/json',
      'X-Client': CLIENT_HEADER,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    };
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    options: { query?: Query; body?: unknown } = {},
  ): Promise<T> {
    const hasBody = options.body !== undefined;
    let headers: Record<string, string>;
    try {
      headers = await this.headers(hasBody ? { 'Content-Type': 'application/json' } : undefined);
    } catch (error) {
      throw toApiError(error);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    let text: string;
    try {
      res = await this.fetchImpl(buildUrl(this.baseUrl, path, options.query), {
        method,
        headers,
        body: hasBody ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      text = await res.text();
    } catch (error) {
      // 전송 단계 실패만 NETWORK/TIMEOUT 으로 본다 (응답 해석 오류를 네트워크 문제로 안내하지 않도록)
      throw toTransportError(error);
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw parseErrorBody(res.status, safeJsonParse(text));
    try {
      return parseSuccessBody<T>(res.status, text);
    } catch (error) {
      throw toApiError(error);
    }
  }

  /* ---------------------------------------------------------------- */

  health(): Promise<HealthStatus> {
    return this.request('GET', '/health');
  }

  async listDocuments(): Promise<MedicalDocument[]> {
    return expectArray(await this.request('GET', '/v1/documents'), 'GET /v1/documents');
  }

  async getDocument(id: string): Promise<MedicalDocument> {
    return expectObject(
      await this.request('GET', `/v1/documents/${encodeURIComponent(id)}`),
      'GET /v1/documents/{id}',
    );
  }

  async uploadDocument(
    input: UploadDocumentInput,
    onProgress?: UploadProgressHandler,
  ): Promise<MedicalDocument> {
    const form = new FormData();
    for (const file of input.files) {
      if (Platform.OS === 'web') {
        // 웹에서는 blob/data URI 를 Blob 으로 변환해야 전송된다
        const blob = await (await this.fetchImpl(file.uri)).blob();
        form.append('files', blob, file.name);
      } else {
        // React Native FormData 파일 파트 규약
        form.append('files', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
      }
    }
    const metadata = {
      source: input.source,
      documentType: input.documentType,
      hospitalName: input.hospitalName,
      department: input.department,
      visitDate: input.visitDate,
      title: input.title,
    };
    form.append('metadata', JSON.stringify(metadata));

    const headers = await this.headers({ 'Idempotency-Key': uploadIdempotencyKey(input) });
    const url = buildUrl(this.baseUrl, '/v1/documents');
    // 업로드는 파일 용량에 비례해 시간 제한을 늘린다 (사진 10장·큰 PDF도 느린 회선에서 끝까지 전송)
    const timeout = uploadTimeoutMs(this.timeoutMs, input.files);

    return new Promise<MedicalDocument>((resolve, reject) => {
      const xhr = this.xhrFactory();
      xhr.open('POST', url);
      xhr.timeout = timeout;
      for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
        };
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const doc = expectObject<MedicalDocument>(
              parseSuccessBody<unknown>(xhr.status, xhr.responseText),
              'POST /v1/documents',
            );
            onProgress?.(1);
            resolve(doc);
          } catch (error) {
            reject(toApiError(error));
          }
        } else {
          reject(parseErrorBody(xhr.status, safeJsonParse(xhr.responseText)));
        }
      };
      xhr.onerror = () => reject(new ApiError('NETWORK', { message: 'upload network error' }));
      xhr.ontimeout = () => reject(new ApiError('TIMEOUT', { message: 'upload timeout' }));
      xhr.send(form);
    });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.request('DELETE', `/v1/documents/${encodeURIComponent(id)}`);
  }

  reanalyzeDocument(id: string): Promise<MedicalDocument> {
    return this.request('POST', `/v1/documents/${encodeURIComponent(id)}/reanalyze`);
  }

  async getAnalysis(documentId: string): Promise<DocumentAnalysis> {
    return expectObject(
      await this.request('GET', `/v1/documents/${encodeURIComponent(documentId)}/analysis`),
      'GET /v1/documents/{id}/analysis',
    );
  }

  async listLabCatalog(): Promise<LabCatalogItem[]> {
    return expectArray(await this.request('GET', '/v1/labs'), 'GET /v1/labs');
  }

  async getLabTrend(code: string): Promise<LabTrend> {
    return expectObject(
      await this.request('GET', `/v1/labs/${encodeURIComponent(code)}/trend`),
      'GET /v1/labs/{code}/trend',
    );
  }

  async listQuestions(filter?: QuestionFilter): Promise<Question[]> {
    return expectArray(
      await this.request('GET', '/v1/questions', { query: { documentId: filter?.documentId } }),
      'GET /v1/questions',
    );
  }

  createQuestion(input: CreateQuestionInput): Promise<Question> {
    return this.request('POST', '/v1/questions', { body: input });
  }

  updateQuestion(id: string, input: UpdateQuestionInput): Promise<Question> {
    return this.request('PATCH', `/v1/questions/${encodeURIComponent(id)}`, { body: input });
  }

  async deleteQuestion(id: string): Promise<void> {
    await this.request('DELETE', `/v1/questions/${encodeURIComponent(id)}`);
  }

  async suggestQuestions(documentId: string): Promise<string[]> {
    const res = await this.request<unknown>(
      'POST',
      `/v1/documents/${encodeURIComponent(documentId)}/question-suggestions`,
    );
    const questions = Array.isArray(res)
      ? res
      : res !== null && typeof res === 'object'
        ? (res as { questions?: unknown }).questions
        : undefined;
    return expectArray<unknown>(questions, 'POST /v1/documents/{id}/question-suggestions').filter(
      (q): q is string => typeof q === 'string' && q.trim().length > 0,
    );
  }

  async getTimeline(): Promise<TimelineEvent[]> {
    return expectArray(await this.request('GET', '/v1/timeline'), 'GET /v1/timeline');
  }
}
