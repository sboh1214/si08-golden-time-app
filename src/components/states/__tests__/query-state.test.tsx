/**
 * QueryState · DocumentGate 화면 상태 테스트.
 * 핵심 규칙: 전체 오류 화면은 보여 줄 데이터가 없을 때만 — 백그라운드 재조회 실패로
 * 작성 중인 화면이 언마운트되면 안 된다.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ApiError } from '@/api/errors';
import { DocumentGate } from '@/components/domain/document-gate';
import { useAnalysis, useDocument, useReanalyzeDocument } from '@/hooks/api';
import { ANALYSIS_FAILED_TITLE, DEFAULT_FAILURE_REASON } from '@/lib/labels';
import type { DocumentAnalysis, MedicalDocument } from '@/types/domain';

import { QueryState, type QueryLike } from '../query-state';

jest.mock('@/hooks/api', () => ({
  useDocument: jest.fn(),
  useAnalysis: jest.fn(),
  useReanalyzeDocument: jest.fn(),
}));

function query<T>(overrides: Partial<QueryLike<T>> = {}): QueryLike<T> {
  return {
    data: undefined,
    error: null,
    isPending: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(() => Promise.resolve()),
    ...overrides,
  };
}

const networkError = new ApiError('NETWORK');

describe('QueryState', () => {
  it('처음 불러오는 중이면 로딩, 데이터 없이 실패하면 전체 오류 화면', async () => {
    const { rerender } = await render(
      <QueryState query={query<string>({ isPending: true })}>{(d) => <Text>{d}</Text>}</QueryState>,
    );
    expect(screen.getByTestId('loading-state')).toBeTruthy();

    const failed = query<string>({ isError: true, error: networkError });
    await rerender(<QueryState query={failed}>{(d) => <Text>{d}</Text>}</QueryState>);
    expect(screen.getByTestId('error-state')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('error-retry'));
    expect(failed.refetch).toHaveBeenCalled();
  });

  it('이미 받은 데이터가 있으면 재조회가 실패해도 내용을 유지하고 작은 안내만 보여 준다', async () => {
    const stale = query({ data: '작성 중인 답변 메모', isError: true, error: networkError });
    await render(<QueryState query={stale}>{(d) => <Text>{d}</Text>}</QueryState>);

    expect(screen.getByText('작성 중인 답변 메모')).toBeTruthy();
    expect(screen.queryByTestId('error-state')).toBeNull();
    expect(screen.getByTestId('refresh-error-banner')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('refresh-error-retry'));
    expect(stale.refetch).toHaveBeenCalled();
  });

  it('재조회 결과가 404(삭제됨)면 이전 내용 대신 오류 화면', async () => {
    const gone = query({ data: '삭제된 항목', isError: true, error: new ApiError('NOT_FOUND', { status: 404 }) });
    await render(<QueryState query={gone}>{(d) => <Text>{d}</Text>}</QueryState>);
    expect(screen.getByTestId('error-state')).toBeTruthy();
    expect(screen.queryByText('삭제된 항목')).toBeNull();
  });

  it('정상이면 안내 없이 내용, 비었으면 빈 상태', async () => {
    const { rerender } = await render(
      <QueryState query={query({ data: '내용' })}>{(d) => <Text>{d}</Text>}</QueryState>,
    );
    expect(screen.getByText('내용')).toBeTruthy();
    expect(screen.queryByTestId('refresh-error-banner')).toBeNull();

    await rerender(
      <QueryState query={query({ data: [] as string[] })} isEmpty={(d) => d.length === 0} empty={{ title: '비었어요' }}>
        {() => <Text>목록</Text>}
      </QueryState>,
    );
    expect(screen.getByTestId('empty-state')).toBeTruthy();
  });
});

describe('DocumentGate', () => {
  const baseDocument: MedicalDocument = {
    id: 'doc_1',
    title: '부산내과의원 · 검사 결과지',
    documentType: 'lab_result',
    hospitalName: '부산내과의원',
    visitDate: '2026-11-20',
    source: 'camera',
    pageCount: 1,
    status: 'ocr',
    progress: 37.6,
    createdAt: '2026-11-20T01:00:00.000Z',
    updatedAt: '2026-11-20T01:00:00.000Z',
  };
  const analysis = { documentId: 'doc_1' } as unknown as DocumentAnalysis;

  beforeEach(() => {
    jest.mocked(useReanalyzeDocument).mockReturnValue({ isPending: false, mutate: jest.fn() } as never);
    jest.mocked(useAnalysis).mockReturnValue(query<DocumentAnalysis>() as never);
  });

  it('처리 중 폴링이 한 번 실패해도 진행 화면을 유지한다 (진행률은 반올림)', async () => {
    jest
      .mocked(useDocument)
      .mockReturnValue(query({ data: baseDocument, isError: true, error: networkError }) as never);
    await render(<DocumentGate documentId="doc_1">{() => <Text>결과</Text>}</DocumentGate>);

    expect(screen.getByText('AI가 해설을 만들고 있어요')).toBeTruthy();
    expect(screen.getByText('38%')).toBeTruthy();
    expect(screen.getByTestId('refresh-error-banner')).toBeTruthy();
    expect(screen.queryByTestId('error-state')).toBeNull();
  });

  it('분석 실패: 공통 제목, 사유가 빈 문자열이면 기본 안내', async () => {
    jest
      .mocked(useDocument)
      .mockReturnValue(query({ data: { ...baseDocument, status: 'failed', failureReason: '' } }) as never);
    await render(<DocumentGate documentId="doc_1">{() => <Text>결과</Text>}</DocumentGate>);

    expect(screen.getByText(ANALYSIS_FAILED_TITLE)).toBeTruthy();
    expect(screen.getByText(DEFAULT_FAILURE_REASON)).toBeTruthy();
  });

  it('완료 문서의 해설 재조회가 실패해도 내용(children)을 유지한다', async () => {
    jest
      .mocked(useDocument)
      .mockReturnValue(query({ data: { ...baseDocument, status: 'completed', progress: 100 } }) as never);
    jest
      .mocked(useAnalysis)
      .mockReturnValue(query({ data: analysis, isError: true, error: networkError }) as never);
    await render(<DocumentGate documentId="doc_1">{() => <Text>정리 결과 내용</Text>}</DocumentGate>);

    expect(screen.getByText('정리 결과 내용')).toBeTruthy();
    expect(screen.getByTestId('refresh-error-banner')).toBeTruthy();
  });
});
