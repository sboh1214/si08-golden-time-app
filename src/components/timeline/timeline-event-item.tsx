import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { LabFlagBadge } from '@/components/domain/lab-flag-badge';
import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Colors, HitSize, Radius, Spacing } from '@/constants/theme';
import { formatMonthDay } from '@/lib/format';
import { LAB_FLAG_LABEL, TIMELINE_EVENT_LABEL } from '@/lib/labels';
import type { TimelineEvent } from '@/types/domain';

import { getTimelineEventActionLabel, getTimelineEventStyle } from './event-meta';

/** 설명을 접었을 때 보이는 줄 수 */
const COLLAPSED_LINES = 2;

export interface TimelineEventItemProps {
  event: TimelineEvent;
  /** 월 묶음의 첫 항목이면 레일 윗선을 숨긴다 */
  isFirst: boolean;
  /** 월 묶음의 마지막 항목이면 레일 아랫선을 숨긴다 */
  isLast: boolean;
  onPress: (event: TimelineEvent) => void;
}

/**
 * 타임라인 항목: [레일(세로선 + 분류 아이콘 점)] [카드]
 * 카드 위쪽(분류·날짜·제목·병원)은 상세 화면으로 이동하고,
 * 설명이 2줄을 넘으면 설명을 눌러 펼치거나 접을 수 있다.
 */
export function TimelineEventItem({ event, isFirst, isLast, onPress }: TimelineEventItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [fullHeight, setFullHeight] = useState(0);
  const [collapsedHeight, setCollapsedHeight] = useState(0);
  const style = getTimelineEventStyle(event);
  const typeLabel = TIMELINE_EVENT_LABEL[event.type];
  const actionLabel = getTimelineEventActionLabel(event);
  const place = event.department ? `${event.hospitalName} · ${event.department}` : event.hospitalName;
  const date = formatMonthDay(event.date);
  // 버튼 라벨이 안쪽 글자를 대신 읽히므로, 화면에 보이는 검사 판정 배지도 라벨에 넣는다
  const flagLabel = event.type === 'lab' && event.flag ? LAB_FLAG_LABEL[event.flag] : undefined;
  // 실제로 잘린 경우에만 펼치기 제공 (글자 크기·화면 폭에 따라 달라지므로 측정해서 판단)
  const truncated = fullHeight - collapsedHeight > 1;

  const onCollapsedLayout = (e: LayoutChangeEvent) => {
    if (!expanded) setCollapsedHeight(e.nativeEvent.layout.height);
  };
  const onFullLayout = (e: LayoutChangeEvent) => setFullHeight(e.nativeEvent.layout.height);

  const description = event.description ? (
    <View style={styles.clip}>
      <AppText
        variant="callout"
        color="textSecondary"
        scalable
        numberOfLines={expanded ? undefined : COLLAPSED_LINES}
        onLayout={onCollapsedLayout}>
        {event.description}
      </AppText>
      {/* 높이 측정용 사본 (보이지 않음) — 전체 높이와 비교해 잘렸는지 판단 */}
      <View
        style={styles.measure}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <AppText variant="callout" scalable onLayout={onFullLayout}>
          {event.description}
        </AppText>
      </View>
    </View>
  ) : null;

  return (
    <View style={styles.row}>
      <View style={styles.rail} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.lineTop, isFirst && styles.lineHidden]} />
        <View style={[styles.dot, { backgroundColor: style.softColor, borderColor: style.color }]}>
          <Icon name={style.icon} size={16} color={style.color} />
        </View>
        <View style={[styles.lineBottom, isLast && styles.lineHidden]} />
      </View>

      <View style={styles.content}>
        <Card padding={0}>
          <Pressable
            onPress={() => onPress(event)}
            accessibilityRole="button"
            accessibilityLabel={`${date} ${typeLabel}${flagLabel ? `, ${flagLabel}` : ''}. ${event.title}. ${place}`}
            accessibilityHint={`${actionLabel}로 이동해요`}
            testID={`timeline-event-${event.id}`}
            style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
            <View style={styles.meta}>
              <Badge label={typeLabel} tone={style.tone} icon={style.icon} />
              {event.type === 'lab' && event.flag ? <LabFlagBadge flag={event.flag} /> : null}
              <View style={styles.metaRight}>
                <AppText variant="captionStrong" color="textSecondary">
                  {date}
                </AppText>
                <Icon name="chevron-forward" size={16} color="textTertiary" />
              </View>
            </View>
            <AppText variant="bodyStrong" scalable>
              {event.title}
            </AppText>
            <View style={styles.place}>
              <Icon name="business-outline" size={14} color="textTertiary" />
              <AppText variant="caption" color="textTertiary" numberOfLines={1} style={styles.flex}>
                {place}
              </AppText>
            </View>
          </Pressable>

          {description && truncated ? (
            <Pressable
              onPress={() => setExpanded((v) => !v)}
              accessibilityRole="button"
              // 화면에서는 잘려 보여도 스크린리더는 설명 전체를 읽는다
              accessibilityLabel={event.description}
              accessibilityHint={expanded ? '설명을 접어요' : '잘린 설명을 모두 펼쳐요'}
              accessibilityState={{ expanded }}
              style={({ pressed }) => [styles.description, styles.descriptionToggle, pressed && styles.pressed]}>
              {description}
              <View style={styles.toggle}>
                <AppText variant="captionStrong" color="primary">
                  {expanded ? '접기' : '더 보기'}
                </AppText>
                <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="primary" />
              </View>
            </Pressable>
          ) : description ? (
            <View style={styles.description}>{description}</View>
          ) : null}
        </Card>
      </View>
    </View>
  );
}

const RAIL_WIDTH = 36;
const DOT_SIZE = 32;
/** 점이 카드 첫 줄(분류 배지)과 나란하도록 위쪽 선 길이 */
const LINE_TOP = Spacing.md;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.md },
  rail: { width: RAIL_WIDTH, alignItems: 'center' },
  lineTop: { width: 2, height: LINE_TOP, backgroundColor: Colors.border },
  lineBottom: { width: 2, flex: 1, backgroundColor: Colors.border },
  lineHidden: { backgroundColor: 'transparent' },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: Radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, paddingBottom: Spacing.md },
  main: {
    gap: Spacing.xs,
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
    minHeight: HitSize,
    borderRadius: Radius.lg,
  },
  pressed: { opacity: 0.75 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.xs },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, marginLeft: 'auto' },
  place: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  flex: { flex: 1 },
  description: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  descriptionToggle: { minHeight: HitSize },
  clip: { overflow: 'hidden' },
  measure: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0, pointerEvents: 'none' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, marginTop: Spacing.xs },
});
