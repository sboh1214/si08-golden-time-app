/**
 * API 연결 설정.
 *
 * 빌드 시 환경변수로 결정된다 (eas.json 의 build profile `env` 또는 `.env`).
 *
 * | 변수                       | 설명                                     | 기본값   |
 * | -------------------------- | ---------------------------------------- | -------- |
 * | EXPO_PUBLIC_API_MODE       | `mock` (내장 데모 서버) / `http` (실서버) | `mock`   |
 * | EXPO_PUBLIC_API_BASE_URL   | 창업동아리 백엔드 주소 (http 모드)        | 없음     |
 * | EXPO_PUBLIC_API_TIMEOUT_MS | 요청 타임아웃 (ms)                        | `20000`  |
 * | EXPO_PUBLIC_APP_ENV        | `development` / `beta` / `production`     | `development` |
 * | EXPO_PUBLIC_SUPPORT_EMAIL  | 설정 › 정보 › '메일로 문의하기' 받는 주소  | 없음 (행 숨김) |
 *
 * `EXPO_PUBLIC_SUPPORT_EMAIL` 은 API 연결과 무관해 `src/components/settings/support-contact.ts` 에서 읽는다.
 * 운영사가 주소를 정하면 eas.json `preview`·`production` 의 `env` 에 넣는다 (주소를 임의로 만들지 않는다).
 *
 * 개발(development) 빌드에서는 http 모드인데 BASE_URL 이 비어 있으면 내장 데모 서버(mock)로 동작한다.
 * 배포용 빌드(beta·production)는 잘못된 설정으로 조용히 동작하지 않도록 `misconfiguration` 을 채우고,
 * 앱은 시작 화면에서 설정 오류를 안내한 뒤 멈춘다 (`src/app/_layout.tsx`).
 * - http 모드인데 BASE_URL 이 비어 있음
 * - BASE_URL 이 자리표시자(example.com 등)
 * - production 빌드가 실서버가 아닌 데모 서버로 설정됨
 */

export type ApiMode = 'mock' | 'http';
export type AppEnv = 'development' | 'beta' | 'production';

export interface ApiConfig {
  mode: ApiMode;
  baseUrl: string;
  timeoutMs: number;
  appEnv: AppEnv;
  /** 배포용 빌드의 연결 설정 오류 (개발자용 설명). 있으면 앱이 설정 오류 화면만 보여 준다 */
  misconfiguration?: string;
}

function parseMode(value: string | undefined): ApiMode {
  return value === 'http' ? 'http' : 'mock';
}

function parseEnv(value: string | undefined): AppEnv {
  if (value === 'beta' || value === 'production') return value;
  return 'development';
}

function parseTimeout(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 20_000;
}

export function normalizeBaseUrl(url: string | undefined): string {
  return (url ?? '').trim().replace(/\/+$/, '');
}

/** 문서용 예시 주소(RFC 2606 example.com/net/org, .example·.invalid)인지 */
export function isPlaceholderUrl(url: string): boolean {
  const match = /^[a-z][a-z\d+.-]*:\/\/([^/:?#]+)/i.exec(url);
  if (!match) return false;
  const host = match[1].toLowerCase();
  return /(^|\.)example\.(com|net|org)$/.test(host) || /\.(example|invalid)$/.test(host);
}

function findMisconfiguration(requested: ApiMode, baseUrl: string, appEnv: AppEnv): string | undefined {
  if (appEnv === 'development') return undefined;
  if (requested === 'http' && !baseUrl) {
    return 'EXPO_PUBLIC_API_MODE=http 인데 EXPO_PUBLIC_API_BASE_URL 이 비어 있습니다.';
  }
  if (requested === 'http' && isPlaceholderUrl(baseUrl)) {
    return `EXPO_PUBLIC_API_BASE_URL 이 자리표시자 주소(${baseUrl})입니다. 실서버 주소로 바꿔 다시 빌드하세요.`;
  }
  if (appEnv === 'production' && requested !== 'http') {
    return 'production 빌드가 내장 데모 서버(mock)로 설정되어 있습니다. EXPO_PUBLIC_API_MODE=http 와 실서버 주소를 지정하세요.';
  }
  return undefined;
}

export function readApiConfig(): ApiConfig {
  const baseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
  const requested = parseMode(process.env.EXPO_PUBLIC_API_MODE);
  const appEnv = parseEnv(process.env.EXPO_PUBLIC_APP_ENV);
  const misconfiguration = findMisconfiguration(requested, baseUrl, appEnv);
  return {
    mode: requested === 'http' && baseUrl ? 'http' : 'mock',
    baseUrl,
    timeoutMs: parseTimeout(process.env.EXPO_PUBLIC_API_TIMEOUT_MS),
    appEnv,
    ...(misconfiguration ? { misconfiguration } : {}),
  };
}
