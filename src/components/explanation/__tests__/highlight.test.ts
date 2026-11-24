import { escapeRegExp, normalizeTermKey, splitByTerms, type HighlightSegment } from '../highlight';

/** 강조된 조각만 [표시 텍스트, 용어 인덱스] 로 추린다 */
function highlighted(segments: HighlightSegment[]): [string, number][] {
  return segments
    .filter((s): s is HighlightSegment & { termIndex: number } => s.termIndex !== null)
    .map((s) => [s.text, s.termIndex]);
}

function joined(segments: HighlightSegment[]): string {
  return segments.map((s) => s.text).join('');
}

describe('splitByTerms', () => {
  it('빈 원문이면 빈 배열을 돌려준다', () => {
    expect(splitByTerms('', ['DM'])).toEqual([]);
  });

  it('용어가 없으면 원문 전체를 일반 조각 하나로 돌려준다', () => {
    expect(splitByTerms('특이 소견 없음', [])).toEqual([{ text: '특이 소견 없음', termIndex: null, start: 0 }]);
  });

  it('용어 앞뒤를 일반 조각으로 나누고 시작 위치를 기록한다', () => {
    expect(splitByTerms('Pt. c/o polyuria x 2wks', ['polyuria'])).toEqual([
      { text: 'Pt. c/o ', termIndex: null, start: 0 },
      { text: 'polyuria', termIndex: 0, start: 8 },
      { text: ' x 2wks', termIndex: null, start: 16 },
    ]);
  });

  it('대소문자를 구분하지 않고, 화면에는 원문 표기를 그대로 쓴다', () => {
    const segments = splitByTerms('HBA1C 7.4%, hba1c 목표 미달', ['HbA1c']);
    expect(highlighted(segments)).toEqual([
      ['HBA1C', 0],
      ['hba1c', 0],
    ]);
  });

  it('정규식 특수문자를 글자 그대로 취급한다', () => {
    const terms = ['C-reactive protein (CRP)', 'Na+', 'q.d.', '[K]', 'a|b', 'x*'];
    const text = 'C-reactive protein (CRP) 상승, Na+ 정상, Metformin q.d. 복용, [K] 4.1, a|b, x* 표기';
    const segments = splitByTerms(text, terms);
    expect(highlighted(segments).map(([t]) => t)).toEqual(['C-reactive protein (CRP)', 'Na+', 'q.d.', '[K]', 'a|b', 'x*']);
    expect(joined(segments)).toBe(text);
  });

  it('특수문자가 와일드카드로 동작하지 않는다', () => {
    expect(highlighted(splitByTerms('qxdx 1T', ['q.d.']))).toEqual([]);
    expect(highlighted(splitByTerms('aaa', ['a+']))).toEqual([]);
  });

  it('용어 안의 공백은 원문의 여러 공백·줄바꿈과도 일치한다', () => {
    expect(highlighted(splitByTerms('Type 2   DM, uncontrolled', ['Type 2 DM']))).toEqual([['Type 2   DM', 0]]);
    expect(highlighted(splitByTerms('Type 2\nDM', ['Type 2 DM']))).toEqual([['Type 2\nDM', 0]]);
  });

  it('같은 위치에서 시작하면 더 긴 용어를 고른다', () => {
    const segments = splitByTerms('Type 2 DM, DM 합병증 없음', ['DM', 'Type 2 DM']);
    expect(highlighted(segments)).toEqual([
      ['Type 2 DM', 1],
      ['DM', 0],
    ]);
  });

  it('겹치는 용어는 먼저 시작하는 것만 강조한다', () => {
    const segments = splitByTerms('diabetes mellitus type 2', ['mellitus type', 'diabetes mellitus']);
    expect(highlighted(segments)).toEqual([['diabetes mellitus', 1]]);
    expect(joined(segments)).toBe('diabetes mellitus type 2');
  });

  it('영문 약어가 다른 영문 단어의 일부이면 강조하지 않는다', () => {
    expect(highlighted(splitByTerms('ADM 기록', ['DM']))).toEqual([]);
    expect(highlighted(splitByTerms('Creatinine 1.1', ['Cr']))).toEqual([]);
  });

  it('영문 약어 뒤에 숫자·한글·기호가 붙으면 강조한다', () => {
    expect(highlighted(splitByTerms('BP130/80, (DM)이 있음', ['BP', 'DM']))).toEqual([
      ['BP', 0],
      ['DM', 1],
    ]);
  });

  it('경계 조건으로 버린 위치 바로 뒤의 일치도 찾는다', () => {
    expect(highlighted(splitByTerms('XDM DM', ['DM']))).toEqual([['DM', 0]]);
  });

  it('한글 용어는 조사가 붙어 있어도 강조한다', () => {
    expect(highlighted(splitByTerms('당뇨병이 의심되어 당뇨병 검사를 시행함', ['당뇨병']))).toEqual([
      ['당뇨병', 0],
      ['당뇨병', 0],
    ]);
  });

  it('대소문자·공백만 다른 중복 용어는 처음 인덱스를 쓴다', () => {
    expect(highlighted(splitByTerms('LDL-C 160', ['ldl-c', 'LDL-C ', 'LDL-C']))).toEqual([['LDL-C', 0]]);
  });

  it('비어 있거나 공백뿐인 용어는 무시한다', () => {
    expect(highlighted(splitByTerms('혈압 정상', ['', '   ', '혈압']))).toEqual([['혈압', 2]]);
  });

  it('조각을 이어 붙이면 항상 원문과 같다', () => {
    const text = 'A/P) Type 2 DM, poorly controlled → Metformin 500mg 1T bid pc, HbA1c f/u 3mo';
    const segments = splitByTerms(text, ['Type 2 DM', 'Metformin', 'bid', 'pc', 'HbA1c', 'f/u', 'A/P']);
    expect(joined(segments)).toBe(text);
    expect(highlighted(segments).map(([t]) => t)).toEqual(['A/P', 'Type 2 DM', 'Metformin', 'bid', 'pc', 'HbA1c', 'f/u']);
  });
});

describe('normalizeTermKey', () => {
  it('앞뒤 공백 제거, 연속 공백 축약, 소문자 변환', () => {
    expect(normalizeTermKey('  Type  2\tDM ')).toBe('type 2 dm');
  });
});

describe('escapeRegExp', () => {
  it('이스케이프한 문자열은 자기 자신과만 일치한다', () => {
    const raw = '(a+b)*[c]?{d}|e^f$g.h\\i/j';
    expect(new RegExp(`^${escapeRegExp(raw)}$`).test(raw)).toBe(true);
  });
});
