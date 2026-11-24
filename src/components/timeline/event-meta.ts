/**
 * 타임라인 이벤트 표시 규칙 — 분류별 색·아이콘, 눌렀을 때 이동할 화면.
 */
import type { Href } from 'expo-router';

import { LAB_FLAG_TONE } from '@/components/domain/lab-flag-badge';
import type { BadgeTone } from '@/components/ui/badge';
import type { IconName } from '@/components/ui/icon';
import { Colors } from '@/constants/theme';
import { TIMELINE_EVENT_ICON } from '@/lib/icons';
import { DOCUMENT_SECTION_LABEL } from '@/lib/labels';
import { flagColor } from '@/lib/labs';
import type { TimelineEvent } from '@/types/domain';

export interface TimelineEventStyle {
  icon: IconName;
  /** 분류 배지 색 */
  tone: BadgeTone;
  /** 레일 점 테두리·아이콘 색 */
  color: string;
  /** 레일 점 배경색 */
  softColor: string;
}

/** 진료=주색, 진단=주의(주황), 검사=판정 색, 처방=정보(파랑) */
export function getTimelineEventStyle(event: Pick<TimelineEvent, 'type' | 'flag'>): TimelineEventStyle {
  const icon = TIMELINE_EVENT_ICON[event.type];
  switch (event.type) {
    case 'visit':
      return { icon, tone: 'primary', color: Colors.primary, softColor: Colors.primarySoft };
    case 'diagnosis':
      return { icon, tone: 'caution', color: Colors.caution, softColor: Colors.cautionSoft };
    case 'lab': {
      const flag = event.flag ?? 'normal';
      const { fg, bg } = flagColor(flag);
      // 계약에 없는 판정 값은 중립 배지 (flagColor 도 중립색을 돌려준다)
      return { icon, tone: LAB_FLAG_TONE[flag] ?? 'neutral', color: fg, softColor: bg };
    }
    case 'prescription':
      return { icon, tone: 'info', color: Colors.info, softColor: Colors.infoSoft };
  }
}

/**
 * 이벤트를 눌렀을 때 이동할 화면.
 * - 검사(특정 항목) → 항목별 수치 변화, 검사(여러 항목) → 해당 문서의 검사 수치
 * - 그 외 → 해당 문서의 정리 결과
 */
export function getTimelineEventHref(event: Pick<TimelineEvent, 'type' | 'labCode' | 'documentId'>): Href {
  if (event.type === 'lab') {
    if (event.labCode) return { pathname: '/labs/[code]', params: { code: event.labCode } };
    return { pathname: '/documents/[id]/labs', params: { id: event.documentId } };
  }
  return { pathname: '/documents/[id]', params: { id: event.documentId } };
}

/** 이동 안내 문구 (카드 오른쪽 위·스크린리더 힌트) */
export function getTimelineEventActionLabel(event: Pick<TimelineEvent, 'type' | 'labCode'>): string {
  if (event.type === 'lab') return event.labCode ? '수치 변화 보기' : `${DOCUMENT_SECTION_LABEL.labs} 보기`;
  return `${DOCUMENT_SECTION_LABEL.result} 보기`;
}
