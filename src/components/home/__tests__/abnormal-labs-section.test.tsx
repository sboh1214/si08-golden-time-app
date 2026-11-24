import { fireEvent, render, screen } from '@testing-library/react-native';

import type { LabCatalogItem } from '@/types/domain';

import { AbnormalLabsSection } from '../abnormal-labs-section';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

function lab(overrides: Partial<LabCatalogItem> & Pick<LabCatalogItem, 'code' | 'name'>): LabCatalogItem {
  return {
    originalName: overrides.code,
    category: '당뇨',
    unit: 'mg/dL',
    latestValue: 100,
    latestFlag: 'high',
    latestMeasuredAt: '2026-03-12',
    count: 1,
    ...overrides,
  };
}

function query(data: LabCatalogItem[]) {
  return { data, error: null, isPending: false, isError: false, refetch: jest.fn() };
}

describe('AbnormalLabsSection', () => {
  beforeEach(() => mockPush.mockClear());

  it("다른 화면과 같은 규칙으로 값과 단위를 붙여 쓴다 ('%' 는 붙이고 나머지는 띄운다)", async () => {
    await render(
      <AbnormalLabsSection
        query={query([
          lab({ code: 'HBA1C', name: '당화혈색소', originalName: 'HbA1c', unit: '%', latestValue: 7.4 }),
          lab({ code: 'GLU', name: '공복혈당', latestValue: 132, latestFlag: 'critical_high' }),
          lab({ code: 'NORMAL', name: '정상 항목', latestFlag: 'normal' }),
        ])}
      />,
    );

    expect(screen.getByText('7.4%')).toBeOnTheScreen();
    expect(screen.getByText('132 mg/dL')).toBeOnTheScreen();
    expect(screen.queryByText('정상 항목')).toBeNull();

    const row = screen.getByRole('button', { name: /^당화혈색소, 7\.4%, 높음/ });
    await fireEvent.press(row);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/labs/[code]', params: { code: 'HBA1C' } });
  });
});

describe('SectionQueryState (홈 섹션 상태)', () => {
  const items = [lab({ code: 'GLU', name: '공복혈당', latestValue: 132 })];

  it('이미 받은 데이터가 있으면 재조회가 실패해도 내용을 유지하고 작은 안내만 띄운다', async () => {
    await render(
      <AbnormalLabsSection query={{ ...query(items), isError: true, error: new Error('offline') }} />,
    );

    expect(screen.getByText('공복혈당')).toBeOnTheScreen();
    expect(screen.getByTestId('refresh-error-banner')).toBeOnTheScreen();
    expect(screen.queryByTestId('section-error')).toBeNull();
  });

  it('보여 줄 데이터가 없을 때만 섹션 오류와 다시 시도를 보여 준다', async () => {
    const refetch = jest.fn();
    await render(
      <AbnormalLabsSection
        query={{ data: undefined, error: new Error('offline'), isPending: false, isError: true, refetch }}
      />,
    );

    expect(screen.getByTestId('section-error')).toBeOnTheScreen();
    expect(screen.queryByTestId('refresh-error-banner')).toBeNull();
    await fireEvent.press(screen.getByText('다시 시도'));
    expect(refetch).toHaveBeenCalled();
  });
});
