/**
 * 서버 상태 훅 단위 테스트 — 문서 처리 완료 시 파생 데이터(검사 항목·타임라인) 갱신.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { api } from '@/api';
import type { MedicalDocument, ProcessingStatus, Question } from '@/types/domain';

import { hasFinishedProcessing, queryKeys, useCreateQuestion, useDocuments } from '../api';

function doc(id: string, status: ProcessingStatus): MedicalDocument {
  return {
    id,
    title: `문서 ${id}`,
    documentType: 'lab_result',
    hospitalName: '부산내과의원',
    visitDate: '2026-11-20',
    source: 'camera',
    pageCount: 1,
    status,
    progress: status === 'completed' ? 100 : 40,
    createdAt: '2026-11-20T01:00:00.000Z',
    updatedAt: '2026-11-20T01:00:00.000Z',
  };
}

describe('hasFinishedProcessing', () => {
  it('처리 중이던 문서가 완료·실패로 바뀌면 true', () => {
    expect(hasFinishedProcessing([doc('a', 'ocr')], [doc('a', 'completed')])).toBe(true);
    expect(hasFinishedProcessing([doc('a', 'explaining')], [doc('a', 'failed')])).toBe(true);
  });

  it('이전 목록이 없거나, 계속 처리 중이거나, 원래 완료였던 문서만 있으면 false', () => {
    expect(hasFinishedProcessing(undefined, [doc('a', 'completed')])).toBe(false);
    expect(hasFinishedProcessing([doc('a', 'ocr')], [doc('a', 'structuring')])).toBe(false);
    expect(hasFinishedProcessing([doc('a', 'completed')], [doc('a', 'completed')])).toBe(false);
    // 처리 중 문서가 삭제되어 목록에서 사라진 경우
    expect(hasFinishedProcessing([doc('a', 'ocr')], [doc('b', 'completed')])).toBe(false);
  });
});

describe('useDocuments', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('목록 폴링만 남아 있어도 처리가 끝나면 검사 항목·타임라인을 다시 조회하게 한다', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    jest
      .spyOn(api, 'listDocuments')
      .mockResolvedValueOnce([doc('a', 'explaining'), doc('b', 'completed')])
      .mockResolvedValueOnce([doc('a', 'completed'), doc('b', 'completed')]);
    const invalidate = jest.spyOn(client, 'invalidateQueries');

    const { result, unmount } = await renderHook(() => useDocuments(), { wrapper });
    try {
      await waitFor(() => expect(result.current.data?.[0].status).toBe('explaining'));
      expect(invalidate).not.toHaveBeenCalled();

      await act(async () => {
        await result.current.refetch();
      });
      await waitFor(() => expect(result.current.data?.[0].status).toBe('completed'));

      const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
      expect(keys).toEqual(expect.arrayContaining([queryKeys.labCatalog, queryKeys.timeline]));
      // 진행 중인 자기 자신(목록)을 무효화하면 이번 응답이 취소되므로 목록 키는 건드리지 않는다
      expect(keys).not.toContainEqual(queryKeys.documents);
    } finally {
      await unmount();
      client.clear();
    }
  });
});

describe('useCreateQuestion', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('질문을 저장하면 캐시된 모든 AI 추천 목록에서 같은 문장을 뺀다 (서버 규칙과 같게)', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    client.setQueryData(queryKeys.questionSuggestions('a'), ['약은 언제까지 먹나요?', '운동해도 되나요?']);
    client.setQueryData(queryKeys.questionSuggestions('b'), ['약은 언제까지 먹나요?']);
    const saved: Question = {
      id: 'q1',
      text: '약은 언제까지 먹나요?',
      source: 'user',
      isAsked: false,
      createdAt: '2026-11-20T01:00:00.000Z',
      updatedAt: '2026-11-20T01:00:00.000Z',
    };
    jest.spyOn(api, 'createQuestion').mockResolvedValue(saved);

    const { result, unmount } = await renderHook(() => useCreateQuestion(), { wrapper });
    try {
      await act(async () => {
        await result.current.mutateAsync({ text: ' 약은 언제까지 먹나요? ', source: 'user' });
      });
      expect(client.getQueryData(queryKeys.questionSuggestions('a'))).toEqual(['운동해도 되나요?']);
      expect(client.getQueryData(queryKeys.questionSuggestions('b'))).toEqual([]);
    } finally {
      await unmount();
    }
  });
});
