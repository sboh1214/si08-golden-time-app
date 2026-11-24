/**
 * API 연결 설정(readApiConfig) 단위 테스트.
 * 빌드 환경변수 조합에 따라 mock/http 모드와 주소·타임아웃이 올바르게 결정되는지 확인한다.
 */
import { isPlaceholderUrl, normalizeBaseUrl, readApiConfig } from '../config';

const ENV_KEYS = [
  'EXPO_PUBLIC_API_MODE',
  'EXPO_PUBLIC_API_BASE_URL',
  'EXPO_PUBLIC_API_TIMEOUT_MS',
  'EXPO_PUBLIC_APP_ENV',
] as const;

type EnvKey = (typeof ENV_KEYS)[number];

const saved: Partial<Record<EnvKey, string>> = {};

function setEnv(values: Partial<Record<EnvKey, string>>): void {
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, values);
}

beforeAll(() => {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('readApiConfig', () => {
  it('환경변수가 없으면 내장 데모 서버(mock)·기본값으로 동작한다', () => {
    setEnv({});
    expect(readApiConfig()).toEqual({
      mode: 'mock',
      baseUrl: '',
      timeoutMs: 20_000,
      appEnv: 'development',
    });
  });

  it('http 모드 + 주소가 있으면 실서버(http) 모드', () => {
    setEnv({ EXPO_PUBLIC_API_MODE: 'http', EXPO_PUBLIC_API_BASE_URL: 'https://api.example.kr' });
    const config = readApiConfig();
    expect(config.mode).toBe('http');
    expect(config.baseUrl).toBe('https://api.example.kr');
  });

  it('http 모드인데 주소가 비어 있으면 안전하게 mock 으로 대체한다', () => {
    setEnv({ EXPO_PUBLIC_API_MODE: 'http' });
    expect(readApiConfig().mode).toBe('mock');

    setEnv({ EXPO_PUBLIC_API_MODE: 'http', EXPO_PUBLIC_API_BASE_URL: '   ' });
    expect(readApiConfig()).toMatchObject({ mode: 'mock', baseUrl: '' });
  });

  it('주소 앞뒤 공백과 끝의 / 를 정리한다', () => {
    setEnv({
      EXPO_PUBLIC_API_MODE: 'http',
      EXPO_PUBLIC_API_BASE_URL: '  https://api.example.kr/health-note//  ',
    });
    expect(readApiConfig().baseUrl).toBe('https://api.example.kr/health-note');
  });

  it('mock 모드에서는 주소가 있어도 mock 으로 동작한다', () => {
    setEnv({ EXPO_PUBLIC_API_MODE: 'mock', EXPO_PUBLIC_API_BASE_URL: 'https://api.example.kr' });
    expect(readApiConfig().mode).toBe('mock');
  });

  it('알 수 없는 모드 값은 mock 으로 처리한다 (대소문자 구분)', () => {
    setEnv({ EXPO_PUBLIC_API_MODE: 'HTTP', EXPO_PUBLIC_API_BASE_URL: 'https://api.example.kr' });
    expect(readApiConfig().mode).toBe('mock');
  });

  it.each([
    ['15000', 15_000],
    ['2500.5', 2_500.5],
    ['abc', 20_000],
    ['0', 20_000],
    ['-100', 20_000],
    ['', 20_000],
    ['Infinity', 20_000],
  ])('타임아웃 %p → %p ms', (value, expected) => {
    setEnv({ EXPO_PUBLIC_API_TIMEOUT_MS: value });
    expect(readApiConfig().timeoutMs).toBe(expected);
  });

  it.each([
    ['beta', 'beta'],
    ['production', 'production'],
    ['development', 'development'],
    ['staging', 'development'],
  ] as const)('앱 환경 %p → %p', (value, expected) => {
    setEnv({ EXPO_PUBLIC_APP_ENV: value });
    expect(readApiConfig().appEnv).toBe(expected);
  });
});

describe('배포용 빌드 연결 설정 검사 (misconfiguration)', () => {
  it('개발 빌드는 설정이 비어 있어도 데모 서버로 조용히 동작한다', () => {
    setEnv({ EXPO_PUBLIC_API_MODE: 'http' });
    expect(readApiConfig().misconfiguration).toBeUndefined();
    setEnv({ EXPO_PUBLIC_API_MODE: 'http', EXPO_PUBLIC_API_BASE_URL: 'https://api.example.com' });
    expect(readApiConfig().misconfiguration).toBeUndefined();
  });

  it.each(['beta', 'production'])('%s 빌드에서 http 모드인데 주소가 비어 있으면 설정 오류', (appEnv) => {
    setEnv({ EXPO_PUBLIC_APP_ENV: appEnv, EXPO_PUBLIC_API_MODE: 'http' });
    const config = readApiConfig();
    expect(config.mode).toBe('mock');
    expect(config.misconfiguration).toMatch(/EXPO_PUBLIC_API_BASE_URL/);
  });

  it.each(['beta', 'production'])('%s 빌드에서 자리표시자 주소(example.com)는 설정 오류', (appEnv) => {
    setEnv({
      EXPO_PUBLIC_APP_ENV: appEnv,
      EXPO_PUBLIC_API_MODE: 'http',
      EXPO_PUBLIC_API_BASE_URL: 'https://api.example.com',
    });
    expect(readApiConfig().misconfiguration).toMatch(/자리표시자/);
  });

  it('production 빌드가 데모 서버로 설정되면 설정 오류', () => {
    setEnv({ EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_API_MODE: 'mock' });
    expect(readApiConfig().misconfiguration).toMatch(/데모 서버/);
  });

  it('beta 빌드의 데모 서버(preview 프로필)와 실서버 주소는 정상', () => {
    setEnv({ EXPO_PUBLIC_APP_ENV: 'beta', EXPO_PUBLIC_API_MODE: 'mock' });
    expect(readApiConfig().misconfiguration).toBeUndefined();
    setEnv({
      EXPO_PUBLIC_APP_ENV: 'production',
      EXPO_PUBLIC_API_MODE: 'http',
      EXPO_PUBLIC_API_BASE_URL: 'https://api.goldentime.kr',
    });
    expect(readApiConfig()).toMatchObject({ mode: 'http', baseUrl: 'https://api.goldentime.kr' });
    expect(readApiConfig().misconfiguration).toBeUndefined();
  });
});

describe('isPlaceholderUrl', () => {
  it.each([
    ['https://api.example.com', true],
    ['https://example.org/v1', true],
    ['http://backend.example', true],
    ['https://api.goldentime.invalid', true],
    ['https://api.example.kr', false],
    ['https://myexample.com', false],
    ['http://192.168.0.10:8787', false],
    ['', false],
  ])('%p → %p', (url, expected) => {
    expect(isPlaceholderUrl(url)).toBe(expected);
  });
});

describe('normalizeBaseUrl', () => {
  it.each([
    [undefined, ''],
    ['', ''],
    ['https://api.example.kr', 'https://api.example.kr'],
    ['https://api.example.kr/', 'https://api.example.kr'],
    [' https://api.example.kr/v1/// ', 'https://api.example.kr/v1'],
  ])('%p → %p', (input, expected) => {
    expect(normalizeBaseUrl(input)).toBe(expected);
  });
});
