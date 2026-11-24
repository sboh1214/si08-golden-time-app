import { useState } from 'react';

/**
 * 당겨서 새로고침 상태 — 당겨서 새로고침이 있는 모든 화면이 함께 쓴다.
 *
 * TanStack Query 의 `isRefetching` 은 처리 중 문서 폴링 때도 true 가 되어
 * 새로고침 표시가 깜빡이므로, 사용자가 직접 당긴 경우에만 표시하도록 별도로 관리한다.
 * (`refetch()` 는 실패해도 예외를 던지지 않고 각 쿼리의 오류 상태로 반영된다)
 */
export function useManualRefresh(refetchers: readonly (() => Promise<unknown>)[]) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all(refetchers.map((refetch) => refetch()));
    } finally {
      setRefreshing(false);
    }
  };

  return { refreshing, onRefresh };
}
