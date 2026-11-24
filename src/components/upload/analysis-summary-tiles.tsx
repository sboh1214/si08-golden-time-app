import { StyleSheet, View } from 'react-native';

import { CountTiles } from '@/components/result/count-tiles';
import { AppText } from '@/components/ui/app-text';
import { Spacing } from '@/constants/theme';
import type { DocumentSummaryCounts } from '@/types/domain';

/**
 * 해설 완료 요약: 결과 화면과 같은 개수 타일(진단 · 검사 · 처방 약)에
 * 참고치를 벗어난 검사가 있으면 해설에서 확인하라는 안내를 덧붙인다.
 */
export function AnalysisSummaryTiles({ summary }: { summary: DocumentSummaryCounts }) {
  return (
    <View style={styles.container} testID="analysis-summary">
      <CountTiles
        diagnosisCount={summary.diagnosisCount}
        labCount={summary.labCount}
        abnormalLabCount={summary.abnormalLabCount}
        medicationCount={summary.medicationCount}
      />
      {summary.abnormalLabCount > 0 ? (
        <AppText variant="caption" color="textSecondary" align="center">
          참고치를 벗어난 검사 수치가 있어요. 해설에서 자세히 확인해 보세요.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
});
