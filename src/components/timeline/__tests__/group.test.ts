import type { TimelineEvent, TimelineEventType } from '@/types/domain';

import {
  countTimelineEvents,
  filterTimelineEvents,
  formatTimelinePeriod,
  groupTimelineByMonth,
  sortTimelineEvents,
  summarizeTimeline,
} from '../group';

function event(
  id: string,
  date: string,
  type: TimelineEventType,
  overrides: Partial<TimelineEvent> = {},
): TimelineEvent {
  return {
    id,
    date,
    type,
    title: id,
    description: '',
    documentId: `doc-${date}`,
    hospitalName: '샘플내과의원',
    ...overrides,
  };
}

const events: TimelineEvent[] = [
  event('jan-rx', '2026-01-20', 'prescription'),
  event('mar-lab', '2026-03-12', 'lab'),
  event('mar-visit', '2026-03-12', 'visit'),
  event('nov-visit', '2025-11-02', 'visit', { hospitalName: '샘플대학병원' }),
  event('mar-early-dx', '2026-03-02', 'diagnosis'),
  event('jan-visit', '2026-01-20', 'visit'),
];

describe('타임라인 정렬', () => {
  it('최신 날짜 먼저, 같은 날짜는 진료 → 진단 → 검사 → 처방 순', () => {
    expect(sortTimelineEvents(events).map((e) => e.id)).toEqual([
      'mar-visit',
      'mar-lab',
      'mar-early-dx',
      'jan-visit',
      'jan-rx',
      'nov-visit',
    ]);
  });
});

describe('분류 필터', () => {
  it('전체는 모든 기록', () => {
    expect(filterTimelineEvents(events, 'all')).toHaveLength(events.length);
  });

  it('분류가 같은 기록만 남긴다', () => {
    expect(filterTimelineEvents(events, 'visit').map((e) => e.id)).toEqual([
      'mar-visit',
      'nov-visit',
      'jan-visit',
    ]);
  });

  it('분류별 개수를 센다', () => {
    expect(countTimelineEvents(events)).toEqual({
      all: 6,
      visit: 3,
      diagnosis: 1,
      lab: 1,
      prescription: 1,
    });
  });
});

describe('월별 묶음', () => {
  it('최신 월부터 묶고 월 제목을 붙인다', () => {
    const sections = groupTimelineByMonth(events);
    expect(sections.map((s) => s.key)).toEqual(['2026-03', '2026-01', '2025-11']);
    expect(sections.map((s) => s.title)).toEqual(['2026년 3월', '2026년 1월', '2025년 11월']);
    expect(sections[0].data.map((e) => e.id)).toEqual(['mar-visit', 'mar-lab', 'mar-early-dx']);
  });

  it('기록이 없으면 빈 배열', () => {
    expect(groupTimelineByMonth([])).toEqual([]);
  });
});

describe('요약', () => {
  it('서로 다른 기록 수·병원 수·기간을 계산한다', () => {
    expect(summarizeTimeline(events)).toEqual({
      recordCount: 4,
      hospitalCount: 2,
      firstDate: '2025-11-02',
      lastDate: '2026-03-12',
    });
  });

  it('기록이 없으면 0건', () => {
    expect(summarizeTimeline([])).toEqual({ recordCount: 0, hospitalCount: 0 });
  });

  it('기간 문구를 만든다', () => {
    expect(formatTimelinePeriod(summarizeTimeline(events))).toBe('2025.11 ~ 2026.03');
    expect(formatTimelinePeriod(summarizeTimeline([event('a', '2026-03-12', 'visit')]))).toBe('2026.03');
    expect(formatTimelinePeriod({ recordCount: 0, hospitalCount: 0 })).toBeNull();
  });
});
