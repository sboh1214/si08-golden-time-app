import { StyleSheet, View } from 'react-native';

import { formatLabValue, LAB_TREND_HINT } from '@/components/labs/lab-utils';
import { LabValueRow } from '@/components/labs/lab-value';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Spacing } from '@/constants/theme';
import { LAB_FLAG_LABEL } from '@/lib/labels';
import { flagSeverity, formatReferenceRange } from '@/lib/labs';
import type { LabResult } from '@/types/domain';

import { SourceLink } from './source-link';

/** 정리 결과 화면에서 바로 보여줄 최대 검사 개수 (나머지는 검사 수치 화면에서) */
const DEFAULT_LIMIT = 6;

/** 참고치를 벗어난 항목이 먼저 오도록 정렬 (같은 판정 수준은 원래 순서 유지) */
export function sortLabsBySeverity(labs: readonly LabResult[]): LabResult[] {
  return [...labs].sort((a, b) => flagSeverity(b.flag) - flagSeverity(a.flag));
}

export interface LabSummaryListProps {
  labs: readonly LabResult[];
  /** 항목을 누르면 해당 검사의 수치 변화 화면으로 이동 */
  onPressLab: (lab: LabResult) => void;
  /** 이 문서의 검사 수치 시각화 화면으로 이동 */
  onShowAll: () => void;
  /** 항목의 근거 원문 문장으로 이동하는 핸들러 (근거 문장이 없으면 undefined → '원문 보기' 숨김) */
  getViewSource?: (lab: LabResult) => (() => void) | undefined;
  limit?: number;
}

/** 검사 항목 요약 목록 — 확인이 필요한 항목부터 간단히 보여주고, 자세한 그래프는 검사 수치 화면으로 안내 */
export function LabSummaryList({
  labs,
  onPressLab,
  onShowAll,
  getViewSource,
  limit = DEFAULT_LIMIT,
}: LabSummaryListProps) {
  const sorted = sortLabsBySeverity(labs);
  const visible = sorted.slice(0, limit);
  const hasMore = sorted.length > visible.length;

  return (
    <>
      <Card padding={0} clip>
        {visible.map((lab, index) => (
          <View key={lab.id}>
            {index > 0 ? <Divider inset={Spacing.lg} /> : null}
            <LabSummaryRow lab={lab} onPress={() => onPressLab(lab)} onViewSource={getViewSource?.(lab)} />
          </View>
        ))}
      </Card>
      <Button
        label={hasMore ? `검사 수치 전체 보기 (${sorted.length})` : '참고치 그래프로 자세히 보기'}
        icon="stats-chart"
        variant="secondary"
        fullWidth
        onPress={onShowAll}
        accessibilityHint="이 기록의 검사 수치를 참고치 범위와 비교한 그래프로 보여드려요"
      />
    </>
  );
}

interface LabSummaryRowProps {
  lab: LabResult;
  onPress: () => void;
  onViewSource?: () => void;
}

function LabSummaryRow({ lab, onPress, onViewSource }: LabSummaryRowProps) {
  const reference = formatReferenceRange(lab.referenceRange, lab.unit);
  const showOriginal = lab.originalName.trim() !== '' && lab.originalName !== lab.name;

  return (
    <View>
      <LabValueRow
        title={lab.name}
        subtitle={showOriginal ? `${lab.originalName} · 참고치 ${reference}` : `참고치 ${reference}`}
        value={lab.value}
        unit={lab.unit}
        flag={lab.flag}
        onPress={onPress}
        accessibilityLabel={`${lab.name}, ${formatLabValue(lab.value, lab.unit)}, ${LAB_FLAG_LABEL[lab.flag]}, 참고치 ${reference}`}
        accessibilityHint={LAB_TREND_HINT}
        style={onViewSource ? styles.rowWithSource : undefined}
        testID={`lab-row-${lab.id}`}
      />
      {onViewSource ? (
        <View style={styles.source}>
          <SourceLink onPress={onViewSource} subject={lab.name} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // '원문 보기' 링크가 아래에 붙으면 행 아래 여백을 줄여 한 항목으로 묶여 보이게 한다
  rowWithSource: { paddingBottom: Spacing.xs },
  source: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xs },
});
