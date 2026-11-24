import {
  INITIAL_UPLOAD_FORM,
  autoTitle,
  daysAgoString,
  formatDateInput,
  hasErrors,
  recentHospitals,
  toUploadInput,
  validateUploadForm,
  validateVisitDate,
} from '../upload-form';

const TODAY = '2026-11-24';

describe('formatDateInput', () => {
  it.each([
    ['', ''],
    ['2026', '2026'],
    ['20261', '2026-1'],
    ['202611', '2026-11'],
    ['2026112', '2026-11-2'],
    ['20261124', '2026-11-24'],
    ['2026-11-24', '2026-11-24'],
    ['2026.11.24', '2026-11-24'],
    ['202611245', '2026-11-24'],
    ['abc', ''],
  ])('%s → %s', (input, expected) => {
    expect(formatDateInput(input)).toBe(expected);
  });

  it('하이픈 바로 앞 숫자를 지우면 하이픈도 사라진다', () => {
    // '2026-11' 에서 백스페이스 → '2026-1'
    expect(formatDateInput('2026-1')).toBe('2026-1');
    // '2026-' 처럼 하이픈만 남는 경우는 없다
    expect(formatDateInput('2026-')).toBe('2026');
  });
});

describe('daysAgoString', () => {
  it('로컬 날짜 기준으로 n일 전을 돌려준다 (월 경계 포함)', () => {
    const base = new Date(2026, 2, 1, 9, 0); // 2026-03-01
    expect(daysAgoString(0, base)).toBe('2026-03-01');
    expect(daysAgoString(1, base)).toBe('2026-02-28');
  });
});

describe('validateVisitDate', () => {
  it('비어 있으면 입력 안내', () => {
    expect(validateVisitDate('', TODAY)).toBe('진료일을 입력해 주세요.');
  });

  it('형식이 틀리거나 없는 날짜면 예시와 함께 안내', () => {
    expect(validateVisitDate('2026-11', TODAY)).toContain('정확히 입력');
    expect(validateVisitDate('2026-02-30', TODAY)).toContain(`예: ${TODAY}`);
  });

  it('미래 날짜는 입력할 수 없다', () => {
    expect(validateVisitDate('2026-11-25', TODAY)).toBe('오늘 이후의 날짜는 입력할 수 없어요.');
  });

  it('너무 오래된 날짜는 다시 확인하도록 한다', () => {
    expect(validateVisitDate('1899-12-31', TODAY)).toBe('날짜를 다시 확인해 주세요.');
  });

  it('오늘·과거 날짜는 통과', () => {
    expect(validateVisitDate(TODAY, TODAY)).toBeUndefined();
    expect(validateVisitDate('2024-02-29', TODAY)).toBeUndefined();
  });
});

describe('validateUploadForm', () => {
  it('병원 이름과 진료일은 필수', () => {
    const errors = validateUploadForm(INITIAL_UPLOAD_FORM, TODAY);
    expect(errors.hospitalName).toBe('병원 이름을 입력해 주세요.');
    expect(errors.visitDate).toBe('진료일을 입력해 주세요.');
    expect(hasErrors(errors)).toBe(true);
  });

  it('공백만 입력한 병원 이름은 비어 있는 것으로 본다', () => {
    const errors = validateUploadForm({ ...INITIAL_UPLOAD_FORM, hospitalName: '   ', visitDate: TODAY }, TODAY);
    expect(errors).toEqual({ hospitalName: '병원 이름을 입력해 주세요.' });
  });

  it('필수 항목을 채우면 오류가 없다 (진료과·제목은 선택)', () => {
    const errors = validateUploadForm({ ...INITIAL_UPLOAD_FORM, hospitalName: '서울내과', visitDate: TODAY }, TODAY);
    expect(hasErrors(errors)).toBe(false);
  });
});

describe('autoTitle', () => {
  it('서버 자동 제목과 같은 `병원명 · 문서종류` 형식', () => {
    expect(autoTitle({ hospitalName: ' 서울내과 ', documentType: 'lab_result' })).toBe('서울내과 · 검사 결과지');
    expect(autoTitle({ hospitalName: '', documentType: 'medical_record' })).toBe('병원 이름 · 진료기록');
  });
});

describe('toUploadInput', () => {
  const files = [{ uri: 'file:///a.jpg', name: 'a.jpg', mimeType: 'image/jpeg' }];

  it('앞뒤 공백을 지우고, 비어 있는 선택 항목은 보내지 않는다', () => {
    const input = toUploadInput(
      { documentType: 'prescription', hospitalName: ' 서울내과 ', department: ' ', visitDate: TODAY, title: '' },
      files,
      'camera',
    );
    expect(input).toEqual({
      files,
      source: 'camera',
      documentType: 'prescription',
      hospitalName: '서울내과',
      visitDate: TODAY,
    });
  });

  it('진료과·제목을 입력하면 함께 보낸다', () => {
    const input = toUploadInput(
      { ...INITIAL_UPLOAD_FORM, hospitalName: '서울내과', department: '내과', visitDate: TODAY, title: ' 정기 검진 ' },
      files,
      'gallery',
    );
    expect(input.department).toBe('내과');
    expect(input.title).toBe('정기 검진');
  });
});

describe('recentHospitals', () => {
  const doc = (hospitalName: string, visitDate: string, department?: string) => ({ hospitalName, visitDate, department });

  it('진료일 최신순으로 병원을 한 번씩만, 그 병원의 최근 진료과와 함께 돌려준다', () => {
    expect(
      recentHospitals([
        doc('바른숲내과의원', '2025-11-20', '내과'),
        doc('새빛종합병원', '2026-10-13', '내분비내과'),
        doc('바른숲내과의원', '2026-11-18'),
        doc('  ', '2026-11-19'),
        doc('한결가정의학과의원', '2026-06-16', '가정의학과'),
      ]),
    ).toEqual([
      { hospitalName: '바른숲내과의원', department: undefined },
      { hospitalName: '새빛종합병원', department: '내분비내과' },
      { hospitalName: '한결가정의학과의원', department: '가정의학과' },
    ]);
  });

  it('개수 제한을 지킨다', () => {
    const docs = ['가', '나', '다', '라', '마'].map((n, i) => doc(`${n}의원`, `2026-01-0${i + 1}`));
    expect(recentHospitals(docs, 2).map((h) => h.hospitalName)).toEqual(['마의원', '라의원']);
  });
});
