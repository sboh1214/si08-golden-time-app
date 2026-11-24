import { Colors } from '@/constants/theme';

import { getTimelineEventActionLabel, getTimelineEventHref, getTimelineEventStyle } from '../event-meta';

describe('타임라인 이벤트 이동 경로', () => {
  it('특정 검사 항목이 있으면 항목별 수치 변화로', () => {
    expect(getTimelineEventHref({ type: 'lab', labCode: 'HBA1C', documentId: 'd1' })).toEqual({
      pathname: '/labs/[code]',
      params: { code: 'HBA1C' },
    });
    expect(getTimelineEventActionLabel({ type: 'lab', labCode: 'HBA1C' })).toBe('수치 변화 보기');
  });

  it('검사 항목이 여러 개면 해당 문서의 검사 수치로', () => {
    expect(getTimelineEventHref({ type: 'lab', documentId: 'd1' })).toEqual({
      pathname: '/documents/[id]/labs',
      params: { id: 'd1' },
    });
    expect(getTimelineEventActionLabel({ type: 'lab' })).toBe('검사 수치 보기');
  });

  it('진료·진단·처방은 문서의 정리 결과로', () => {
    for (const type of ['visit', 'diagnosis', 'prescription'] as const) {
      expect(getTimelineEventHref({ type, documentId: 'd2' })).toEqual({
        pathname: '/documents/[id]',
        params: { id: 'd2' },
      });
      expect(getTimelineEventActionLabel({ type })).toBe('정리 결과 보기');
    }
  });
});

describe('타임라인 이벤트 색·아이콘', () => {
  it('분류별 색을 쓴다', () => {
    expect(getTimelineEventStyle({ type: 'visit' })).toMatchObject({ tone: 'primary', color: Colors.primary });
    expect(getTimelineEventStyle({ type: 'diagnosis' })).toMatchObject({ tone: 'caution', color: Colors.caution });
    expect(getTimelineEventStyle({ type: 'prescription' })).toMatchObject({ tone: 'info', color: Colors.info });
  });

  it('검사는 판정 색을 따른다 (판정이 없으면 정상)', () => {
    expect(getTimelineEventStyle({ type: 'lab', flag: 'high' })).toMatchObject({ tone: 'high', color: Colors.high });
    expect(getTimelineEventStyle({ type: 'lab', flag: 'critical_high' })).toMatchObject({ tone: 'danger' });
    // 매우 낮음도 매우 높음과 같은 위험 톤 (검사 판정 배지와 같은 규칙)
    expect(getTimelineEventStyle({ type: 'lab', flag: 'critical_low' })).toMatchObject({
      tone: 'danger',
      color: Colors.critical,
    });
    expect(getTimelineEventStyle({ type: 'lab' })).toMatchObject({ tone: 'normal', color: Colors.normal });
  });

  it('계약에 없는 판정 값은 중립 톤으로 표시한다', () => {
    expect(getTimelineEventStyle({ type: 'lab', flag: 'unknown' as never })).toMatchObject({
      tone: 'neutral',
      color: Colors.textSecondary,
    });
  });

  it('진단·검사·처방은 정리 결과 화면과 같은 아이콘을 쓴다', () => {
    expect(getTimelineEventStyle({ type: 'diagnosis' }).icon).toBe('medical');
    expect(getTimelineEventStyle({ type: 'lab' }).icon).toBe('flask');
    expect(getTimelineEventStyle({ type: 'prescription' }).icon).toBe('medkit');
  });
});
