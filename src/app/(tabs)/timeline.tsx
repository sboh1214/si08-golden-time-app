/**
 * 건강 타임라인 탭 — 여러 기록을 시간순으로 모은 화면 (과업 ⑤).
 *
 * - 요약: 진료기록 n건 · 병원 수 · 기간
 * - 분류 필터: 전체 / 진료 / 진단 / 검사 / 처방
 * - 월별 묶음(최신 월 먼저), 항목을 누르면 정리 결과 또는 수치 변화 화면으로 이동
 * - 진료·진단 항목 설명은 AI 해설(요약·쉬운 설명)이라 목록 하단에 AI 해설 고지를 둔다
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, SectionList, StyleSheet, View } from 'react-native';

import { AiDisclaimer } from '@/components/domain/ai-disclaimer';
import { EmptyState, QueryState } from '@/components/states';
import { getTimelineEventHref } from '@/components/timeline/event-meta';
import {
  TIMELINE_FILTERS,
  countTimelineEvents,
  filterTimelineEvents,
  groupTimelineByMonth,
  summarizeTimeline,
  type TimelineFilterKey,
} from '@/components/timeline/group';
import { TimelineEventItem } from '@/components/timeline/timeline-event-item';
import { TimelineSummaryCard } from '@/components/timeline/timeline-summary-card';
import { AppText } from '@/components/ui/app-text';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { Colors, ScreenPadding, Spacing } from '@/constants/theme';
import { useTimeline } from '@/hooks/api';
import { useManualRefresh } from '@/hooks/use-manual-refresh';
import { haptics } from '@/lib/haptics';
import { UPLOAD_CTA_LABEL } from '@/lib/labels';
import type { TimelineEvent } from '@/types/domain';

export default function TimelineScreen() {
  const router = useRouter();
  const timelineQuery = useTimeline();
  const { refreshing, onRefresh } = useManualRefresh([timelineQuery.refetch]);

  return (
    <Screen scroll={false} padded={false}>
      <QueryState
        query={timelineQuery}
        loadingMessage="타임라인을 불러오는 중이에요…"
        isEmpty={(events) => events.length === 0}
        empty={{
          icon: 'git-commit-outline',
          title: '아직 타임라인에 쌓인 기록이 없어요',
          description: '진료기록을 등록하면 진료·진단·검사·처방이 날짜순으로 정리돼요.',
          actionLabel: UPLOAD_CTA_LABEL,
          onAction: () => router.push('/upload'),
        }}>
        {(events) => (
          <Timeline
            events={events}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onOpenEvent={(event) => router.push(getTimelineEventHref(event))}
          />
        )}
      </QueryState>
    </Screen>
  );
}

interface TimelineProps {
  events: TimelineEvent[];
  refreshing: boolean;
  onRefresh: () => void;
  onOpenEvent: (event: TimelineEvent) => void;
}

function Timeline({ events, refreshing, onRefresh, onOpenEvent }: TimelineProps) {
  const [filter, setFilter] = useState<TimelineFilterKey>('all');

  const summary = useMemo(() => summarizeTimeline(events), [events]);
  const counts = useMemo(() => countTimelineEvents(events), [events]);
  const sections = useMemo(
    () => groupTimelineByMonth(filterTimelineEvents(events, filter)),
    [events, filter],
  );

  const header = (
    <View style={styles.header}>
      <TimelineSummaryCard summary={summary} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filters}
        accessibilityLabel="기록 분류">
        {TIMELINE_FILTERS.map(({ key, label }) => (
          <Chip
            key={key}
            label={label}
            count={counts[key]}
            selected={filter === key}
            onPress={() => {
              if (filter === key) return;
              haptics.selection();
              setFilter(key);
            }}
            testID={`timeline-filter-${key}`}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={(event) => event.id}
      renderItem={({ item, index, section }) => (
        <TimelineEventItem
          event={item}
          isFirst={index === 0}
          isLast={index === section.data.length - 1}
          onPress={onOpenEvent}
        />
      )}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <AppText variant="heading" accessibilityRole="header">
            {section.title}
          </AppText>
          <AppText variant="caption" color="textTertiary">
            {section.data.length}건
          </AppText>
        </View>
      )}
      stickySectionHeadersEnabled
      ListHeaderComponent={header}
      ListEmptyComponent={
        <EmptyState
          icon="funnel-outline"
          title="이 분류의 기록이 없어요"
          description="다른 분류를 선택해 보세요."
        />
      }
      ListFooterComponent={<AiDisclaimer compact />}
      ListFooterComponentStyle={styles.footer}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: ScreenPadding,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.huge,
  },
  header: { gap: Spacing.lg, marginBottom: Spacing.sm },
  footer: { marginTop: Spacing.lg },
  // 화면 좌우 끝까지 스크롤되도록 목록 여백만큼 바깥으로 넓힌다
  filterScroll: { marginHorizontal: -ScreenPadding },
  filters: { gap: Spacing.sm, paddingVertical: Spacing.xs, paddingHorizontal: ScreenPadding },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
});
