/**
 * API 클라이언트 진입점.
 *
 * 화면·훅에서는 `api` 만 import 해서 사용한다.
 *   import { api } from '@/api';
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSettings } from '@/store/settings';

import type { ApiClient } from './client';
import { readApiConfig } from './config';
import { HttpApiClient } from './http-client';
import { MockApiClient } from './mock/mock-client';
import { createDeviceThumbnailStore } from './mock/thumbnail-store';

export const apiConfig = readApiConfig();

function createClient(): ApiClient {
  if (apiConfig.mode === 'http') {
    return new HttpApiClient({ baseUrl: apiConfig.baseUrl, timeoutMs: apiConfig.timeoutMs });
  }
  return new MockApiClient({
    storage: AsyncStorage,
    getOptions: () => useSettings.getState().mock,
    // '다음 업로드 분석 실패시키기'는 1회성: 적용되면 자동으로 끈다
    onForcedFailureConsumed: () => useSettings.getState().setMockOptions({ forceAnalysisFailure: false }),
    // 첫 페이지 미리보기를 앱 저장소에 보관 (사진 선택 창의 임시 파일은 곧 지워진다)
    thumbnails: createDeviceThumbnailStore(),
  });
}

export const api: ApiClient = createClient();

/** 내장 데모 서버일 때만 반환 (개발자 도구용) */
export function getMockClient(): MockApiClient | null {
  return api instanceof MockApiClient ? api : null;
}

export type { ApiClient } from './client';
export { ApiError, getErrorMessage, isApiError, toApiError } from './errors';
