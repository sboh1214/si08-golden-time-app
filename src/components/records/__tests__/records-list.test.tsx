import { fireEvent, render, screen } from '@testing-library/react-native';

import type { MedicalDocument } from '@/types/domain';

import { RecordsList } from '../records-list';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

function makeDocument(
  overrides: Partial<MedicalDocument> & Pick<MedicalDocument, 'id' | 'title'>,
): MedicalDocument {
  return {
    documentType: 'medical_record',
    hospitalName: '샘플내과의원',
    department: '내과',
    visitDate: '2026-03-12',
    source: 'camera',
    pageCount: 1,
    status: 'completed',
    progress: 100,
    summary: { diagnosisCount: 2, labCount: 12, abnormalLabCount: 3, medicationCount: 2 },
    createdAt: '2026-03-12T09:00:00.000Z',
    updatedAt: '2026-03-12T09:00:00.000Z',
    ...overrides,
  };
}

const documents = [
  makeDocument({ id: 'a', title: '정기 진료', visitDate: '2026-01-05' }),
  makeDocument({
    id: 'b',
    title: '혈액검사 결과',
    documentType: 'lab_result',
    hospitalName: '한빛대학병원',
    visitDate: '2026-03-20',
  }),
  makeDocument({
    id: 'c',
    title: '감기약 처방',
    documentType: 'prescription',
    status: 'explaining',
    progress: 60,
    summary: undefined,
  }),
];

async function renderList() {
  await render(<RecordsList documents={documents} refreshing={false} onRefresh={jest.fn()} />);
}

describe('RecordsList', () => {
  beforeEach(() => mockPush.mockClear());

  it('전체 개수·종류별 필터 칩·처리 진행률·정리 결과 요약을 보여준다', async () => {
    await renderList();
    expect(screen.getByText('기록 3건')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '전체 3개' })).toBeSelected();
    expect(screen.getByRole('button', { name: '검사 결과지 1개' })).toBeOnTheScreen();
    expect(screen.getByText('60%')).toBeOnTheScreen();
    expect(screen.getAllByText('(확인 필요 3개)')).toHaveLength(2);
  });

  it('검색어로 걸러내고, 결과가 없으면 조건 지우기를 안내한다', async () => {
    await renderList();
    await fireEvent.changeText(screen.getByLabelText('기록 검색'), '한빛');
    expect(screen.getByText('3건 중 1건')).toBeOnTheScreen();
    expect(screen.getByText('혈액검사 결과')).toBeOnTheScreen();
    expect(screen.queryByText('정기 진료')).not.toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('기록 검색'), '없는병원');
    expect(screen.getByText('조건에 맞는 기록이 없어요')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: '검색 조건 지우기' }));
    expect(screen.getByText('기록 3건')).toBeOnTheScreen();
  });

  it('문서 종류 칩으로 거른다', async () => {
    await renderList();
    await fireEvent.press(screen.getByRole('button', { name: '처방전 1개' }));
    expect(screen.getByText('감기약 처방')).toBeOnTheScreen();
    expect(screen.queryByText('혈액검사 결과')).not.toBeOnTheScreen();
  });

  it('정렬을 오래된순으로 바꿀 수 있다', async () => {
    await renderList();
    await fireEvent.press(screen.getByRole('button', { name: '정렬: 진료일 최신순' }));
    expect(screen.getByRole('button', { name: '정렬: 진료일 오래된순' })).toBeOnTheScreen();
  });

  it('카드를 누르면 문서 상세로 이동한다', async () => {
    await renderList();
    await fireEvent.press(screen.getByText('혈액검사 결과'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/documents/[id]', params: { id: 'b' } });
  });
});
