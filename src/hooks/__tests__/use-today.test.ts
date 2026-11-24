import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useToday } from '../use-today';

/** 훅이 등록한 AppState 'change' 리스너 (react-native jest mock 의 addEventListener 는 jest.fn) */
function appStateListener(): (state: AppStateStatus) => void {
  const calls = jest.mocked(AppState.addEventListener).mock.calls;
  return calls[calls.length - 1][1] as (state: AppStateStatus) => void;
}

describe('useToday', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 2, 12, 23, 59, 30) });
    jest.mocked(AppState.addEventListener).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('자정이 지나면 다음 날짜로 바뀌고, 다음 자정도 다시 예약한다', async () => {
    const { result } = await renderHook(() => useToday());
    expect(result.current).toBe('2026-03-12');

    await act(() => jest.advanceTimersByTime(29_000));
    expect(result.current).toBe('2026-03-12');

    await act(() => jest.advanceTimersByTime(2_000));
    expect(result.current).toBe('2026-03-13');

    await act(() => jest.advanceTimersByTime(24 * 60 * 60 * 1000));
    expect(result.current).toBe('2026-03-14');
  });

  it('앱이 다시 앞으로 오면 날짜를 새로 읽는다 (백그라운드에서 타이머가 멈춘 경우)', async () => {
    const { result } = await renderHook(() => useToday());
    const onChange = appStateListener();

    // 타이머를 돌리지 않고 시계만 며칠 뒤로 옮긴다
    jest.setSystemTime(new Date(2026, 2, 20, 9, 0, 0));
    await act(() => onChange('background'));
    expect(result.current).toBe('2026-03-12');

    await act(() => onChange('active'));
    expect(result.current).toBe('2026-03-20');
  });

  it('언마운트하면 자정 타이머와 리스너를 정리한다', async () => {
    const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
    const { unmount } = await renderHook(() => useToday());
    const subscription = jest.mocked(AppState.addEventListener).mock.results[0].value as { remove: jest.Mock };
    // 23:59:30 → 다음 자정 + 1초 여유
    const midnightCall = setTimeoutSpy.mock.calls.findIndex((call) => call[1] === 31_000);
    const midnightTimer = setTimeoutSpy.mock.results[midnightCall].value;

    await unmount();
    expect(subscription.remove).toHaveBeenCalledTimes(1);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(midnightTimer);

    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });
});
