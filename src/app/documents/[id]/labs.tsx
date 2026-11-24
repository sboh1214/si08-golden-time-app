/**
 * 문서 상세 › 검사 수치 (과업 ④ 검사 수치 시각화)
 *
 * 등록 문서에서 추출된 검사 항목을 참고치 막대와 함께 분류별로 보여준다.
 * 상단 요약(정상·높음·낮음 개수)과 '확인 필요' 필터를 제공하고,
 * 각 항목에서 수치 변화 화면으로 이동할 수 있다.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AiDisclaimer } from '@/components/domain/ai-disclaimer';
import { DocumentGate } from '@/components/domain/document-gate';
import { DocumentSectionNav } from '@/components/domain/document-section-nav';
import { LabResultCard } from '@/components/labs/lab-result-card';
import { LabSummaryCard } from '@/components/labs/lab-summary-card';
import { groupByCategory, prioritizeAbnormalGroups, summarizeFlags } from '@/components/labs/lab-utils';
import { EmptyState } from '@/components/states/empty-state';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { formatDate } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { UPLOAD_CTA_LABEL } from '@/lib/labels';
import { isAbnormal } from '@/lib/labs';
import type { DocumentAnalysis, MedicalDocument } from '@/types/domain';

type LabFilter = 'all' | 'abnormal';

export default function DocumentLabsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <DocumentGate documentId={id}>
      {(document, analysis) => <DocumentLabsContent document={document} analysis={analysis} />}
    </DocumentGate>
  );
}

function DocumentLabsContent({ document, analysis }: { document: MedicalDocument; analysis: DocumentAnalysis }) {
  const router = useRouter();
  const [filter, setFilter] = useState<LabFilter>('all');

  const labs = analysis.labResults;
  const abnormalLabs = labs.filter((lab) => isAbnormal(lab.flag));
  const visibleGroups = prioritizeAbnormalGroups(groupByCategory(filter === 'all' ? labs : abnormalLabs));
  const disclaimer = analysis.disclaimer || undefined;

  const changeFilter = (next: LabFilter) => {
    if (next === filter) return;
    haptics.selection();
    setFilter(next);
  };

  const openTrend = (code: string) => router.push({ pathname: '/labs/[code]', params: { code } });

  if (labs.length === 0) {
    return (
      <Screen>
        <DocumentSectionNav documentId={document.id} current="labs" />
        <EmptyState
          icon="stats-chart-outline"
          title="이 기록에는 검사 수치가 없어요"
          description="혈액검사·소변검사 결과가 담긴 결과지를 등록하면 수치를 참고치와 비교해 보여드려요."
          actionLabel={UPLOAD_CTA_LABEL}
          onAction={() => router.push('/upload')}
        />
        <AiDisclaimer text={disclaimer} />
      </Screen>
    );
  }

  return (
    <Screen>
      <DocumentSectionNav documentId={document.id} current="labs" />

      <LabSummaryCard
        title={`검사 결과 ${labs.length}항목`}
        subtitle={`${formatDate(document.visitDate)} · ${document.hospitalName}`}
        summary={summarizeFlags(labs.map((lab) => lab.flag))}
      />

      <View style={styles.filters}>
        <Chip label="전체" count={labs.length} selected={filter === 'all'} onPress={() => changeFilter('all')} />
        <Chip
          label="확인 필요"
          icon="alert-circle-outline"
          count={abnormalLabs.length}
          selected={filter === 'abnormal'}
          onPress={() => changeFilter('abnormal')}
        />
      </View>

      {visibleGroups.length === 0 ? (
        <EmptyState
          icon="checkmark-circle-outline"
          title="확인이 필요한 항목이 없어요"
          description="이 기록의 검사 수치는 모두 참고치 안에 있어요."
        />
      ) : (
        visibleGroups.map((group) => (
          <View key={group.category}>
            <SectionHeader title={group.category} count={group.items.length} />
            <View style={styles.cards}>
              {group.items.map((lab) => (
                <LabResultCard key={lab.id} lab={lab} onPressTrend={() => openTrend(lab.code)} />
              ))}
            </View>
          </View>
        ))
      )}

      <AiDisclaimer text={disclaimer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cards: { gap: Spacing.md },
});
