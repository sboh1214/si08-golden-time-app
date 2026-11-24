import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';

export interface SectionFilterOption {
  title: string;
  count: number;
}

export interface SectionFilterProps {
  sections: readonly SectionFilterOption[];
  /** 전체 문장 수 */
  total: number;
  /** 선택한 구역 (null = 전체) */
  selected: string | null;
  onSelect: (section: string | null) => void;
  /** 가로 스크롤이 화면 끝까지 닿도록 상쇄할 좌우 여백 */
  gutter: number;
}

/** 구역(주호소·현병력 …)별 문장 필터 칩 — 가로 스크롤 */
export function SectionFilter({ sections, total, selected, onSelect, gutter }: SectionFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -gutter }}
      contentContainerStyle={[styles.row, { paddingHorizontal: gutter }]}
      accessibilityLabel="구역별로 보기">
      <Chip label="전체" count={total} selected={selected === null} onPress={() => onSelect(null)} />
      {sections.map((section) => (
        <Chip
          key={section.title}
          label={section.title}
          count={section.count}
          selected={selected === section.title}
          onPress={() => onSelect(section.title)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.sm,
    alignItems: 'center',
    // Chip 의 hitSlop(4) 이 잘리지 않도록 위아래 여유
    paddingVertical: Spacing.xs,
  },
});
