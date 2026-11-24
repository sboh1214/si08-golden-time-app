/**
 * ApiError 정규화 단위 테스트.
 * 화면은 어떤 실패든 ApiError 하나로 다루므로 코드 판정·사용자 문구·재시도 여부가 일관돼야 한다.
 */
import {
  ApiError,
  codeFromStatus,
  getErrorMessage,
  isApiError,
  toApiError,
  toTransportError,
  type ApiErrorCode,
} from '../errors';

const ALL_CODES: ApiErrorCode[] = [
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
];

describe('ApiError', () => {
  it('Error 를 상속하고 이름·코드·상태를 보관한다', () => {
    const details = { error: { code: 'NOT_FOUND' } };
    const error = new ApiError('NOT_FOUND', { status: 404, details });
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.name).toBe('ApiError');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.status).toBe(404);
    expect(error.details).toBe(details);
  });

  it('message 를 주지 않으면 코드(와 상태)로 만든다', () => {
    expect(new ApiError('SERVER', { status: 503 }).message).toBe('SERVER (503)');
    expect(new ApiError('NETWORK').message).toBe('NETWORK');
  });

  it('message·userMessage 를 지정하면 그대로 사용한다', () => {
    const error = new ApiError('VALIDATION', {
      message: 'hospitalName is required',
      userMessage: '병원 이름을 입력해 주세요.',
    });
    expect(error.message).toBe('hospitalName is required');
    expect(error.userMessage).toBe('병원 이름을 입력해 주세요.');
  });

  it.each(ALL_CODES)('%s 의 기본 사용자 문구는 해요체 한국어 문장이다', (code) => {
    const { userMessage } = new ApiError(code);
    expect(userMessage.length).toBeGreaterThan(0);
    expect(userMessage).toMatch(/[가-힣]/);
    expect(userMessage).toMatch(/요\.$/);
  });

  it('코드마다 서로 다른 기본 문구를 가진다', () => {
    const messages = ALL_CODES.map((code) => new ApiError(code).userMessage);
    expect(new Set(messages).size).toBe(ALL_CODES.length);
  });

  it.each([
    ['NETWORK', true],
    ['TIMEOUT', true],
    ['RATE_LIMITED', true],
    ['SERVER', true],
    ['UNAUTHORIZED', false],
    ['NOT_FOUND', false],
    ['VALIDATION', false],
    ['PAYLOAD_TOO_LARGE', false],
    ['ANALYSIS_FAILED', false],
    ['UNKNOWN', false],
  ] as const)('%s 재시도 가능 여부 = %s', (code, retryable) => {
    expect(new ApiError(code).retryable).toBe(retryable);
  });
});

describe('codeFromStatus', () => {
  it.each([
    [400, 'VALIDATION'],
    [401, 'UNAUTHORIZED'],
    [403, 'UNAUTHORIZED'],
    [404, 'NOT_FOUND'],
    [408, 'TIMEOUT'],
    [413, 'PAYLOAD_TOO_LARGE'],
    [422, 'VALIDATION'],
    [429, 'RATE_LIMITED'],
    [500, 'SERVER'],
    [502, 'SERVER'],
    [504, 'SERVER'],
    [409, 'UNKNOWN'],
    [418, 'UNKNOWN'],
    [302, 'UNKNOWN'],
  ] as const)('HTTP %i → %s', (status, code) => {
    expect(codeFromStatus(status)).toBe(code);
  });
});

describe('isApiError', () => {
  it('ApiError 만 true', () => {
    expect(isApiError(new ApiError('UNKNOWN'))).toBe(true);
    expect(isApiError(new Error('x'))).toBe(false);
    expect(isApiError({ code: 'NETWORK', userMessage: '...' })).toBe(false);
    expect(isApiError(undefined)).toBe(false);
  });
});

describe('toApiError', () => {
  it('ApiError 는 같은 인스턴스를 그대로 반환한다', () => {
    const original = new ApiError('NOT_FOUND', { status: 404 });
    expect(toApiError(original)).toBe(original);
  });

  it('AbortError 는 TIMEOUT 으로 변환한다', () => {
    const abort = Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });
    const error = toApiError(abort);
    expect(error.code).toBe('TIMEOUT');
    expect(error.message).toBe('The operation was aborted.');
  });

  it('DOMException(AbortError) 도 TIMEOUT 으로 변환한다', () => {
    expect(toApiError(new DOMException('Aborted', 'AbortError')).code).toBe('TIMEOUT');
  });

  it('TypeError(네트워크 실패) 는 NETWORK 로 변환한다', () => {
    const error = toApiError(new TypeError('Network request failed'));
    expect(error.code).toBe('NETWORK');
    expect(error.message).toBe('Network request failed');
  });

  it.each(['Failed to fetch', 'fetch failed', 'NetworkError when attempting to fetch resource.', 'Load failed'])(
    '브라우저·Node 의 fetch 네트워크 실패 문구(%s)도 NETWORK 로 변환한다',
    (message) => {
      expect(toApiError(new TypeError(message)).code).toBe('NETWORK');
    },
  );

  it('네트워크와 무관한 TypeError(응답 형식 오류 등)는 재시도하지 않는 UNKNOWN 으로 변환한다', () => {
    const error = toApiError(new TypeError("Cannot read properties of undefined (reading 'questions')"));
    expect(error.code).toBe('UNKNOWN');
    expect(error.retryable).toBe(false);
  });

  it('그 밖의 Error 는 UNKNOWN 으로 변환하고 메시지를 보존한다', () => {
    const error = toApiError(new RangeError('bad range'));
    expect(error.code).toBe('UNKNOWN');
    expect(error.message).toBe('bad range');
  });

  it.each([
    ['문자열', 'boom', 'boom'],
    ['undefined', undefined, 'undefined'],
    ['숫자', 42, '42'],
  ])('Error 가 아닌 값(%s)은 UNKNOWN 으로 변환한다', (_label, value, message) => {
    const error = toApiError(value);
    expect(error.code).toBe('UNKNOWN');
    expect(error.message).toBe(message);
  });
});

describe('toTransportError', () => {
  it('fetch 단계 오류는 문구와 관계없이 NETWORK, 중단은 TIMEOUT, ApiError 는 그대로', () => {
    expect(toTransportError(new TypeError('anything')).code).toBe('NETWORK');
    expect(toTransportError(new Error('socket hang up')).code).toBe('NETWORK');
    expect(toTransportError(new DOMException('Aborted', 'AbortError')).code).toBe('TIMEOUT');
    const original = new ApiError('SERVER', { status: 500 });
    expect(toTransportError(original)).toBe(original);
    expect(toTransportError('boom').code).toBe('UNKNOWN');
  });
});

describe('getErrorMessage', () => {
  it('ApiError 의 사용자 문구를 반환한다', () => {
    const error = new ApiError('VALIDATION', { userMessage: '질문 내용을 입력해 주세요.' });
    expect(getErrorMessage(error)).toBe('질문 내용을 입력해 주세요.');
  });

  it('일반 오류도 코드별 기본 문구로 바꿔 보여준다', () => {
    expect(getErrorMessage(new TypeError('Network request failed'))).toBe(
      new ApiError('NETWORK').userMessage,
    );
    expect(getErrorMessage('something')).toBe(new ApiError('UNKNOWN').userMessage);
  });

  it('개발자용 영문 메시지를 사용자에게 노출하지 않는다', () => {
    expect(getErrorMessage(new Error('Cannot read properties of undefined'))).not.toMatch(
      /Cannot read/,
    );
  });
});
