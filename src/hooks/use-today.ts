import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { todayString } from '@/lib/format';

/** 자정 직후에 갱신되도록 두는 여유 (타이머가 자정 직전에 깨어나 같은 날짜를 읽지 않게) */
const MIDNIGHT_MARGIN_MS = 1_000;

function msUntilNextMidnight(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime() + MIDNIGHT_MARGIN_MS;
}

/**
 * 오늘 날짜('YYYY-MM-DD') — 자정이 지나거나 앱이 다시 앞으로 오면 새 날짜로 바뀐다.
 *
 * React Compiler 는 입력이 없는 렌더 계산을 처음 한 번만 실행하고 캐시한다.
 * 탭 화면은 며칠씩 마운트된 채로 남을 수 있으므로 렌더 중에 시계를 읽지 않고 상태로 들고 있는다.
 */
export function useToday(): string {
  const [today, setToday] = useState(todayString);

  useEffect(() => {
    const refresh = () => setToday(todayString());

    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleMidnight = () => {
      timer = setTimeout(() => {
        refresh();
        scheduleMidnight();
      }, msUntilNextMidnight());
    };
    scheduleMidnight();

    // 백그라운드에서는 타이머가 멈출 수 있어 앱이 다시 열릴 때도 확인한다
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return today;
}
