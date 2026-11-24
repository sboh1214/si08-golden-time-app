import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { FlatList } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

import { useSettings } from '@/store/settings';
import type { DocumentAnalysis, MedicalDocument } from '@/types/domain';

import { ExplanationView } from '../explanation-view';
import { ExplanationHeaderActions } from '../header-actions';
import { ReadingGuide } from '../reading-guide';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

const document: MedicalDocument = {
  id: 'doc_1',
  title: '한빛내과의원 · 진료기록',
  documentType: 'medical_record',
  hospitalName: '한빛내과의원',
  department: '내과',
  visitDate: '2026-03-12',
  source: 'camera',
  pageCount: 1,
  status: 'completed',
  progress: 100,
  createdAt: '2026-03-12T09:00:00.000Z',
  updatedAt: '2026-03-12T09:00:00.000Z',
};

const analysis: DocumentAnalysis = {
  documentId: 'doc_1',
  generatedAt: '2026-03-12T09:01:00.000Z',
  modelVersion: 'test-model-1',
  overallSummary: '',
  diagnoses: [
    {
      id: 'dx_1',
      name: '제2형 당뇨병',
      originalTerm: 'Type 2 DM',
      status: 'confirmed',
      plainExplanation: '',
      sentenceIds: ['s3'],
    },
  ],
  labResults: [
    {
      id: 'lab_1',
      code: 'HBA1C',
      name: '당화혈색소',
      originalName: 'HbA1c',
      category: '당뇨',
      value: 7.4,
      unit: '%',
      referenceRange: { low: 4, high: 5.6, text: '4.0-5.6' },
      flag: 'high',
      measuredAt: '2026-03-12',
      plainExplanation: '',
      sentenceIds: ['s2'],
    },
  ],
  medications: [],
  sentences: [
    {
      id: 's3',
      order: 3,
      section: '진단',
      original: 'Type 2 DM, uncontrolled',
      plain: '제2형 당뇨병이 있고, 혈당이 잘 조절되지 않고 있어요.',
      terms: [{ term: 'Type 2 DM', meaning: '제2형 당뇨병' }],
      confidence: 0.62,
      relatedItemIds: ['dx_1'],
    },
    {
      id: 's1',
      order: 1,
      section: '주호소',
      original: 'Polydipsia x 1mo',
      plain: '한 달 전부터 목이 자주 말랐어요.',
      terms: [{ term: 'Polydipsia', meaning: '물을 많이 마시게 되는 증상' }],
      confidence: 0.93,
      relatedItemIds: [],
    },
    {
      id: 's2',
      order: 2,
      section: '검사 결과',
      original: 'HbA1c 7.4% (H)',
      plain: '최근 2~3개월 평균 혈당을 보여주는 당화혈색소가 7.4%로 기준보다 높아요.',
      terms: [{ term: 'HbA1c', meaning: '최근 2~3개월 동안의 평균 혈당 수치' }],
      confidence: 0.9,
      relatedItemIds: ['lab_1', 'unknown_item'],
    },
  ],
  suggestedQuestions: [],
  disclaimer: '테스트 고지 문구',
};

async function renderView(overrides: Partial<DocumentAnalysis> = {}, targetSentenceId?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  );
  await render(
    <ExplanationView document={document} analysis={{ ...analysis, ...overrides }} targetSentenceId={targetSentenceId} />,
    { wrapper },
  );
}

describe('ExplanationView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettings.setState({ explanationLayout: 'side', largeText: false });
  });

  it('원문과 쉬운 해설을 짝지어 구역 순서대로 보여준다', async () => {
    await renderView();

    // 열 머리글은 화면에만 보이고 스크린리더에서는 각 카드의 라벨로 대신 읽힌다
    expect(screen.getByText('진료기록 원문', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('쉬운 해설', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByLabelText('진료기록 원문: Polydipsia x 1mo')).toBeTruthy();
    expect(screen.getByLabelText('쉬운 해설: 한 달 전부터 목이 자주 말랐어요.')).toBeTruthy();

    const headings = screen.getAllByRole('header').map((h) => h.props.accessibilityLabel as string | undefined);
    const sectionOrder = headings.filter((label): label is string => Boolean(label?.includes('문장')));
    expect(sectionOrder.map((label) => label.split(',')[0])).toEqual(['주호소', '검사 결과', '진단']);

    expect(screen.getByLabelText('문장 3개')).toBeTruthy();
    expect(screen.getByLabelText('어려운 용어 3개')).toBeTruthy();
    expect(screen.getByText('테스트 고지 문구')).toBeTruthy();
  });

  it('신뢰도가 낮은 문장에는 의료진 확인 권장을 표시한다', async () => {
    await renderView();

    expect(screen.getAllByLabelText('의료진 확인 권장')).toHaveLength(1);
    expect(screen.getByLabelText('확인 권장 1개')).toBeTruthy();
  });

  it('용어 버튼을 누르면 뜻 시트가 열리고 닫을 수 있다', async () => {
    await renderView();

    await fireEvent.press(screen.getByRole('button', { name: 'HbA1c 뜻 보기' }));
    expect(screen.getByText('최근 2~3개월 동안의 평균 혈당 수치')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: '확인했어요' }));
    expect(screen.queryByText('최근 2~3개월 동안의 평균 혈당 수치')).toBeNull();
  });

  it('관련 항목: 검사는 추이 화면으로, 진단은 정리 결과 화면으로 이동한다', async () => {
    await renderView();

    await fireEvent.press(screen.getByRole('link', { name: '관련 검사: 당화혈색소, 높음' }));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/labs/[code]', params: { code: 'HBA1C' } });

    await fireEvent.press(screen.getByRole('link', { name: '관련 진단: 제2형 당뇨병' }));
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/documents/[id]', params: { id: 'doc_1' } });
  });

  it('구역 필터를 고르면 해당 구역 문장만 남는다', async () => {
    await renderView();

    await fireEvent.press(screen.getByRole('button', { name: '진단 1개' }));
    expect(screen.getByLabelText('진료기록 원문: Type 2 DM, uncontrolled')).toBeTruthy();
    expect(screen.queryByLabelText('진료기록 원문: Polydipsia x 1mo')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: '전체 3개' }));
    expect(screen.getByLabelText('진료기록 원문: Polydipsia x 1mo')).toBeTruthy();
  });

  it('용어 사전을 펼치면 가나다순 용어와 뜻을 보여준다', async () => {
    await renderView();

    expect(screen.queryByText('물을 많이 마시게 되는 증상')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: '용어 사전, 3개' }));
    expect(screen.getByText('물을 많이 마시게 되는 증상')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Polydipsia 용어가 나온 문장 보기' })).toBeTruthy();
  });

  it('위아래로 보기에서는 원문 아래에 해설을 연결해 보여준다', async () => {
    useSettings.setState({ explanationLayout: 'stack' });
    await renderView();

    expect(screen.getAllByText('쉽게 말하면', { includeHiddenElements: true })).toHaveLength(3);
    expect(screen.getByText('위는 진료기록 원문, 아래는 쉽게 풀어 쓴 해설이에요.')).toBeTruthy();
  });

  describe('문장으로 이동', () => {
    let scrollToIndex: jest.SpyInstance;

    beforeEach(() => {
      jest.useFakeTimers();
      scrollToIndex = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => undefined);
    });

    afterEach(() => {
      scrollToIndex.mockRestore();
      jest.useRealTimers();
    });

    it('sentenceId 로 들어오면 그 문장으로 스크롤하고 잠시 강조한다', async () => {
      await renderView({}, 's3');

      await act(() => jest.advanceTimersByTime(300));
      // [도구 막대, 주호소, s1, 검사 결과, s2, 진단, s3]
      expect(scrollToIndex).toHaveBeenCalledWith(expect.objectContaining({ index: 6, animated: true }));
      expect(screen.getByTestId('sentence-s3')).toHaveStyle({ borderColor: Colors.accent });

      await act(() => jest.advanceTimersByTime(2400));
      expect(screen.getByTestId('sentence-s3')).toHaveStyle({ borderColor: Colors.surface });
    });

    it('용어 사전의 문장 보기는 필터에 가려진 문장이면 필터를 풀고 이동한다', async () => {
      await renderView();

      await fireEvent.press(screen.getByRole('button', { name: '주호소 1개' }));
      expect(screen.queryByTestId('sentence-s2')).toBeNull();

      await fireEvent.press(screen.getByRole('button', { name: '용어 사전, 3개' }));
      await fireEvent.press(screen.getByRole('button', { name: 'HbA1c 용어가 나온 문장 보기' }));
      await act(() => jest.advanceTimersByTime(300));

      expect(screen.getByTestId('sentence-s2')).toBeTruthy();
      expect(scrollToIndex).toHaveBeenCalledWith(expect.objectContaining({ index: 4 }));
    });
  });

  it('문장이 없으면 빈 상태를 보여준다', async () => {
    await renderView({ sentences: [] });

    expect(screen.getByText('해설할 원문 문장이 없어요')).toBeTruthy();
    expect(screen.getByText('테스트 고지 문구')).toBeTruthy();
  });
});

describe('ExplanationHeaderActions', () => {
  beforeEach(() => {
    useSettings.setState({ explanationLayout: 'side', largeText: false });
  });

  it('보기 방식과 글자 크기 설정을 바꾼다', async () => {
    await render(<ExplanationHeaderActions />);

    await fireEvent.press(screen.getByRole('button', { name: '위아래로 보기' }));
    expect(useSettings.getState().explanationLayout).toBe('stack');
    expect(screen.getByRole('button', { name: '나란히 보기' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('switch', { name: '글자 크게' }));
    expect(useSettings.getState().largeText).toBe(true);
  });
});

describe('ReadingGuide', () => {
  it('화면이 좁아 위아래로 바꿔 보여 주는 중이면 그 이유와 나란히 보는 방법을 알려 준다', async () => {
    await render(<ReadingGuide layout="stack" autoStacked sentenceCount={3} termCount={1} cautionCount={0} />);
    expect(screen.getByText('위는 진료기록 원문, 아래는 쉽게 풀어 쓴 해설이에요.')).toBeTruthy();
    expect(screen.getByText(/화면이 좁아 원문과 해설을 위아래로 보여 드려요/)).toBeTruthy();
    expect(screen.queryByText(/오른쪽 위 버튼으로 보는 방식/)).toBeNull();
  });
});
