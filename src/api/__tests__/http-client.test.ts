/**
 * HttpApiClient 단위 테스트.
 *
 * 실서버 없이 `fetchImpl` / `xhrFactory` 를 주입해 URL·헤더·본문 구성과
 * 응답·오류 정규화(ApiError)가 API 계약(docs/API_CONTRACT.md)대로 동작하는지 검증한다.
 */
import { Platform } from 'react-native';

import type { MedicalDocument, UploadDocumentInput } from '@/types/domain';

import { ApiError } from '../errors';
import {
  buildUrl,
  HttpApiClient,
  parseErrorBody,
  UPLOAD_MIN_BYTES_PER_SEC,
  uploadIdempotencyKey,
  uploadTimeoutMs,
  unwrapEnvelope,
} from '../http-client';

/* ------------------------------------------------------------------ */
/* 테스트 도우미                                                        */
/* ------------------------------------------------------------------ */

const BASE_URL = 'https://api.test';

/** fetch 오버로드 중 가장 넓은 시그니처 (DOM·React Native 타입 모두와 호환) */
type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];
type FetchMock = jest.Mock<Promise<Response>, FetchArgs>;

/** fetch 응답 중 HttpApiClient 가 사용하는 부분(ok·status·text)만 흉내 낸다 */
function fakeResponse(status: number, body?: unknown): Response {
  const text = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
  } as unknown as Response;
}

function createFetch(status = 200, body?: unknown): FetchMock {
  return jest.fn<Promise<Response>, FetchArgs>(async () => fakeResponse(status, body));
}

function createClient(fetchImpl: FetchMock, extra: Partial<ConstructorParameters<typeof HttpApiClient>[0]> = {}) {
  return new HttpApiClient({ baseUrl: BASE_URL, fetchImpl, ...extra });
}

function lastCall(fetchImpl: FetchMock): { url: string; init: RequestInit } {
  const call = fetchImpl.mock.calls[fetchImpl.mock.calls.length - 1];
  return { url: String(call[0]), init: call[1] ?? {} };
}

function headersOf(init: RequestInit): Record<string, string> {
  return init.headers as Record<string, string>;
}

/** 실패해야 하는 Promise 에서 ApiError 를 꺼낸다 */
async function captureError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw new Error(`ApiError 가 아닌 오류: ${String(error)}`);
  }
  throw new Error('Promise 가 성공했지만 실패를 기대했습니다.');
}

const sampleDocument: MedicalDocument = {
  id: 'doc_1',
  title: '부산내과의원 · 진료기록',
  documentType: 'medical_record',
  hospitalName: '부산내과의원',
  department: '내과',
  visitDate: '2026-11-20',
  source: 'camera',
  pageCount: 2,
  status: 'uploaded',
  progress: 5,
  createdAt: '2026-11-20T01:00:00.000Z',
  updatedAt: '2026-11-20T01:00:00.000Z',
};

/* ------------------------------------------------------------------ */
/* 순수 함수                                                            */
/* ------------------------------------------------------------------ */

describe('buildUrl', () => {
  it('기본 주소와 경로를 이어 붙인다', () => {
    expect(buildUrl(BASE_URL, '/v1/documents')).toBe('https://api.test/v1/documents');
  });

  it('경로가 / 로 시작하지 않으면 보정한다', () => {
    expect(buildUrl(BASE_URL, 'health')).toBe('https://api.test/health');
  });

  it('쿼리 값을 인코딩하고 undefined·빈 문자열은 제외한다', () => {
    expect(
      buildUrl(BASE_URL, '/v1/questions', {
        documentId: 'doc 1&x',
        empty: '',
        missing: undefined,
        page: 2,
        asked: false,
      }),
    ).toBe('https://api.test/v1/questions?documentId=doc%201%26x&page=2&asked=false');
  });

  it('남은 쿼리가 없으면 ? 를 붙이지 않는다', () => {
    expect(buildUrl(BASE_URL, '/v1/questions', { documentId: undefined })).toBe(
      'https://api.test/v1/questions',
    );
  });
});

describe('unwrapEnvelope', () => {
  it('래핑되지 않은 응답은 그대로 반환한다', () => {
    const list = [{ id: 'a' }];
    expect(unwrapEnvelope(list)).toBe(list);
    const doc = { id: 'a', title: 'x' };
    expect(unwrapEnvelope(doc)).toBe(doc);
  });

  it('{ data } 래핑을 푼다', () => {
    expect(unwrapEnvelope({ data: [1, 2] })).toEqual([1, 2]);
  });

  it('{ data, meta } 래핑을 푼다', () => {
    expect(unwrapEnvelope({ data: { id: 'a' }, meta: { total: 1 } })).toEqual({ id: 'a' });
  });

  it('{ data, meta, links, pagination } 래핑도 푼다', () => {
    expect(unwrapEnvelope({ data: [1], meta: {}, links: { next: null }, pagination: {} })).toEqual([1]);
  });

  it('data 외 다른 필드가 있으면 도메인 객체로 보고 풀지 않는다', () => {
    const body = { data: 'payload', id: 'a' };
    expect(unwrapEnvelope(body)).toBe(body);
  });

  it('null·문자열·undefined 는 그대로 반환한다', () => {
    expect(unwrapEnvelope(null)).toBeNull();
    expect(unwrapEnvelope('text')).toBe('text');
    expect(unwrapEnvelope(undefined)).toBeUndefined();
  });
});

describe('parseErrorBody', () => {
  it.each([
    [400, 'VALIDATION'],
    [401, 'UNAUTHORIZED'],
    [403, 'UNAUTHORIZED'],
    [404, 'NOT_FOUND'],
    [408, 'TIMEOUT'],
    [409, 'UNKNOWN'],
    [413, 'PAYLOAD_TOO_LARGE'],
    [422, 'VALIDATION'],
    [429, 'RATE_LIMITED'],
    [500, 'SERVER'],
    [503, 'SERVER'],
  ] as const)('HTTP %i → %s', (status, code) => {
    const error = parseErrorBody(status, undefined);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe(code);
    expect(error.status).toBe(status);
    expect(error.message).toBe(`HTTP ${status}`);
  });

  it('서버가 알려진 오류 코드를 보내면 상태 코드보다 우선한다', () => {
    const body = { error: { code: 'ANALYSIS_FAILED', message: 'pipeline failed at ocr' } };
    const error = parseErrorBody(409, body);
    expect(error.code).toBe('ANALYSIS_FAILED');
    expect(error.status).toBe(409);
    expect(error.message).toBe('pipeline failed at ocr');
    // 검증 오류가 아니면 서버 문구 대신 앱 기본 문구를 보여준다
    expect(error.userMessage).toBe(new ApiError('ANALYSIS_FAILED').userMessage);
    expect(error.details).toBe(body);
  });

  it('알 수 없는 서버 오류 코드는 무시하고 상태 코드로 판단한다', () => {
    const error = parseErrorBody(404, { error: { code: 'DOC_GONE', message: 'gone' } });
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('gone');
  });

  it('검증 오류는 서버 문구를 사용자 문구로 그대로 노출한다', () => {
    const error = parseErrorBody(422, {
      error: { code: 'VALIDATION', message: '진료일은 오늘 이후일 수 없어요.' },
    });
    expect(error.code).toBe('VALIDATION');
    expect(error.userMessage).toBe('진료일은 오늘 이후일 수 없어요.');
  });

  it('검증 오류라도 서버 문구가 없으면 기본 문구를 사용한다', () => {
    const error = parseErrorBody(400, { error: { code: 'VALIDATION' } });
    expect(error.userMessage).toBe(new ApiError('VALIDATION').userMessage);
  });

  it('최상위 { message } 형식도 해석한다', () => {
    const error = parseErrorBody(400, { message: '병원 이름을 입력해 주세요.' });
    expect(error.code).toBe('VALIDATION');
    expect(error.message).toBe('병원 이름을 입력해 주세요.');
    expect(error.userMessage).toBe('병원 이름을 입력해 주세요.');
  });

  it('JSON 이 아닌 본문은 details 로만 보관한다', () => {
    const error = parseErrorBody(502, '<html>Bad Gateway</html>');
    expect(error.code).toBe('SERVER');
    expect(error.message).toBe('HTTP 502');
    expect(error.details).toBe('<html>Bad Gateway</html>');
  });
});

/* ------------------------------------------------------------------ */
/* JSON 요청 (fetch)                                                    */
/* ------------------------------------------------------------------ */

describe('HttpApiClient — JSON 요청', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('GET 요청에 공통 헤더를 붙이고 JSON 본문을 반환한다', async () => {
    const fetchImpl = createFetch(200, [sampleDocument]);
    const client = createClient(fetchImpl);

    await expect(client.listDocuments()).resolves.toEqual([sampleDocument]);

    const { url, init } = lastCall(fetchImpl);
    expect(url).toBe('https://api.test/v1/documents');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    expect(init.signal).toBeDefined();
    const headers = headersOf(init);
    expect(headers.Accept).toBe('application/json');
    expect(headers['X-Client']).toMatch(/^health-note-app\//);
    expect(headers).not.toHaveProperty('Content-Type');
    expect(headers).not.toHaveProperty('Authorization');
  });

  it('기본 주소 끝의 / 를 제거한다', async () => {
    const fetchImpl = createFetch(200, { ok: true, version: '1.0.0' });
    const client = new HttpApiClient({ baseUrl: 'https://api.test///', fetchImpl });
    await client.health();
    expect(lastCall(fetchImpl).url).toBe('https://api.test/health');
  });

  it('{ data, meta } 래핑 응답을 풀어서 반환한다', async () => {
    const fetchImpl = createFetch(200, { data: [sampleDocument], meta: { total: 1 } });
    await expect(createClient(fetchImpl).listDocuments()).resolves.toEqual([sampleDocument]);
  });

  it('경로 파라미터를 URL 인코딩한다', async () => {
    const fetchImpl = createFetch(200, sampleDocument);
    await createClient(fetchImpl).getDocument('a/b c');
    expect(lastCall(fetchImpl).url).toBe('https://api.test/v1/documents/a%2Fb%20c');
  });

  it.each([
    ['health', (c: HttpApiClient) => c.health(), 'GET', '/health'],
    ['getDocument', (c: HttpApiClient) => c.getDocument('doc_1'), 'GET', '/v1/documents/doc_1'],
    ['deleteDocument', (c: HttpApiClient) => c.deleteDocument('doc_1'), 'DELETE', '/v1/documents/doc_1'],
    [
      'reanalyzeDocument',
      (c: HttpApiClient) => c.reanalyzeDocument('doc_1'),
      'POST',
      '/v1/documents/doc_1/reanalyze',
    ],
    ['getAnalysis', (c: HttpApiClient) => c.getAnalysis('doc_1'), 'GET', '/v1/documents/doc_1/analysis'],
    ['listLabCatalog', (c: HttpApiClient) => c.listLabCatalog(), 'GET', '/v1/labs'],
    ['getLabTrend', (c: HttpApiClient) => c.getLabTrend('HBA1C'), 'GET', '/v1/labs/HBA1C/trend'],
    ['deleteQuestion', (c: HttpApiClient) => c.deleteQuestion('q_1'), 'DELETE', '/v1/questions/q_1'],
    ['getTimeline', (c: HttpApiClient) => c.getTimeline(), 'GET', '/v1/timeline'],
  ] as const)('%s → %s %s', async (name, call, method, path) => {
    const listEndpoints: string[] = ['listLabCatalog', 'getTimeline'];
    const fetchImpl = createFetch(200, listEndpoints.includes(name) ? [] : {});
    await call(createClient(fetchImpl));
    const { url, init } = lastCall(fetchImpl);
    expect(init.method).toBe(method);
    expect(url).toBe(`${BASE_URL}${path}`);
  });

  it('DELETE 의 빈 응답(204)을 정상 처리한다', async () => {
    const fetchImpl = createFetch(204);
    await expect(createClient(fetchImpl).deleteDocument('doc_1')).resolves.toBeUndefined();
  });

  it('POST·PATCH 본문을 JSON 으로 보낸다', async () => {
    const fetchImpl = createFetch(201, { id: 'q_1' });
    const client = createClient(fetchImpl);

    await client.createQuestion({ text: '약은 언제까지 먹어야 하나요?', documentId: 'doc_1' });
    let call = lastCall(fetchImpl);
    expect(call.url).toBe('https://api.test/v1/questions');
    expect(call.init.method).toBe('POST');
    expect(headersOf(call.init)['Content-Type']).toBe('application/json');
    expect(JSON.parse(String(call.init.body))).toEqual({
      text: '약은 언제까지 먹어야 하나요?',
      documentId: 'doc_1',
    });

    await client.updateQuestion('q_1', { isAsked: true, answerNote: '3개월 뒤 재검' });
    call = lastCall(fetchImpl);
    expect(call.url).toBe('https://api.test/v1/questions/q_1');
    expect(call.init.method).toBe('PATCH');
    expect(JSON.parse(String(call.init.body))).toEqual({ isAsked: true, answerNote: '3개월 뒤 재검' });
  });

  it('listQuestions 는 documentId 가 있을 때만 쿼리스트링을 붙인다', async () => {
    const fetchImpl = createFetch(200, []);
    const client = createClient(fetchImpl);

    await client.listQuestions();
    expect(lastCall(fetchImpl).url).toBe('https://api.test/v1/questions');

    await client.listQuestions({});
    expect(lastCall(fetchImpl).url).toBe('https://api.test/v1/questions');

    await client.listQuestions({ documentId: 'doc 1' });
    expect(lastCall(fetchImpl).url).toBe('https://api.test/v1/questions?documentId=doc%201');
  });

  it('suggestQuestions 는 배열 응답과 { questions } 응답을 모두 허용한다', async () => {
    const questions = ['다음 검사는 언제 하나요?', '약을 바꿔야 하나요?'];

    const arrayFetch = createFetch(200, questions);
    await expect(createClient(arrayFetch).suggestQuestions('doc_1')).resolves.toEqual(questions);
    expect(lastCall(arrayFetch).url).toBe('https://api.test/v1/documents/doc_1/question-suggestions');
    expect(lastCall(arrayFetch).init.method).toBe('POST');

    const objectFetch = createFetch(200, { questions });
    await expect(createClient(objectFetch).suggestQuestions('doc_1')).resolves.toEqual(questions);

    const envelopeFetch = createFetch(200, { data: { questions } });
    await expect(createClient(envelopeFetch).suggestQuestions('doc_1')).resolves.toEqual(questions);
  });

  it.each([
    ['빈 본문', undefined],
    ['{ data: null }', { data: null }],
    ['{ questions: null }', { questions: null }],
    ['문자열', '"질문"'],
  ])('suggestQuestions 응답 형식이 다르면(%s) 네트워크가 아닌 SERVER 오류로 알린다', async (_label, body) => {
    const fetchImpl = createFetch(200, body);
    const error = await captureError(createClient(fetchImpl).suggestQuestions('doc_1'));
    expect(error.code).toBe('SERVER');
  });

  it('suggestQuestions 는 문자열이 아닌 항목·빈 문장을 걸러 낸다', async () => {
    const fetchImpl = createFetch(200, { questions: ['약은 언제까지 먹나요?', '', 3, null] });
    await expect(createClient(fetchImpl).suggestQuestions('doc_1')).resolves.toEqual([
      '약은 언제까지 먹나요?',
    ]);
  });

  it.each([
    ['listDocuments', (c: HttpApiClient) => c.listDocuments(), { items: [] }],
    ['listLabCatalog', (c: HttpApiClient) => c.listLabCatalog(), { data: { labs: [] } }],
    ['listQuestions', (c: HttpApiClient) => c.listQuestions(), null],
    ['getTimeline', (c: HttpApiClient) => c.getTimeline(), undefined],
    ['getDocument', (c: HttpApiClient) => c.getDocument('doc_1'), []],
    ['getAnalysis', (c: HttpApiClient) => c.getAnalysis('doc_1'), undefined],
  ] as const)('%s 응답 모양이 계약과 다르면 화면 예외 대신 SERVER 오류', async (_name, call, body) => {
    const error = await captureError(call(createClient(createFetch(200, body))));
    expect(error.code).toBe('SERVER');
  });

  it('응답 해석 중 난 TypeError 를 네트워크 오류로 안내하지 않는다', async () => {
    const fetchImpl = jest.fn<Promise<Response>, FetchArgs>(
      async () => ({ ok: true, status: 200, text: async () => '[]' }) as unknown as Response,
    );
    const client = createClient(fetchImpl, {
      getAuthToken: () => {
        throw new TypeError("Cannot read properties of undefined (reading 'token')");
      },
    });
    const error = await captureError(client.listDocuments());
    expect(error.code).toBe('UNKNOWN');
    expect(error.retryable).toBe(false);
  });

  it('404 응답은 NOT_FOUND 로 변환한다', async () => {
    const fetchImpl = createFetch(404, { error: { code: 'NOT_FOUND', message: 'document not found' } });
    const error = await captureError(createClient(fetchImpl).getDocument('nope'));
    expect(error.code).toBe('NOT_FOUND');
    expect(error.status).toBe(404);
    expect(error.retryable).toBe(false);
  });

  it('409 + ANALYSIS_FAILED 응답은 분석 실패로 변환한다', async () => {
    const fetchImpl = createFetch(409, { error: { code: 'ANALYSIS_FAILED', message: 'ocr failed' } });
    const error = await captureError(createClient(fetchImpl).getAnalysis('doc_1'));
    expect(error.code).toBe('ANALYSIS_FAILED');
    expect(error.status).toBe(409);
  });

  it('500 응답은 재시도 가능한 SERVER 오류로 변환한다', async () => {
    const fetchImpl = createFetch(500, 'Internal Server Error');
    const error = await captureError(createClient(fetchImpl).listDocuments());
    expect(error.code).toBe('SERVER');
    expect(error.status).toBe(500);
    expect(error.retryable).toBe(true);
  });

  it('네트워크 실패(TypeError)는 NETWORK 로 변환한다', async () => {
    const fetchImpl = jest.fn<Promise<Response>, FetchArgs>(async () => {
      throw new TypeError('Network request failed');
    });
    const error = await captureError(createClient(fetchImpl).listDocuments());
    expect(error.code).toBe('NETWORK');
    expect(error.retryable).toBe(true);
  });

  it('Error 가 아닌 값으로 실패해도 UNKNOWN 으로 정규화한다', async () => {
    const fetchImpl = jest.fn<Promise<Response>, FetchArgs>(() => Promise.reject('boom'));
    const error = await captureError(createClient(fetchImpl).listDocuments());
    expect(error.code).toBe('UNKNOWN');
    expect(error.message).toBe('boom');
  });

  it('응답이 타임아웃보다 늦으면 요청을 중단하고 TIMEOUT 으로 변환한다', async () => {
    jest.useFakeTimers();
    let receivedSignal: AbortSignal | undefined;
    const fetchImpl = jest.fn<Promise<Response>, FetchArgs>(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          receivedSignal = init?.signal ?? undefined;
          receivedSignal?.addEventListener('abort', () => {
            // fetch 구현체들은 중단 시 name 이 'AbortError' 인 오류로 실패한다
            reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
          });
        }),
    );
    const client = createClient(fetchImpl, { timeoutMs: 5_000 });

    const pending = captureError(client.listDocuments());
    await jest.advanceTimersByTimeAsync(4_999);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(receivedSignal?.aborted).toBe(false);

    await jest.advanceTimersByTimeAsync(1);
    const error = await pending;
    expect(receivedSignal?.aborted).toBe(true);
    expect(error.code).toBe('TIMEOUT');
    expect(error.retryable).toBe(true);
  });

  it('응답을 받으면 타임아웃 타이머를 정리한다', async () => {
    jest.useFakeTimers();
    const fetchImpl = createFetch(200, []);
    await createClient(fetchImpl, { timeoutMs: 5_000 }).listDocuments();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('getAuthToken 이 토큰을 주면 Bearer 헤더를 붙인다 (동기·비동기 모두)', async () => {
    const syncFetch = createFetch(200, []);
    await createClient(syncFetch, { getAuthToken: () => 'sync-token' }).listDocuments();
    expect(headersOf(lastCall(syncFetch).init).Authorization).toBe('Bearer sync-token');

    const asyncFetch = createFetch(200, []);
    await createClient(asyncFetch, { getAuthToken: async () => 'async-token' }).listDocuments();
    expect(headersOf(lastCall(asyncFetch).init).Authorization).toBe('Bearer async-token');

    const noTokenFetch = createFetch(200, []);
    await createClient(noTokenFetch, { getAuthToken: () => undefined }).listDocuments();
    expect(headersOf(lastCall(noTokenFetch).init)).not.toHaveProperty('Authorization');
  });
});

/* ------------------------------------------------------------------ */
/* 문서 업로드 (XMLHttpRequest + multipart)                             */
/* ------------------------------------------------------------------ */

interface FormPart {
  name: string;
  value: unknown;
  filename?: string;
}

/** 전송된 multipart 파트를 그대로 확인하기 위한 FormData 대역 */
class RecordingFormData {
  readonly parts: FormPart[] = [];

  append(name: string, value: unknown, filename?: string): void {
    this.parts.push({ name, value, filename });
  }
}

interface FakeProgressEvent {
  lengthComputable: boolean;
  loaded: number;
  total: number;
}

/** HttpApiClient 가 사용하는 XMLHttpRequest 기능만 구현한 대역 */
class FakeXhr {
  method?: string;
  url?: string;
  timeout = 0;
  status = 0;
  responseText = '';
  readonly requestHeaders: Record<string, string> = {};
  body?: unknown;
  readonly upload: { onprogress: ((event: FakeProgressEvent) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  /** send() 가 호출되면 resolve */
  readonly sent: Promise<void>;
  private markSent: () => void = () => undefined;

  constructor() {
    this.sent = new Promise((resolve) => {
      this.markSent = resolve;
    });
  }

  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string): void {
    this.requestHeaders[name] = value;
  }

  send(body: unknown): void {
    this.body = body;
    this.markSent();
  }

  /* 테스트에서 서버 동작을 흉내 내는 메서드 */
  emitProgress(loaded: number, total: number, lengthComputable = true): void {
    this.upload.onprogress?.({ loaded, total, lengthComputable });
  }

  respond(status: number, body?: unknown): void {
    this.status = status;
    this.responseText = body === undefined ? '' : JSON.stringify(body);
    this.onload?.();
  }
}

function uploadInput(overrides: Partial<UploadDocumentInput> = {}): UploadDocumentInput {
  return {
    files: [
      { uri: 'file:///cache/page-1.jpg', name: 'page-1.jpg', mimeType: 'image/jpeg', size: 1200 },
      { uri: 'file:///cache/page-2.jpg', name: 'page-2.jpg', mimeType: 'image/jpeg', size: 1300 },
    ],
    source: 'camera',
    documentType: 'medical_record',
    hospitalName: '부산내과의원',
    department: '내과',
    visitDate: '2026-11-20',
    ...overrides,
  };
}

describe('HttpApiClient — uploadDocument', () => {
  let xhr: FakeXhr;
  let fetchImpl: FetchMock;
  let client: HttpApiClient;
  const OriginalFormData = globalThis.FormData;

  beforeEach(() => {
    globalThis.FormData = RecordingFormData as unknown as typeof FormData;
    xhr = new FakeXhr();
    fetchImpl = createFetch(200, {});
    client = createClient(fetchImpl, {
      timeoutMs: 10_000,
      xhrFactory: () => xhr as unknown as XMLHttpRequest,
    });
  });

  afterEach(() => {
    globalThis.FormData = OriginalFormData;
    jest.restoreAllMocks();
  });

  function sentParts(): FormPart[] {
    expect(xhr.body).toBeInstanceOf(RecordingFormData);
    return (xhr.body as RecordingFormData).parts;
  }

  it('파일은 files 파트, 문서 정보는 metadata JSON 파트로 보낸다 (네이티브)', async () => {
    const promise = client.uploadDocument(uploadInput({ title: undefined }));
    await xhr.sent;

    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe('https://api.test/v1/documents');
    // 업로드는 기본 타임아웃의 3배 + 파일 용량(2,500B)을 느린 회선으로 보내는 시간
    expect(xhr.timeout).toBe(30_000 + Math.ceil((2_500 / UPLOAD_MIN_BYTES_PER_SEC) * 1000));
    expect(xhr.requestHeaders['Idempotency-Key']).toMatch(/^upload-[0-9a-f]{16}$/);
    expect(xhr.requestHeaders.Accept).toBe('application/json');
    expect(xhr.requestHeaders['X-Client']).toMatch(/^health-note-app\//);
    // multipart 경계값은 런타임이 정하므로 Content-Type 을 직접 지정하지 않는다
    expect(xhr.requestHeaders).not.toHaveProperty('Content-Type');

    const parts = sentParts();
    expect(parts.map((p) => p.name)).toEqual(['files', 'files', 'metadata']);
    expect(parts[0].value).toEqual({
      uri: 'file:///cache/page-1.jpg',
      name: 'page-1.jpg',
      type: 'image/jpeg',
    });
    expect(parts[1].value).toEqual({
      uri: 'file:///cache/page-2.jpg',
      name: 'page-2.jpg',
      type: 'image/jpeg',
    });
    expect(JSON.parse(String(parts[2].value))).toEqual({
      source: 'camera',
      documentType: 'medical_record',
      hospitalName: '부산내과의원',
      department: '내과',
      visitDate: '2026-11-20',
    });

    xhr.respond(201, sampleDocument);
    await expect(promise).resolves.toEqual(sampleDocument);
  });

  it('웹에서는 파일 URI 를 Blob 으로 변환해 파일명과 함께 보낸다', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const blob = { size: 3, type: 'application/pdf' };
    const blobFetch = jest.fn<Promise<Response>, FetchArgs>(
      async () => ({ blob: async () => blob }) as unknown as Response,
    );
    const webClient = createClient(blobFetch, { xhrFactory: () => xhr as unknown as XMLHttpRequest });

    const promise = webClient.uploadDocument(
      uploadInput({
        source: 'pdf',
        files: [{ uri: 'blob:http://localhost/abc', name: 'result.pdf', mimeType: 'application/pdf' }],
      }),
    );
    await xhr.sent;

    expect(String(blobFetch.mock.calls[0][0])).toBe('blob:http://localhost/abc');
    const [filePart, metadataPart] = sentParts();
    expect(filePart).toEqual({ name: 'files', value: blob, filename: 'result.pdf' });
    expect(JSON.parse(String(metadataPart.value)).source).toBe('pdf');

    xhr.respond(201, { data: sampleDocument });
    await expect(promise).resolves.toEqual(sampleDocument);
  });

  it('업로드 진행률을 0~1 비율로 알리고 완료 시 1 을 보낸다', async () => {
    const onProgress = jest.fn<void, [number]>();
    const promise = client.uploadDocument(uploadInput(), onProgress);
    await xhr.sent;

    xhr.emitProgress(50, 200);
    xhr.emitProgress(150, 200);
    // 전체 크기를 알 수 없는 이벤트는 무시
    xhr.emitProgress(10, 0, false);
    xhr.emitProgress(10, 0, true);
    expect(onProgress.mock.calls.map(([ratio]) => ratio)).toEqual([0.25, 0.75]);

    xhr.respond(200, sampleDocument);
    await promise;
    expect(onProgress).toHaveBeenLastCalledWith(1);
  });

  it('{ data } 래핑 응답도 문서로 풀어 준다', async () => {
    const promise = client.uploadDocument(uploadInput());
    await xhr.sent;
    xhr.respond(201, { data: sampleDocument });
    await expect(promise).resolves.toEqual(sampleDocument);
  });

  it('413 응답은 PAYLOAD_TOO_LARGE 로 실패한다', async () => {
    const onProgress = jest.fn<void, [number]>();
    const promise = captureError(client.uploadDocument(uploadInput(), onProgress));
    await xhr.sent;
    xhr.respond(413, { error: { code: 'PAYLOAD_TOO_LARGE', message: 'too large' } });

    const error = await promise;
    expect(error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(error.status).toBe(413);
    expect(onProgress).not.toHaveBeenCalledWith(1);
  });

  it('422 검증 오류는 서버 문구를 사용자 문구로 쓴다', async () => {
    const promise = captureError(client.uploadDocument(uploadInput()));
    await xhr.sent;
    xhr.respond(422, { error: { code: 'VALIDATION', message: '지원하지 않는 파일 형식이에요.' } });

    const error = await promise;
    expect(error.code).toBe('VALIDATION');
    expect(error.userMessage).toBe('지원하지 않는 파일 형식이에요.');
  });

  it('네트워크 오류(onerror)는 NETWORK 로 실패한다', async () => {
    const promise = captureError(client.uploadDocument(uploadInput()));
    await xhr.sent;
    xhr.onerror?.();
    expect((await promise).code).toBe('NETWORK');
  });

  it('업로드 시간 초과(ontimeout)는 TIMEOUT 으로 실패한다', async () => {
    const promise = captureError(client.uploadDocument(uploadInput()));
    await xhr.sent;
    xhr.ontimeout?.();
    expect((await promise).code).toBe('TIMEOUT');
  });

  it('같은 등록 내용을 다시 시도하면 같은 중복 방지 키를 보낸다', () => {
    expect(uploadIdempotencyKey(uploadInput())).toBe(uploadIdempotencyKey(uploadInput()));
    expect(uploadIdempotencyKey(uploadInput())).not.toBe(
      uploadIdempotencyKey(uploadInput({ hospitalName: '해운대병원' })),
    );
    expect(uploadIdempotencyKey(uploadInput())).not.toBe(
      uploadIdempotencyKey(
        uploadInput({ files: [{ uri: 'file:///cache/other.jpg', name: 'other.jpg', mimeType: 'image/jpeg' }] }),
      ),
    );
  });

  it('업로드 시간 제한은 파일 용량에 비례해 늘어난다 (사진 10장 약 35MB도 1분에 끊기지 않음)', () => {
    const photos = Array.from({ length: 10 }, () => ({ size: 3.5 * 1024 * 1024 }));
    const timeout = uploadTimeoutMs(20_000, photos);
    expect(timeout).toBeGreaterThan(60_000);
    // 최저 속도(약 1Mbps)로 보내는 데 걸리는 시간 이상
    expect(timeout).toBeGreaterThanOrEqual(60_000 + ((35 * 1024 * 1024) / UPLOAD_MIN_BYTES_PER_SEC) * 1000);
    // 크기를 모르는 파일은 사진 1장 크기로 추정
    expect(uploadTimeoutMs(20_000, [{}])).toBeGreaterThan(uploadTimeoutMs(20_000, [{ size: 1 }]));
  });

  it('인증 토큰이 있으면 업로드 요청에도 Bearer 헤더를 붙인다', async () => {
    const authClient = createClient(fetchImpl, {
      getAuthToken: async () => 'upload-token',
      xhrFactory: () => xhr as unknown as XMLHttpRequest,
    });
    const promise = authClient.uploadDocument(uploadInput());
    await xhr.sent;
    expect(xhr.requestHeaders.Authorization).toBe('Bearer upload-token');
    xhr.respond(201, sampleDocument);
    await promise;
  });
});
