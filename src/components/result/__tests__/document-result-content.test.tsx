import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { DocumentAnalysis, MedicalDocument } from '@/types/domain';

import { DocumentResultContent } from '../document-result-content';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

// 추천 질문 카드는 별도 기능(질문 리스트)이므로 이 테스트에서는 자리만 확인한다
jest.mock('@/components/questions/suggested-questions-card', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SuggestedQuestionsCard: ({ documentId }: { documentId: string }) => <Text>{`추천 질문 ${documentId}`}</Text>,
  };
});

const document: MedicalDocument = {
  id: 'doc_1',
  title: '한빛내과의원 · 진료기록',
  documentType: 'medical_record',
  hospitalName: '한빛내과의원',
  department: '내과',
  visitDate: '2026-03-12',
  source: 'camera',
  pageCount: 2,
  status: 'completed',
  progress: 100,
  createdAt: '2026-03-12T09:00:00.000Z',
  updatedAt: '2026-03-12T09:00:00.000Z',
};

const analysis: DocumentAnalysis = {
  documentId: 'doc_1',
  generatedAt: '2026-03-12T09:01:00.000Z',
  modelVersion: 'test-model-1',
  overallSummary: '혈당 조절이 필요하다는 내용이에요.',
  diagnoses: [
    {
      id: 'dx_1',
      name: '제2형 당뇨병',
      originalTerm: 'Type 2 DM',
      code: 'E11.9',
      status: 'confirmed',
      plainExplanation: '혈당이 높아지는 병이에요.',
      sentenceIds: ['missing', 's2'],
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
      plainExplanation: '최근 2~3개월 평균 혈당이에요.',
      sentenceIds: [],
    },
  ],
  medications: [],
  sentences: [
    {
      id: 's2',
      order: 2,
      section: '진단',
      original: 'Type 2 DM',
      plain: '제2형 당뇨병이에요.',
      terms: [],
      confidence: 0.9,
      relatedItemIds: ['dx_1'],
    },
  ],
  suggestedQuestions: [],
  disclaimer: '테스트 고지 문구',
};

async function renderContent(data: DocumentAnalysis = analysis) {
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
  await render(<DocumentResultContent document={document} analysis={data} />, { wrapper });
}

describe('DocumentResultContent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('문서 정보·요약·항목·추천 질문·고지를 순서대로 보여준다', async () => {
    await renderContent();

    expect(screen.getByText('한빛내과의원 · 진료기록')).toBeTruthy();
    expect(screen.getByText('혈당 조절이 필요하다는 내용이에요.')).toBeTruthy();
    expect(screen.getByText('제2형 당뇨병')).toBeTruthy();
    expect(screen.getByText('당화혈색소')).toBeTruthy();
    expect(screen.getByText('이 기록에서 찾은 처방 약이 없어요.')).toBeTruthy();
    expect(screen.getByText('추천 질문 doc_1')).toBeTruthy();
    expect(screen.getByText('테스트 고지 문구')).toBeTruthy();
  });

  it('원문 보기는 해설에 실제로 있는 첫 근거 문장으로 이동한다', async () => {
    await renderContent();

    await fireEvent.press(screen.getByRole('link', { name: '제2형 당뇨병 원문 보기' }));
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/documents/[id]/explanation',
      params: { id: 'doc_1', sentenceId: 's2' },
    });
  });

  it('검사 항목도 근거 문장이 있으면 원문 보기로 해당 문장에 이동한다', async () => {
    await renderContent({
      ...analysis,
      labResults: analysis.labResults.map((lab) => ({ ...lab, sentenceIds: ['s2'] })),
    });

    await fireEvent.press(screen.getByRole('link', { name: '당화혈색소 원문 보기' }));
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/documents/[id]/explanation',
      params: { id: 'doc_1', sentenceId: 's2' },
    });
  });

  it('검사 항목을 누르면 검사 추이 화면으로, 전체 보기는 검사 수치 화면으로 이동한다', async () => {
    await renderContent();

    // 근거 문장이 없는 검사는 원문 보기 링크가 없다
    expect(screen.queryByRole('link', { name: '당화혈색소 원문 보기' })).toBeNull();

    await fireEvent.press(screen.getByTestId('lab-row-lab_1'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/labs/[code]', params: { code: 'HBA1C' } });

    await fireEvent.press(screen.getByRole('button', { name: '참고치 그래프로 자세히 보기' }));
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/documents/[id]/labs', params: { id: 'doc_1' } });
  });
});
