import { fireEvent, render, screen } from '@testing-library/react-native';

import { ChoiceChips, type ChoiceOption } from '../choice-chips';

const OPTIONS: readonly ChoiceOption<'lab' | 'prescription'>[] = [
  { value: 'lab', label: '검사 결과지' },
  { value: 'prescription', label: '처방전' },
];

describe('ChoiceChips', () => {
  it('선택 상태와 함께 버튼으로 안내하고 누르면 값을 알린다', async () => {
    const onSelect = jest.fn();
    await render(<ChoiceChips options={OPTIONS} selected="lab" onSelect={onSelect} />);

    expect(screen.getByRole('button', { name: '검사 결과지', selected: true })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '처방전' }));
    expect(onSelect).toHaveBeenCalledWith('prescription');
  });

  it('잠긴 동안(업로드 중)에는 사용할 수 없는 버튼으로 안내하고 눌러도 값이 바뀌지 않는다', async () => {
    const onSelect = jest.fn();
    await render(<ChoiceChips options={OPTIONS} selected="lab" onSelect={onSelect} disabled />);
    expect(screen.getAllByRole('button', { disabled: true })).toHaveLength(2);
    expect(screen.getByRole('button', { name: '검사 결과지', selected: true, disabled: true })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '처방전' }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('숫자 값도 고를 수 있다 (설정 선택지)', async () => {
    const onSelect = jest.fn();
    const numeric: readonly ChoiceOption<number>[] = [
      { value: 0, label: '없음' },
      { value: 500, label: '0.5초' },
    ];
    await render(<ChoiceChips options={numeric} selected={0} onSelect={onSelect} testID="latency" />);
    await fireEvent.press(screen.getByTestId('latency-500'));
    expect(onSelect).toHaveBeenCalledWith(500);
  });
});
