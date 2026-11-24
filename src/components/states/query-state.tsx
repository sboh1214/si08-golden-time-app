import type { ReactNode } from 'react';

import { toApiError } from '@/api/errors';

import { EmptyState, type EmptyStateProps } from './empty-state';
import { ErrorState } from './error-state';
import { LoadingState } from './loading-state';
import { RefreshErrorBanner } from './refresh-error-banner';

/** TanStack Query 결과 중 화면 상태 판단에 필요한 부분 */
export interface QueryLike<T> {
  data: T | undefined;
  error: unknown;
  isPending: boolean;
  isError: boolean;
  isRefetching?: boolean;
  refetch: () => unknown;
}

export interface QueryStateProps<T> {
  query: QueryLike<T>;
  children: (data: T) => ReactNode;
  loadingMessage?: string;
  /** 데이터가 비었는지 판단 (true 면 empty 렌더) */
  isEmpty?: (data: T) => boolean;
  empty?: EmptyStateProps;
  errorTitle?: string;
  fill?: boolean;
}

/** 재조회 결과 데이터가 서버에서 사라진 경우(404) — 이전 데이터를 계속 보여 주면 안 된다 */
export function isGoneError(error: unknown): boolean {
  return error != null && toApiError(error).code === 'NOT_FOUND';
}

/**
 * 로딩 → 오류(다시 시도) → 빈 상태 → 데이터 를 일관되게 처리하는 래퍼.
 *
 * 전체 오류 화면은 **보여 줄 데이터가 없을 때만** 쓴다. 이미 받은 데이터가 있는데 백그라운드
 * 재조회만 실패하면(TanStack v5 는 이때도 `isError`) 데이터를 그대로 보여 주고 위에 작은 안내만
 * 띄운다 — 화면이 언마운트되어 작성 중인 내용·필터·진료실 모드가 사라지지 않게 하기 위함이다.
 *
 * @example
 * <QueryState query={useDocuments()} isEmpty={(d) => d.length === 0} empty={{ title: '등록된 문서가 없어요' }}>
 *   {(docs) => <DocumentList docs={docs} />}
 * </QueryState>
 */
export function QueryState<T>({
  query,
  children,
  loadingMessage,
  isEmpty,
  empty,
  errorTitle,
  fill = true,
}: QueryStateProps<T>) {
  if (query.isPending) return <LoadingState message={loadingMessage} fill={fill} />;
  if (query.data === undefined || (query.isError && isGoneError(query.error))) {
    return (
      <ErrorState
        error={query.error}
        title={errorTitle}
        onRetry={() => void query.refetch()}
        retrying={query.isRefetching}
        fill={fill}
      />
    );
  }
  const content =
    isEmpty?.(query.data) && empty ? <EmptyState fill={fill} {...empty} /> : children(query.data);
  if (!query.isError) return <>{content}</>;
  return (
    <>
      <RefreshErrorBanner
        error={query.error}
        onRetry={() => void query.refetch()}
        retrying={query.isRefetching}
      />
      {content}
    </>
  );
}
