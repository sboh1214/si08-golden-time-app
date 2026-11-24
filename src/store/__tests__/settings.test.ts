/**
 * 앱 설정 스토어(useSettings) 단위 테스트 — 온보딩 동의, 화면 옵션, 개발자 도구(데모 서버) 옵션, 영구 저장.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook } from '@testing-library/react-native';

import { DEFAULT_MOCK_OPTIONS } from '@/api/mock/mock-client';

import { useSettings, useSettingsHydrated } from '../settings';

const STORAGE_KEY = 'health-note/settings';
const initialState = useSettings.getState();
const settings = () => useSettings.getState();

/** 영구 저장된 설정 값 (zustand persist 형식: { state, version }) */
async function readPersisted(): Promise<{ state: Record<string, unknown>; version: number }> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) throw new Error('설정이 저장되지 않았습니다.');
  return JSON.parse(raw) as { state: Record<string, unknown>; version: number };
}

beforeEach(async () => {
  useSettings.setState(initialState, true);
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useSettings', () => {
  it('기본값: 온보딩 전, 보통 글자, 나란히 보기, 데모 서버 기본 옵션', () => {
    expect(settings()).toMatchObject({
      hasOnboarded: false,
      largeText: false,
      explanationLayout: 'side',
      mock: DEFAULT_MOCK_OPTIONS,
    });
    expect(settings().onboardedAt).toBeUndefined();
  });

  it('온보딩 완료 시 동의 시각을 기록하고, 초기화하면 지운다', () => {
    jest.useFakeTimers({ now: new Date('2026-11-24T01:00:00.000Z') });
    settings().completeOnboarding();
    expect(settings().hasOnboarded).toBe(true);
    expect(settings().onboardedAt).toBe('2026-11-24T01:00:00.000Z');

    settings().resetOnboarding();
    expect(settings().hasOnboarded).toBe(false);
    expect(settings().onboardedAt).toBeUndefined();
  });

  it('글자 크게 보기·해설 배치를 바꾼다', () => {
    settings().setLargeText(true);
    settings().setExplanationLayout('stack');
    expect(settings()).toMatchObject({ largeText: true, explanationLayout: 'stack' });
  });

  it('데모 서버 옵션은 바꾼 항목만 덮어쓴다', () => {
    settings().setMockOptions({ failureRate: 0.3 });
    settings().setMockOptions({ forceAnalysisFailure: true });
    expect(settings().mock).toEqual({
      ...DEFAULT_MOCK_OPTIONS,
      failureRate: 0.3,
      forceAnalysisFailure: true,
    });
  });

  it('설정 값만 기기에 저장하고 함수는 저장하지 않는다', async () => {
    settings().setLargeText(true);
    settings().setMockOptions({ latencyMs: 1_500 });

    const persisted = await readPersisted();
    expect(persisted.version).toBe(1);
    expect(Object.keys(persisted.state).sort()).toEqual(
      ['explanationLayout', 'hasOnboarded', 'largeText', 'mock'].sort(),
    );
    expect(persisted.state).toMatchObject({
      largeText: true,
      mock: { ...DEFAULT_MOCK_OPTIONS, latencyMs: 1_500 },
    });
  });
});

// 복원 실패 기록은 모듈 단위로 유지되므로 이 파일의 마지막 테스트로 둔다
describe('useSettingsHydrated', () => {
  it('저장된 설정이 깨져 복원에 실패해도 기본값으로 시작할 수 있게 준비 완료를 알린다', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await AsyncStorage.setItem(STORAGE_KEY, '{깨진 JSON');

    await useSettings.persist.rehydrate();

    // zustand persist 는 실패 시 hasHydrated 를 올리지 않는다 — 앱은 그래도 멈추면 안 된다
    expect(useSettings.persist.hasHydrated()).toBe(false);
    const { result } = await renderHook(() => useSettingsHydrated());
    expect(result.current).toBe(true);
    expect(settings().hasOnboarded).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
