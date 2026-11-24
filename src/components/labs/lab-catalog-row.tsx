import { formatDate } from '@/lib/format';
import { LAB_FLAG_LABEL } from '@/lib/labels';
import type { LabCatalogItem } from '@/types/domain';

import { formatLabValue, LAB_TREND_HINT } from './lab-utils';
import { LabValueRow } from './lab-value';

export interface LabCatalogRowProps {
  item: LabCatalogItem;
  onPress: () => void;
}

/** '내 검사 수치' 목록의 한 줄 — 검사명 · 최근 값 · 판정 · 측정 횟수 */
export function LabCatalogRow({ item, onPress }: LabCatalogRowProps) {
  const measuredAt = formatDate(item.latestMeasuredAt);
  return (
    <LabValueRow
      title={item.name}
      subtitle={item.originalName}
      caption={`${item.count}회 측정 · 최근 ${measuredAt}`}
      value={item.latestValue}
      unit={item.unit}
      flag={item.latestFlag}
      onPress={onPress}
      accessibilityLabel={`${item.name}, 최근 ${formatLabValue(item.latestValue, item.unit)}, ${LAB_FLAG_LABEL[item.latestFlag]}, ${item.count}회 측정, 최근 검사 ${measuredAt}`}
      accessibilityHint={LAB_TREND_HINT}
    />
  );
}
