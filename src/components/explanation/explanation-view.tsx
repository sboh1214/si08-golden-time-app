import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AiDisclaimer } from '@/components/domain/ai-disclaimer';
import { DocumentSectionNav } from '@/components/domain/document-section-nav';
import { EmptyState } from '@/components/states/empty-state';
import { AppText } from '@/components/ui/app-text';
import { ScreenPadding, Spacing } from '@/constants/theme';
import { formatDateLong } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import type { DocumentAnalysis, GlossaryTerm, MedicalDocument } from '@/types/domain';

import {
  buildRelatedItemIndex,
  buildRows,
  collectGlossary,
  findSentenceRowIndex,
  groupSentencesBySection,
  isLowConfidence,
  resolveRelatedItems,
  type ExplanationRow,
  type RelatedItem,
} from './derive';
import { ExplanationToolbar } from './explanation-toolbar';
import { GlossaryList } from './glossary-list';
import { COMPACT_WIDTH, useExplanationLayout } from './layout';
import { ReadingGuide } from './reading-guide';
import { SectionHeading } from './section-heading';
import { SentencePairRow } from './sentence-pair-row';
import { TermSheet } from './term-sheet';

export interface ExplanationViewProps {
  document: MedicalDocument;
  analysis: DocumentAnalysis;
  /** 진입하자마자 스크롤해 잠시 강조할 문장 id (예: 정리 결과 화면의 '원문 보기') */
  targetSentenceId?: string;
}

/** 목록이 처음 그려질 시간을 준 뒤 스크롤한다 */
const SCROLL_DELAY_MS = 300;
/** 아직 그려지지 않은 행으로 스크롤에 실패했을 때 다시 시도 */
const SCROLL_RETRY_DELAY_MS = 120;
const MAX_SCROLL_RETRIES = 3;
/** 이동해 온 문장을 강조하는 시간 */
const FLASH_DURATION_MS = 2400;
const DEFAULT_INITIAL_RENDER = 12;
/**
 * 고정할 행: 도구 막대(데이터 0번).
 * ListHeaderComponent 가 있으면 FlatList 는 헤더를 0번으로 세므로 1 을 넘긴다.
 */
const STICKY_HEADER_INDICES = [1];
const EMPTY_RELATED: readonly RelatedItem[] = [];

interface ScrollRequest {
  sentenceId: string;
}

function keyExtractor(row: ExplanationRow): string {
  return row.key;
}

/**
 * 원문 대조 해설 본문.
 *
 * 구성: [문서 탭 · 문서 정보 · 이렇게 읽어요] → (고정) [구역 필터 · 열 머리글]
 *       → 구역별 문장 카드(원문 | 쉬운 해설) → [용어 사전 · AI 고지]
 *
 * 문장 수가 많은 퇴원요약지 등도 부드럽게 보이도록 FlatList 로 가상화하고,
 * 파생 데이터는 모두 메모이즈한다.
 */
export function ExplanationView({ document, analysis, targetSentenceId }: ExplanationViewProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { layout, autoStacked } = useExplanationLayout();
  const gutter = width < COMPACT_WIDTH ? Spacing.md : ScreenPadding;

  /* ---------------- 파생 데이터 ---------------- */

  const { sentences } = analysis;
  const sections = useMemo(() => groupSentencesBySection(sentences), [sentences]);
  const sectionOptions = useMemo(
    () => sections.map((s) => ({ title: s.title, count: s.sentences.length })),
    [sections],
  );
  const glossary = useMemo(() => collectGlossary(sentences), [sentences]);
  const cautionCount = useMemo(() => sentences.filter((s) => isLowConfidence(s.confidence)).length, [sentences]);
  const relatedBySentence = useMemo(() => {
    const index = buildRelatedItemIndex(analysis);
    return new Map(sentences.map((s) => [s.id, resolveRelatedItems(s.relatedItemIds, index)]));
  }, [analysis, sentences]);

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const rows = useMemo(() => buildRows(sections, activeSection), [sections, activeSection]);

  // 이동할 문장이 있으면 그 문장까지는 처음부터 그려 두어 스크롤 실패를 줄인다
  const [initialNumToRender] = useState(() => {
    const targetIndex = targetSentenceId ? findSentenceRowIndex(rows, targetSentenceId) : -1;
    return Math.max(DEFAULT_INITIAL_RENDER, targetIndex + 4);
  });

  /* ---------------- 용어 풀이 시트 ---------------- */

  const [openTerm, setOpenTerm] = useState<GlossaryTerm | null>(null);
  const handleTermPress = useCallback((term: GlossaryTerm) => {
    haptics.light();
    setOpenTerm(term);
  }, []);
  const closeTermSheet = useCallback(() => setOpenTerm(null), []);

  /* ---------------- 문장으로 스크롤 + 강조 ---------------- */

  const listRef = useRef<FlatList<ExplanationRow>>(null);
  const listHeaderHeight = useRef(0);
  const toolbarHeight = useRef(0);
  const scrollY = useRef(0);
  const retryCount = useRef(0);
  const schedule = useScheduledTimeouts();

  const [scrollRequest, setScrollRequest] = useState<ScrollRequest | null>(
    targetSentenceId ? { sentenceId: targetSentenceId } : null,
  );
  const [flashId, setFlashId] = useState<string | null>(null);

  // 화면이 열린 채로 다른 문장을 가리키는 주소로 다시 들어온 경우
  const [lastTargetId, setLastTargetId] = useState(targetSentenceId);
  if (targetSentenceId !== lastTargetId) {
    setLastTargetId(targetSentenceId);
    if (targetSentenceId) {
      setActiveSection(null);
      setScrollRequest({ sentenceId: targetSentenceId });
    }
  }

  const scrollToRow = useCallback((index: number) => {
    // 고정 도구 막대에 가려지지 않도록 그 높이만큼 띄운다
    listRef.current?.scrollToIndex({ index, animated: true, viewOffset: toolbarHeight.current + Spacing.sm });
  }, []);

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      if (retryCount.current >= MAX_SCROLL_RETRIES) return;
      retryCount.current += 1;
      // 아직 측정되지 않은 행: 평균 높이로 근처까지 이동해 행이 그려지게 한 뒤 다시 시도
      listRef.current?.scrollToOffset({
        offset: listHeaderHeight.current + info.averageItemLength * info.index,
        animated: false,
      });
      schedule(() => scrollToRow(info.index), SCROLL_RETRY_DELAY_MS);
    },
    [schedule, scrollToRow],
  );

  useEffect(() => {
    if (!scrollRequest) return;
    const index = findSentenceRowIndex(rows, scrollRequest.sentenceId);
    // 필터에 가려진 경우 필터 해제 후 rows 가 바뀌면 다시 실행된다
    if (index < 0) return;
    const timer = setTimeout(() => {
      retryCount.current = 0;
      scrollToRow(index);
      setFlashId(scrollRequest.sentenceId);
      setScrollRequest(null);
    }, SCROLL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [scrollRequest, rows, scrollToRow]);

  useEffect(() => {
    if (!flashId) return;
    const timer = setTimeout(() => setFlashId(null), FLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [flashId]);

  /** 용어 사전의 '문장 보기' */
  const scrollToSentence = useCallback(
    (sentenceId: string) => {
      haptics.selection();
      if (findSentenceRowIndex(rows, sentenceId) < 0) setActiveSection(null);
      setScrollRequest({ sentenceId });
    },
    [rows],
  );

  /* ---------------- 구역 필터 ---------------- */

  const handleSelectSection = useCallback((section: string | null) => {
    haptics.selection();
    setActiveSection(section);
    // 목록 길이가 바뀌므로, 아래로 내려가 있었다면 첫 구역이 보이도록 도구 막대 위치로 올린다
    if (scrollY.current > listHeaderHeight.current) {
      listRef.current?.scrollToOffset({ offset: listHeaderHeight.current, animated: false });
    }
  }, []);

  /* ---------------- 관련 항목 이동 ---------------- */

  const documentId = document.id;
  const handleRelatedPress = useCallback(
    (item: RelatedItem) => {
      haptics.light();
      if (item.kind === 'lab') {
        router.push({ pathname: '/labs/[code]', params: { code: item.code } });
      } else {
        // 진단·약은 같은 문서의 정리 결과 화면에서 자세히 본다 (스택이 깊어지지 않게 replace)
        router.replace({ pathname: '/documents/[id]', params: { id: documentId } });
      }
    },
    [router, documentId],
  );

  /* ---------------- 레이아웃 측정 ---------------- */

  const handleHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    listHeaderHeight.current = e.nativeEvent.layout.height;
  }, []);
  const handleToolbarLayout = useCallback((e: LayoutChangeEvent) => {
    toolbarHeight.current = e.nativeEvent.layout.height;
  }, []);
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
  }, []);

  /* ---------------- 렌더 ---------------- */

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ExplanationRow>) => {
      switch (item.type) {
        case 'toolbar':
          return (
            <ExplanationToolbar
              layout={layout}
              sections={sectionOptions}
              total={sentences.length}
              activeSection={activeSection}
              onSelectSection={handleSelectSection}
              gutter={gutter}
              onLayout={handleToolbarLayout}
            />
          );
        case 'section':
          return <SectionHeading title={item.title} count={item.count} />;
        case 'sentence':
          return (
            <SentencePairRow
              sentence={item.sentence}
              layout={layout}
              relatedItems={relatedBySentence.get(item.sentence.id) ?? EMPTY_RELATED}
              highlighted={item.sentence.id === flashId}
              onTermPress={handleTermPress}
              onRelatedPress={handleRelatedPress}
            />
          );
      }
    },
    [
      layout,
      sectionOptions,
      sentences.length,
      activeSection,
      handleSelectSection,
      gutter,
      handleToolbarLayout,
      relatedBySentence,
      flashId,
      handleTermPress,
      handleRelatedPress,
    ],
  );

  const hasSentences = sentences.length > 0;

  const listHeader = (
    <View style={styles.listHeader} onLayout={handleHeaderLayout}>
      <DocumentSectionNav documentId={documentId} current="explanation" hasLabs={analysis.labResults.length > 0} />
      <View style={styles.documentInfo}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {document.title}
        </AppText>
        <AppText variant="caption" color="textTertiary">
          {formatDateLong(document.visitDate)}
          {document.department ? ` · ${document.department}` : ''}
        </AppText>
      </View>
      {hasSentences ? (
        <ReadingGuide
          layout={layout}
          autoStacked={autoStacked}
          sentenceCount={sentences.length}
          termCount={glossary.length}
          cautionCount={cautionCount}
        />
      ) : null}
    </View>
  );

  const listFooter = (
    <View style={styles.listFooter}>
      {glossary.length > 0 ? <GlossaryList entries={glossary} onShowSentence={scrollToSentence} /> : null}
      <AiDisclaimer text={analysis.disclaimer || undefined} />
    </View>
  );

  return (
    <>
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="해설할 원문 문장이 없어요"
            description="이 기록에서는 원문 문장을 찾지 못했어요. 정리 결과 화면에서 항목별 내용을 확인해 보세요."
          />
        }
        stickyHeaderIndices={hasSentences ? STICKY_HEADER_INDICES : undefined}
        initialNumToRender={initialNumToRender}
        // Android 기본값(true)은 고정 도구 막대가 사라지는 문제가 있어 끈다
        removeClippedSubviews={false}
        onScroll={handleScroll}
        scrollEventThrottle={64}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        style={styles.list}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: insets.bottom + Spacing.huge }}
        testID="explanation-list"
      />
      <TermSheet term={openTerm} onClose={closeTermSheet} />
    </>
  );
}

/**
 * 컴포넌트가 사라질 때 함께 정리되는 setTimeout.
 * (이벤트 핸들러 안에서 예약한 재시도 타이머가 화면을 닫은 뒤 실행되지 않도록)
 */
function useScheduledTimeouts() {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  return useCallback((callback: () => void, delayMs: number) => {
    const pending = timers.current;
    const id = setTimeout(() => {
      pending.delete(id);
      callback();
    }, delayMs);
    pending.add(id);
  }, []);
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listHeader: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.lg,
  },
  documentInfo: { gap: Spacing.xxs },
  listFooter: {
    paddingTop: Spacing.xxl,
    gap: Spacing.xl,
  },
});
