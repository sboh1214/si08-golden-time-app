import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Diagnosis, LabFlag, LabResult, MedicalDocument, Medication } from '@/types/domain';

import { CountTiles } from '../count-tiles';
import { DiagnosisCard, sortDiagnoses } from '../diagnosis-card';
import { DocumentHeader } from '../document-header';
import { LabSummaryList, sortLabsBySeverity } from '../lab-summary-list';
import { MedicationCard } from '../medication-card';
import { SummaryCard } from '../summary-card';

function diagnosis(overrides: Partial<Diagnosis> = {}): Diagnosis {
  return {
    id: 'dx_1',
    name: '제2형 당뇨병',
    originalTerm: 'Type 2 DM, uncontrolled',
    code: 'E11.9',
    status: 'confirmed',
    plainExplanation: '몸이 인슐린을 잘 쓰지 못해 혈당이 높아지는 병이에요.',
    sentenceIds: ['s1'],
    ...overrides,
  };
}

function lab(id: string, flag: LabFlag, overrides: Partial<LabResult> = {}): LabResult {
  return {
    id,
    code: `CODE_${id}`,
    name: `검사 ${id}`,
    originalName: `Lab ${id}`,
    category: '혈액',
    value: 5,
    unit: 'mg/dL',
    referenceRange: { low: 1, high: 10, text: '1-10' },
    flag,
    measuredAt: '2026-03-12',
    plainExplanation: '',
    sentenceIds: [],
    ...overrides,
  };
}

const medication: Medication = {
  id: 'med_1',
  name: '다이아벡스정 500mg',
  ingredient: '메트포르민',
  originalText: 'Metformin 500mg 1T bid pc',
  dose: '1정',
  frequency: '하루 2번, 아침·저녁 식사 직후',
  durationDays: 30,
  purpose: '혈당을 낮춰 주는 약이에요',
  cautions: ['술을 많이 마시면 부작용 위험이 커져요.', '조영제 검사 전에는 의료진에게 알려 주세요.'],
  sentenceIds: ['s3'],
};

describe('sortDiagnoses', () => {
  it('확진 → 의심 → 과거력 → 배제 순으로 정렬하고 같은 상태는 원래 순서를 유지한다', () => {
    const sorted = sortDiagnoses([
      diagnosis({ id: 'a', status: 'ruled_out' }),
      diagnosis({ id: 'b', status: 'suspected' }),
      diagnosis({ id: 'c', status: 'history' }),
      diagnosis({ id: 'd', status: 'confirmed' }),
      diagnosis({ id: 'e', status: 'suspected' }),
    ]);
    expect(sorted.map((d) => d.id)).toEqual(['d', 'b', 'e', 'c', 'a']);
  });
});

describe('sortLabsBySeverity', () => {
  it('참고치를 크게 벗어난 항목부터 보여주고 정상 항목은 뒤로 보낸다', () => {
    const sorted = sortLabsBySeverity([
      lab('n1', 'normal'),
      lab('h1', 'high'),
      lab('c1', 'critical_high'),
      lab('l1', 'low'),
      lab('n2', 'normal'),
    ]);
    expect(sorted.map((l) => l.id)).toEqual(['c1', 'h1', 'l1', 'n1', 'n2']);
  });
});

describe('DiagnosisCard', () => {
  it('진단명·상태·질병코드·원문 표기를 보여주고 원문 보기를 누르면 콜백을 호출한다', async () => {
    const onViewSource = jest.fn();
    await render(<DiagnosisCard diagnosis={diagnosis({ status: 'suspected' })} onViewSource={onViewSource} />);

    expect(screen.getByText('제2형 당뇨병')).toBeTruthy();
    expect(screen.getByText('의심')).toBeTruthy();
    expect(screen.getByText('KCD E11.9')).toBeTruthy();
    expect(screen.getByText('Type 2 DM, uncontrolled')).toBeTruthy();

    await fireEvent.press(screen.getByRole('link', { name: '제2형 당뇨병 원문 보기' }));
    expect(onViewSource).toHaveBeenCalledTimes(1);
  });

  it('근거 문장이 없으면 원문 보기 링크를 숨긴다', async () => {
    await render(<DiagnosisCard diagnosis={diagnosis({ code: undefined })} />);
    expect(screen.queryByText('원문 보기')).toBeNull();
    expect(screen.queryByText(/KCD/)).toBeNull();
  });
});

describe('LabSummaryList', () => {
  it('최대 6개만 보여주고 전체 개수를 버튼에 표시한다', async () => {
    const labs = Array.from({ length: 8 }, (_, i) => lab(`x${i}`, i === 5 ? 'high' : 'normal'));
    const onPressLab = jest.fn();
    const onShowAll = jest.fn();
    await render(<LabSummaryList labs={labs} onPressLab={onPressLab} onShowAll={onShowAll} />);

    // 확인이 필요한 항목이 맨 위로 온다
    const rows = screen.getAllByTestId(/^lab-row-/);
    expect(rows).toHaveLength(6);
    expect(rows[0].props.testID).toBe('lab-row-x5');

    await fireEvent.press(rows[0]);
    expect(onPressLab).toHaveBeenCalledWith(expect.objectContaining({ id: 'x5' }));

    await fireEvent.press(screen.getByRole('button', { name: '검사 수치 전체 보기 (8)' }));
    expect(onShowAll).toHaveBeenCalledTimes(1);
  });

  it('항목이 적으면 그래프 화면 안내 버튼을 보여준다', async () => {
    await render(<LabSummaryList labs={[lab('a', 'normal')]} onPressLab={jest.fn()} onShowAll={jest.fn()} />);
    expect(screen.getByRole('button', { name: '참고치 그래프로 자세히 보기' })).toBeTruthy();
  });

  it('수치와 단위는 화면과 스크린리더 모두 같은 띄어쓰기 규칙을 따른다 (7.4%, 132 mg/dL)', async () => {
    const labs = [
      lab('pct', 'high', {
        name: '당화혈색소',
        value: 7.4,
        unit: '%',
        referenceRange: { low: 4, high: 5.6, text: '' },
      }),
      lab('mg', 'high', { name: '공복 혈당', value: 132, unit: 'mg/dL', referenceRange: { high: 100, text: '<100' } }),
      lab('none', 'normal', { name: '요비중', value: 1.02, unit: '' }),
    ];
    await render(<LabSummaryList labs={labs} onPressLab={jest.fn()} onShowAll={jest.fn()} />);

    expect(screen.getByLabelText('당화혈색소, 7.4%, 높음, 참고치 4 ~ 5.6%')).toBeTruthy();
    expect(screen.getByLabelText('공복 혈당, 132 mg/dL, 높음, 참고치 100 mg/dL 미만')).toBeTruthy();
    expect(screen.getByLabelText(/^요비중, 1\.02, 정상/)).toBeTruthy();
    // 보이는 글자: 숫자 + (작은 글씨) 단위
    expect(screen.getByText('7.4%')).toBeTruthy();
    expect(screen.getByText('132 mg/dL')).toBeTruthy();
    expect(screen.getByText('1.02')).toBeTruthy();
  });

  it('근거 문장이 있는 검사에만 원문 보기 링크를 보여준다', async () => {
    const onViewSource = jest.fn();
    const labs = [lab('a', 'high', { name: '당화혈색소' }), lab('b', 'normal', { name: '공복 혈당' })];
    await render(
      <LabSummaryList
        labs={labs}
        onPressLab={jest.fn()}
        onShowAll={jest.fn()}
        getViewSource={(item) => (item.id === 'a' ? onViewSource : undefined)}
      />,
    );

    await fireEvent.press(screen.getByRole('link', { name: '당화혈색소 원문 보기' }));
    expect(onViewSource).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('link', { name: '공복 혈당 원문 보기' })).toBeNull();
  });
});

describe('MedicationCard', () => {
  it('복용량·복용 방법·처방 기간·주의사항을 보여준다', async () => {
    await render(<MedicationCard medication={medication} />);

    expect(screen.getByText('다이아벡스정 500mg')).toBeTruthy();
    expect(screen.getByText('성분 메트포르민')).toBeTruthy();
    expect(screen.getByText('30일분')).toBeTruthy();
    expect(screen.getByText('복용할 때 주의하세요')).toBeTruthy();
    expect(screen.getByText('술을 많이 마시면 부작용 위험이 커져요.')).toBeTruthy();
    expect(screen.getByText('Metformin 500mg 1T bid pc')).toBeTruthy();
  });

  it('주의사항과 처방 기간이 없으면 해당 영역을 숨긴다', async () => {
    await render(<MedicationCard medication={{ ...medication, cautions: [], durationDays: undefined }} />);
    expect(screen.queryByText('복용할 때 주의하세요')).toBeNull();
    expect(screen.queryByText('처방 기간')).toBeNull();
  });
});

describe('CountTiles', () => {
  it('확인이 필요한 검사 개수를 함께 읽어 준다', async () => {
    await render(<CountTiles diagnosisCount={2} labCount={8} abnormalLabCount={3} medicationCount={1} />);
    expect(screen.getByLabelText('검사 8개, 확인이 필요한 항목 3개')).toBeTruthy();
    expect(screen.getByText('확인 필요 3개')).toBeTruthy();
  });
});

describe('SummaryCard', () => {
  it('내부 해설 모델 식별자는 환자에게 보여주지 않는다', async () => {
    await render(<SummaryCard analysis={{ overallSummary: '요약이에요.', generatedAt: new Date().toISOString() }} />);
    expect(screen.getByText('방금 전 생성')).toBeTruthy();
    expect(screen.queryByText(/모델/)).toBeNull();
  });
});

describe('DocumentHeader', () => {
  const document: MedicalDocument = {
    id: 'doc_1',
    title: '한빛내과의원 · 진료기록',
    documentType: 'medical_record',
    hospitalName: '한빛내과의원',
    department: '내과',
    visitDate: '2026-03-12',
    source: 'camera',
    pageCount: 1,
    thumbnailUri: 'blob:http://localhost/expired',
    status: 'completed',
    progress: 100,
    createdAt: '2026-03-12T09:00:00.000Z',
    updatedAt: '2026-03-12T09:00:00.000Z',
  };

  it('미리보기 이미지를 불러오지 못하면 빈 상자 대신 미리보기를 숨기고, 주소가 바뀌면 다시 시도한다', async () => {
    await render(<DocumentHeader document={document} />);

    await fireEvent(screen.getByLabelText('등록한 진료기록 첫 페이지 미리보기'), 'error', {
      nativeEvent: { error: 'not found' },
    });
    expect(screen.queryByLabelText('등록한 진료기록 첫 페이지 미리보기')).toBeNull();
    expect(screen.getByText('한빛내과의원 · 진료기록')).toBeTruthy();

    await screen.rerender(<DocumentHeader document={{ ...document, thumbnailUri: 'file:///documents/doc_1.jpg' }} />);
    expect(screen.getByLabelText('등록한 진료기록 첫 페이지 미리보기')).toBeTruthy();
  });
});
