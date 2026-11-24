/**
 * 날짜·숫자 포맷 유틸 단위 테스트.
 * 'YYYY-MM-DD' 는 로컬 자정으로 해석되므로 기대값도 로컬 Date 로 만든다 (실행 환경 시간대와 무관).
 */
import {
  formatBytes,
  formatDate,
  formatDateLong,
  formatMonthDay,
  formatNumber,
  formatRelative,
  formatShortDate,
  formatYearMonth,
  formatYearMonthDot,
  isValidDateString,
  parseDate,
  toDateString,
  todayString,
} from '../format';

describe('parseDate', () => {
  it("'YYYY-MM-DD' 는 로컬 자정으로 해석한다 (UTC 변환으로 하루 밀리지 않음)", () => {
    const d = parseDate('2026-03-12');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([
      2026, 2, 12, 0, 0,
    ]);
  });

  it('ISO 시각 문자열은 그대로 해석한다', () => {
    const iso = '2026-03-12T05:30:00.000Z';
    expect(parseDate(iso).getTime()).toBe(Date.parse(iso));
  });

  it('잘못된 값은 Invalid Date', () => {
    expect(Number.isNaN(parseDate('not-a-date').getTime())).toBe(true);
  });
});

describe('toDateString / todayString', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('로컬 날짜를 0 채움한 YYYY-MM-DD 로 만든다', () => {
    expect(toDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toDateString(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('parseDate 와 왕복 변환된다', () => {
    expect(toDateString(parseDate('2026-11-24'))).toBe('2026-11-24');
  });

  it('todayString 은 오늘 로컬 날짜', () => {
    jest.useFakeTimers({ now: new Date(2026, 10, 24, 9, 30) });
    expect(todayString()).toBe('2026-11-24');
  });
});

describe('날짜 표시 형식', () => {
  it('formatDate → 2026.03.12', () => {
    expect(formatDate('2026-03-12')).toBe('2026.03.12');
    expect(formatDate('2026-11-05')).toBe('2026.11.05');
  });

  it('formatDateLong → 요일까지 표시', () => {
    expect(formatDateLong('2026-03-12')).toBe('2026년 3월 12일 (목)');
    expect(formatDateLong('2026-11-22')).toBe('2026년 11월 22일 (일)');
    expect(formatDateLong('2026-11-28')).toBe('2026년 11월 28일 (토)');
  });

  it('formatMonthDay → 3월 12일', () => {
    expect(formatMonthDay('2026-03-12')).toBe('3월 12일');
  });

  it('formatYearMonthDot → 2026.01 (타임라인 기간)', () => {
    expect(formatYearMonthDot('2026-01-05')).toBe('2026.01');
  });

  it('formatYearMonth → 2026년 3월', () => {
    expect(formatYearMonth('2026-03-12')).toBe('2026년 3월');
  });

  it('formatShortDate → 26.03 (차트 축)', () => {
    expect(formatShortDate('2026-03-12')).toBe('26.03');
    expect(formatShortDate('2030-12-01')).toBe('30.12');
  });

  it.each([formatDate, formatDateLong, formatMonthDay, formatYearMonth, formatYearMonthDot, formatShortDate])(
    '해석할 수 없는 값은 원문을 그대로 돌려준다 (%#)',
    (formatter) => {
      expect(formatter('알 수 없음')).toBe('알 수 없음');
    },
  );
});

describe('formatRelative', () => {
  const now = new Date(2026, 10, 24, 12, 0, 0);
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString();

  it.each([
    [0, '방금 전'],
    [59, '방금 전'],
    [60, '1분 전'],
    [5 * 60, '5분 전'],
    [59 * 60 + 59, '59분 전'],
    [3600, '1시간 전'],
    [23 * 3600, '23시간 전'],
    [86400, '1일 전'],
    [6 * 86400 + 86399, '6일 전'],
  ])('%i초 전 → %s', (seconds, expected) => {
    expect(formatRelative(ago(seconds), now)).toBe(expected);
  });

  it('7일 이상 지나면 날짜로 표시한다', () => {
    expect(formatRelative(new Date(2026, 10, 10, 12).toISOString(), now)).toBe('2026.11.10');
  });

  it('미래 시각(기기 시계 오차)은 방금 전으로 표시한다', () => {
    expect(formatRelative(new Date(now.getTime() + 30_000).toISOString(), now)).toBe('방금 전');
  });

  it('해석할 수 없는 값은 원문을 돌려준다', () => {
    expect(formatRelative('invalid', now)).toBe('invalid');
  });
});

describe('isValidDateString', () => {
  it.each([
    ['2026-11-24', true],
    ['2026-02-28', true],
    ['2024-02-29', true],
    ['2026-02-29', false],
    ['2026-04-31', false],
    ['2026-13-01', false],
    ['2026-00-10', false],
    ['2026-1-01', false],
    ['20261124', false],
    ['2026/11/24', false],
    ['', false],
  ])('%p → %p', (value, expected) => {
    expect(isValidDateString(value)).toBe(expected);
  });
});

describe('formatBytes', () => {
  it.each([
    [undefined, ''],
    [Number.NaN, ''],
    [Number.POSITIVE_INFINITY, ''],
    [0, '0B'],
    [1023, '1023B'],
    [1024, '1KB'],
    [300 * 1024, '300KB'],
    [1024 * 1024, '1.0MB'],
    [2.5 * 1024 * 1024, '2.5MB'],
    [20 * 1024 * 1024, '20.0MB'],
  ])('%p → %p', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});

describe('formatNumber', () => {
  it.each([
    [7, '7'],
    [0, '0'],
    [7.4, '7.4'],
    [7.456, '7.46'],
    [0.1 + 0.2, '0.3'],
    [-1.234, '-1.23'],
    [126.0, '126'],
  ])('%p → %p', (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });
});
