/**
 * 앱 설정 (기기에 영구 저장).
 * - 온보딩·AI 해설 고지 동의 여부
 * - 개발자 도구: 내장 데모 서버 응답 지연·오류 발생률·분석 실패 시뮬레이션
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_MOCK_OPTIONS, type MockRuntimeOptions } from '@/api/mock/mock-client';

export interface SettingsState {
  /** 온보딩 + AI 해설 고지 동의 완료 */
  hasOnboarded: boolean;
  onboardedAt?: string;
  /** 해설 화면 글자 크게 보기 */
  largeText: boolean;
  /** 원문 대조 해설 화면 기본 배치: 나란히(side) / 위아래(stack) */
  explanationLayout: 'side' | 'stack';
  /** 내장 데모 서버 옵션 (mock 모드에서만 의미 있음) */
  mock: MockRuntimeOptions;

  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setLargeText: (value: boolean) => void;
  setExplanationLayout: (value: 'side' | 'stack') => void;
  setMockOptions: (patch: Partial<MockRuntimeOptions>) => void;
}

/**
 * 저장된 설정을 읽지 못한 경우(웹에서 사이트 저장소가 차단됨, 기기에 저장된 값이 깨짐 등).
 * zustand persist 는 이때 hasHydrated 를 true 로 만들지 않으므로 따로 기록해 두고,
 * 앱은 기본값(온보딩 전)으로 시작한다 — 스플래시·빈 화면에 멈추지 않게 하기 위함.
 */
let hydrationFailed = false;
const hydrationFailureListeners = new Set<() => void>();

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      hasOnboarded: false,
      onboardedAt: undefined,
      largeText: false,
      explanationLayout: 'side',
      mock: DEFAULT_MOCK_OPTIONS,

      completeOnboarding: () => set({ hasOnboarded: true, onboardedAt: new Date().toISOString() }),
      resetOnboarding: () => set({ hasOnboarded: false, onboardedAt: undefined }),
      setLargeText: (largeText) => set({ largeText }),
      setExplanationLayout: (explanationLayout) => set({ explanationLayout }),
      setMockOptions: (patch) => set((s) => ({ mock: { ...s.mock, ...patch } })),
    }),
    {
      name: 'health-note/settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (s) => ({
        hasOnboarded: s.hasOnboarded,
        onboardedAt: s.onboardedAt,
        largeText: s.largeText,
        explanationLayout: s.explanationLayout,
        mock: s.mock,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error === undefined) return;
        console.warn('[settings] 저장된 설정을 읽지 못해 기본값으로 시작합니다.', error);
        hydrationFailed = true;
        hydrationFailureListeners.forEach((listener) => listener());
      },
    },
  ),
);

function subscribeHydration(callback: () => void): () => void {
  const unsubFinish = useSettings.persist.onFinishHydration(callback);
  const unsubStart = useSettings.persist.onHydrate(callback);
  hydrationFailureListeners.add(callback);
  return () => {
    unsubFinish();
    unsubStart();
    hydrationFailureListeners.delete(callback);
  };
}

/** 설정을 화면에 쓸 준비가 됐는지 — 복원 완료, 또는 복원 실패로 기본값을 쓰기로 한 경우 */
function isSettingsReady(): boolean {
  return useSettings.persist.hasHydrated() || hydrationFailed;
}

/**
 * 저장된 설정 복원 완료 여부 (스플래시 유지·온보딩 분기 판단용).
 * 저장소를 읽지 못해도 true 가 되어 앱이 기본값으로 시작한다.
 */
export function useSettingsHydrated(): boolean {
  return useSyncExternalStore(subscribeHydration, isSettingsReady, () => false);
}
