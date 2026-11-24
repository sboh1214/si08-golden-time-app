import type { ErrorBoundaryProps } from 'expo-router';

import { ErrorState } from './error-state';

/**
 * 화면 렌더링 중 예기치 못한 오류(계약과 다른 서버 응답 등)가 나도 앱 전체가 종료되지 않게
 * 해당 화면만 오류 안내로 바꾼다. 루트 레이아웃의 `unstable_settings.screenErrorBoundary` 로 연결.
 */
export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  if (__DEV__) console.error('[RouteErrorBoundary]', error);
  return (
    <ErrorState
      title="화면을 표시하지 못했어요"
      message="일시적인 문제로 화면을 그리지 못했어요. 다시 시도해도 같으면 앱을 다시 실행해 주세요."
      onRetry={() => void retry()}
    />
  );
}
