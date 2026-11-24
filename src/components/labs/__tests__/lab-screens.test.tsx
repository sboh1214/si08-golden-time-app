/**
 * 검사 수치 화면 스모크 테스트 — 데이터 훅과 라우터를 대체해 화면 구성과 이동만 검증한다.
 * (라우트 파일은 src/app 에 두면 화면으로 인식되므로 테스트는 이 폴더에 둔다)
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import DocumentLabsScreen from '@/app/documents/[id]/labs';
import LabTrendScreen from '@/app/labs/[code]';
import LabCatalogScreen from '@/app/labs/index';
import { useAnalysis, useDocument, useLabCatalog, useLabTrend, useReanalyzeDocument } from '@/hooks/api';
import type { DocumentAnalysis, LabCatalogItem, LabResult, LabTrend, MedicalDocument } from '@/types/domain';

const mockPush = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  Stack: { Screen: () => null },
}));

// 안전 영역 Provider 없이 Screen 을 렌더링하기 위한 공식 jest mock
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);

jest.mock('@/hooks/api', () => ({
  useDocument: jest.fn(),
  useAnalysis: jest.fn(),
  useReanalyzeDocument: jest.fn(),
  useLabCatalog: jest.fn(),
  useLabTrend: jest.fn(),
}));

/** TanStack Query 결과 중 화면이 쓰는 부분만 흉내 낸다 */
function queryResult<T>(data: T) {
  return {
    data,
    error: null,
    isPending: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(() => Promise.resolve()),
  };
}

const catalog: LabCatalogItem[] = [
  {
    code: 'HBA1C',
    name: '당화혈색소',
    originalName: 'HbA1c',
    category: '당뇨',
    unit: '%',
    latestValue: 7.4,
    latestFlag: 'high',
    latestMeasuredAt: '2026-03-12',
    count: 3,
  },
  {
    code: 'LDL',
    name: 'LDL 콜레스테롤',
    originalName: 'LDL-C',
    category: '지질',
    unit: 'mg/dL',
    latestValue: 98,
    latestFlag: 'normal',
    latestMeasuredAt: '2026-03-12',
    count: 2,
  },
];

const trend: LabTrend = {
  code: 'HBA1C',
  name: '당화혈색소',
  originalName: 'HbA1c',
  category: '당뇨',
  unit: '%',
  referenceRange: { low: 4, high: 6, text: '4.0-6.0' },
  plainExplanation: '최근 2~3개월 동안의 평균 혈당을 보여줘요.',
  points: [
    { documentId: 'doc_a', labResultId: 'l1', measuredAt: '2025-09-10', value: 7.9, flag: 'high' },
    { documentId: 'doc_b', labResultId: 'l2', measuredAt: '2026-03-12', value: 7.4, flag: 'high' },
  ],
};

beforeEach(() => {
  mockPush.mockClear();
  mockParams = {};
});

describe('내 검사 수치 (/labs)', () => {
  it('확인이 필요한 항목을 먼저, 나머지는 분류별로 보여주고 누르면 추이로 이동한다', async () => {
    jest.mocked(useLabCatalog).mockReturnValue(queryResult(catalog) as unknown as ReturnType<typeof useLabCatalog>);
    await render(<LabCatalogScreen />);

    // 섹션 제목 옆에 개수가 함께 표시된다
    expect(screen.getByText(/^확인이 필요한 항목/)).toBeTruthy();
    expect(screen.getByText(/^지질/)).toBeTruthy();
    expect(screen.getByText('3회 측정 · 최근 2026.03.12')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: /^당화혈색소, 최근 7.4%/ }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/labs/[code]', params: { code: 'HBA1C' } });
  });

  it('기록이 없으면 등록 안내', async () => {
    jest.mocked(useLabCatalog).mockReturnValue(queryResult([]) as unknown as ReturnType<typeof useLabCatalog>);
    await render(<LabCatalogScreen />);
    expect(screen.getByText('아직 모인 검사 수치가 없어요')).toBeTruthy();
  });
});

describe('검사 추이 (/labs/[code])', () => {
  beforeEach(() => {
    mockParams = { code: 'HBA1C' };
    jest.mocked(useLabTrend).mockReturnValue(queryResult(trend) as unknown as ReturnType<typeof useLabTrend>);
  });

  it('최근 결과와 지난 검사 대비 변화를 중립적으로 보여준다', async () => {
    await render(<LabTrendScreen />);
    expect(screen.getByText('지난 검사보다 0.5%p 낮아졌어요')).toBeTruthy();
    expect(screen.getByText('참고치 4 ~ 6%')).toBeTruthy();
    expect(screen.getByText('최근 2~3개월 동안의 평균 혈당을 보여줘요.')).toBeTruthy();
  });

  it('측정 기록을 누르면 해당 결과지의 검사 수치 화면으로 이동한다', async () => {
    await render(<LabTrendScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /^2025년 9월 10일/ }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/documents/[id]/labs', params: { id: 'doc_a' } });
  });

  it('질문 추가 시 검사명·수치를 담아 질문 작성 화면을 연다', async () => {
    await render(<LabTrendScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '이 검사에 대해 질문 추가' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/questions/edit',
      params: {
        text: '당화혈색소 수치가 참고치보다 높게 나온 이유와 관리 방법에 대해 여쭤보고 싶어요.',
        relatedLabel: '당화혈색소 7.4%',
        documentId: 'doc_b',
      },
    });
  });
});

describe('문서 검사 수치 (/documents/[id]/labs)', () => {
  const lab = (overrides: Partial<LabResult>): LabResult => ({
    id: 'lab',
    code: 'CODE',
    name: '검사',
    originalName: 'Test',
    category: '당뇨',
    value: 1,
    unit: 'mg/dL',
    referenceRange: { low: 0, high: 2, text: '0-2' },
    flag: 'normal',
    measuredAt: '2026-03-12',
    plainExplanation: '',
    sentenceIds: [],
    ...overrides,
  });

  const document: MedicalDocument = {
    id: 'doc_1',
    title: '샘플내과의원 · 검사 결과지',
    documentType: 'lab_result',
    hospitalName: '샘플내과의원',
    visitDate: '2026-03-12',
    source: 'camera',
    pageCount: 1,
    status: 'completed',
    progress: 100,
    createdAt: '2026-03-12T09:00:00.000Z',
    updatedAt: '2026-03-12T09:00:00.000Z',
  };

  const analysis = (labResults: LabResult[]): DocumentAnalysis => ({
    documentId: 'doc_1',
    generatedAt: '2026-03-12T09:00:00.000Z',
    modelVersion: 'test',
    overallSummary: '',
    diagnoses: [],
    labResults,
    medications: [],
    sentences: [],
    suggestedQuestions: [],
    disclaimer: '',
  });

  function mockDocument(labResults: LabResult[]) {
    jest.mocked(useDocument).mockReturnValue(queryResult(document) as unknown as ReturnType<typeof useDocument>);
    jest
      .mocked(useAnalysis)
      .mockReturnValue(queryResult(analysis(labResults)) as unknown as ReturnType<typeof useAnalysis>);
    jest
      .mocked(useReanalyzeDocument)
      .mockReturnValue({ mutate: jest.fn(), isPending: false } as unknown as ReturnType<typeof useReanalyzeDocument>);
  }

  beforeEach(() => {
    mockParams = { id: 'doc_1' };
  });

  it('요약·분류별 카드를 보여주고 확인 필요 필터와 추이 이동이 동작한다', async () => {
    mockDocument([
      lab({
        id: 'l1',
        code: 'FBS',
        name: '공복혈당',
        value: 132,
        referenceRange: { low: 70, high: 99, text: '70-99' },
        flag: 'high',
      }),
      lab({
        id: 'l2',
        code: 'LDL',
        name: 'LDL 콜레스테롤',
        category: '지질',
        value: 98,
        referenceRange: { high: 130, text: '<130' },
      }),
    ]);
    await render(<DocumentLabsScreen />);

    expect(screen.getByText('검사 결과 2항목')).toBeTruthy();
    expect(screen.getByLabelText('정상 1개')).toBeTruthy();
    expect(screen.getByLabelText('높음 1개')).toBeTruthy();
    expect(screen.getByText('LDL 콜레스테롤')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: '확인 필요 1개' }));
    expect(screen.queryByText('LDL 콜레스테롤')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: '공복혈당 수치 변화 보기' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/labs/[code]', params: { code: 'FBS' } });
  });

  it('검사 수치가 없는 문서는 빈 상태 안내', async () => {
    mockDocument([]);
    await render(<DocumentLabsScreen />);
    expect(screen.getByText('이 기록에는 검사 수치가 없어요')).toBeTruthy();
  });
});
