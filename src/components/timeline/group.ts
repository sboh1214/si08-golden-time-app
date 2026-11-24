/**
 * 건강 타임라인 순수 함수 — 분류 필터, 월별 묶음, 요약 계산.
 * 화면과 분리해 단위 테스트한다 (`__tests__/group.test.ts`).
 */
import { formatYearMonth, formatYearMonthDot } from '@/lib/format';
import { TIMELINE_EVENT_LABEL } from '@/lib/labels';
import type { TimelineEvent, TimelineEventType } from '@/types/domain';

export type TimelineFilterKey = 'all' | TimelineEventType;

/** 같은 날짜 안에서의 표시 순서: 진료 → 진단 → 검사 → 처방 */
const TYPE_ORDER: Record<TimelineEventType, number> = {
  visit: 0,
  diagnosis: 1,
  lab: 2,
  prescription: 3,
};

export const TIMELINE_FILTERS: readonly { key: TimelineFilterKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'visit', label: TIMELINE_EVENT_LABEL.visit },
  { key: 'diagnosis', label: TIMELINE_EVENT_LABEL.diagnosis },
  { key: 'lab', label: TIMELINE_EVENT_LABEL.lab },
  { key: 'prescription', label: TIMELINE_EVENT_LABEL.prescription },
];

export interface TimelineSection {
  /** 'YYYY-MM' */
  key: string;
  /** '2026년 3월' */
  title: string;
  data: TimelineEvent[];
}

export interface TimelineSummary {
  /** 서로 다른 진료기록(문서) 수 */
  recordCount: number;
  /** 서로 다른 병원 수 */
  hospitalCount: number;
  /** 가장 이른 날짜 'YYYY-MM-DD' */
  firstDate?: string;
  /** 가장 최근 날짜 'YYYY-MM-DD' */
  lastDate?: string;
}

/** 최신 날짜 먼저, 같은 날짜는 진료 → 진단 → 검사 → 처방 순 */
export function sortTimelineEvents(events: readonly TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
  });
}

export function filterTimelineEvents(
  events: readonly TimelineEvent[],
  key: TimelineFilterKey,
): TimelineEvent[] {
  return key === 'all' ? [...events] : events.filter((e) => e.type === key);
}

/** 분류별 개수 (필터 칩 라벨용) */
export function countTimelineEvents(events: readonly TimelineEvent[]): Record<TimelineFilterKey, number> {
  const counts: Record<TimelineFilterKey, number> = {
    all: events.length,
    visit: 0,
    diagnosis: 0,
    lab: 0,
    prescription: 0,
  };
  for (const event of events) counts[event.type] += 1;
  return counts;
}

/** 'YYYY-MM-DD' → 'YYYY-MM' (형식이 다르면 원문 그대로) */
function monthKey(date: string): string {
  return /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : date;
}

/** 월별로 묶는다 (최신 월 먼저, 월 안에서는 최신 날짜 먼저) */
export function groupTimelineByMonth(events: readonly TimelineEvent[]): TimelineSection[] {
  const sections: TimelineSection[] = [];
  for (const event of sortTimelineEvents(events)) {
    const key = monthKey(event.date);
    const last = sections[sections.length - 1];
    if (last && last.key === key) {
      last.data.push(event);
    } else {
      sections.push({ key, title: formatYearMonth(event.date), data: [event] });
    }
  }
  return sections;
}

export function summarizeTimeline(events: readonly TimelineEvent[]): TimelineSummary {
  if (events.length === 0) return { recordCount: 0, hospitalCount: 0 };
  const documents = new Set<string>();
  const hospitals = new Set<string>();
  let firstDate = events[0].date;
  let lastDate = events[0].date;
  for (const event of events) {
    documents.add(event.documentId);
    hospitals.add(event.hospitalName);
    if (event.date < firstDate) firstDate = event.date;
    if (event.date > lastDate) lastDate = event.date;
  }
  return { recordCount: documents.size, hospitalCount: hospitals.size, firstDate, lastDate };
}

/** 기간 문구 (예: '2025.01 ~ 2026.03', 같은 달이면 '2026.03') */
export function formatTimelinePeriod(summary: TimelineSummary): string | null {
  if (!summary.firstDate || !summary.lastDate) return null;
  const from = formatYearMonthDot(summary.firstDate);
  const to = formatYearMonthDot(summary.lastDate);
  return from === to ? from : `${from} ~ ${to}`;
}
