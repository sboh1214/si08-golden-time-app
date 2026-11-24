import { SegmentedTabs } from '@/components/ui/segmented-tabs';

import { QUESTION_FILTERS, type QuestionFilterKey } from './filters';

export interface QuestionFilterTabsProps {
  value: QuestionFilterKey;
  counts: Record<QuestionFilterKey, number>;
  onChange: (key: QuestionFilterKey) => void;
}

/** 질문 노트 세그먼트 필터: 물어볼 질문 / 물어본 질문 / 전체 (개수 포함) */
export function QuestionFilterTabs({ value, counts, onChange }: QuestionFilterTabsProps) {
  return (
    <SegmentedTabs
      items={QUESTION_FILTERS.map(({ key, label }) => ({
        key,
        label,
        count: counts[key],
        testID: `question-filter-${key}`,
      }))}
      value={value}
      onChange={onChange}
    />
  );
}
