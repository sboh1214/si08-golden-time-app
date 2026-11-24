import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { Colors, Spacing } from '@/constants/theme';

import { CARD_BORDER_WIDTH, CARD_PADDING, COLUMN_GAP, ORIGINAL_FLEX, PLAIN_FLEX, type ExplanationLayout } from './layout';
import { SectionFilter, type SectionFilterOption } from './section-filter';

export interface ExplanationToolbarProps {
  layout: ExplanationLayout;
  sections: readonly SectionFilterOption[];
  total: number;
  activeSection: string | null;
  onSelectSection: (section: string | null) => void;
  /** 목록 좌우 여백 — 고정 막대 배경을 화면 끝까지 채우는 데 사용 */
  gutter: number;
  /** 막대 높이가 바뀔 때 (문장으로 스크롤할 때 가려지지 않게 오프셋 계산용) */
  onLayout?: (event: LayoutChangeEvent) => void;
}

/**
 * 목록 상단에 고정(sticky)되는 도구 막대.
 * - 구역 필터 칩 (구역이 2개 이상일 때)
 * - 나란히 보기일 때 열 머리글 "진료기록 원문 | 쉬운 해설"
 */
export function ExplanationToolbar({
  layout,
  sections,
  total,
  activeSection,
  onSelectSection,
  gutter,
  onLayout,
}: ExplanationToolbarProps) {
  const showFilter = sections.length > 1;
  const showColumns = layout === 'side';

  return (
    <View
      style={[
        styles.bar,
        { marginHorizontal: -gutter, paddingHorizontal: gutter },
        (showFilter || showColumns) && styles.barFilled,
      ]}
      onLayout={onLayout}>
      {showFilter ? (
        <SectionFilter
          sections={sections}
          total={total}
          selected={activeSection}
          onSelect={onSelectSection}
          gutter={gutter}
        />
      ) : null}
      {showColumns ? <ColumnHeader /> : null}
    </View>
  );
}

/** 나란히 보기 열 머리글 — 문장 카드의 두 열과 같은 비율·여백으로 정렬 */
function ColumnHeader() {
  return (
    <View
      style={styles.columns}
      // 각 문장 카드가 "진료기록 원문: …", "쉬운 해설: …" 로 읽히므로 스크린리더에서는 생략
      aria-hidden>
      <View style={[styles.column, { flex: ORIGINAL_FLEX }]}>
        <Icon name="document-text-outline" size={16} color="textSecondary" />
        <AppText variant="captionStrong" color="textSecondary" numberOfLines={1}>
          진료기록 원문
        </AppText>
      </View>
      <View style={[styles.column, { flex: PLAIN_FLEX }]}>
        <Icon name="chatbubble-ellipses-outline" size={16} color="primary" />
        <AppText variant="captionStrong" color="primary" numberOfLines={1}>
          쉬운 해설
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.background,
  },
  barFilled: {
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  columns: {
    flexDirection: 'row',
    gap: COLUMN_GAP,
    // 문장 카드의 테두리 + 안쪽 여백 + 상자 안쪽 여백과 맞춘다
    paddingHorizontal: CARD_BORDER_WIDTH + CARD_PADDING,
  },
  column: {
    flexBasis: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
});
