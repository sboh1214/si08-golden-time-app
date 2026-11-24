/**
 * 항목별 수치 변화 (과업 ④ 검사 수치 시각화)
 *
 * 한 검사 항목(예: 당화혈색소)을 여러 문서에 걸쳐 시간순으로 모아
 * 최근 결과 · 지난 검사 대비 변화 · 추이 그래프 · 측정 기록 · 쉬운 설명을 보여준다.
 * 측정 기록을 누르면 해당 결과지의 검사 수치 화면으로, 질문 추가 버튼은 질문 작성 화면으로 이동한다.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AiDisclaimer } from '@/components/domain/ai-disclaimer';
import { buildLabQuestionText, describeLabChange, formatLabValue } from '@/components/labs/lab-utils';
import { LabValueRow } from '@/components/labs/lab-value';
import { LatestResultCard } from '@/components/labs/latest-result-card';
import { TrendChart } from '@/components/labs/trend-chart';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { QueryState } from '@/components/states/query-state';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Icon } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/section-header';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useLabTrend } from '@/hooks/api';
import { useManualRefresh } from '@/hooks/use-manual-refresh';
import { formatDate, formatDateLong } from '@/lib/format';
import { LAB_FLAG_LABEL } from '@/lib/labels';
import type { LabTrend, LabTrendPoint } from '@/types/domain';

export default function LabTrendScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const query = useLabTrend(code);
  const { refreshing, onRefresh } = useManualRefresh([query.refetch]);

  if (!code) {
    return <ErrorState title="잘못된 접근이에요" message="검사 정보를 찾을 수 없어요." />;
  }

  return (
    <QueryState query={query} loadingMessage="검사 기록을 불러오는 중이에요…">
      {(trend) => (
        <>
          <Stack.Screen options={{ title: trend.name }} />
          <Screen refreshing={refreshing} onRefresh={onRefresh}>
            <LabTrendContent trend={trend} />
          </Screen>
        </>
      )}
    </QueryState>
  );
}

function LabTrendContent({ trend }: { trend: LabTrend }) {
  const router = useRouter();
  const { points } = trend;
  const latest = points[points.length - 1];
  const previous = points.length > 1 ? points[points.length - 2] : undefined;

  if (!latest) {
    return <EmptyState icon="stats-chart-outline" title="아직 측정 기록이 없어요" />;
  }

  const change = previous ? describeLabChange(latest.value, previous.value, trend.unit) : undefined;
  const newestFirst = [...points].reverse();

  const addQuestion = () =>
    router.push({
      pathname: '/questions/edit',
      params: {
        text: buildLabQuestionText(trend.name, latest.flag, change?.direction),
        relatedLabel: `${trend.name} ${formatLabValue(latest.value, trend.unit)}`,
        documentId: latest.documentId,
      },
    });

  const openDocument = (point: LabTrendPoint) =>
    router.push({ pathname: '/documents/[id]/labs', params: { id: point.documentId } });

  return (
    <>
      <LatestResultCard trend={trend} latest={latest} change={change} />

      <View>
        <SectionHeader title="수치 변화" subtitle={trend.unit ? `단위: ${trend.unit}` : undefined} />
        <Card>
          <TrendChart
            name={trend.name}
            unit={trend.unit}
            points={points}
            referenceRange={trend.referenceRange}
          />
          {points.length === 1 ? (
            <AppText variant="caption" color="textTertiary" style={styles.chartNote}>
              아직 한 번만 측정했어요. 같은 검사를 다시 받고 기록을 등록하면 변화를 선으로 이어 보여드려요.
            </AppText>
          ) : null}
        </Card>
      </View>

      <View>
        <SectionHeader title="측정 기록" subtitle="누르면 해당 결과지를 볼 수 있어요" count={points.length} />
        <Card padding={0} clip>
          {newestFirst.map((point, index) => {
            const isLatest = index === 0;
            const value = formatLabValue(point.value, trend.unit);
            return (
              <View key={point.labResultId}>
                {index > 0 ? <Divider inset={Spacing.lg} /> : null}
                <LabValueRow
                  title={formatDate(point.measuredAt)}
                  subtitle={isLatest ? '최근 결과 · 결과지 보기' : '결과지 보기'}
                  value={point.value}
                  unit={trend.unit}
                  flag={point.flag}
                  onPress={() => openDocument(point)}
                  accessibilityLabel={`${formatDateLong(point.measuredAt)} ${value}, ${LAB_FLAG_LABEL[point.flag]}${isLatest ? ', 최근 결과' : ''}`}
                  accessibilityHint="이 검사가 담긴 결과지를 열어요"
                />
              </View>
            );
          })}
        </Card>
      </View>

      {trend.plainExplanation ? (
        <Card style={styles.explanationCard}>
          <View style={styles.explanationHeader}>
            <Icon name="book-outline" size={20} color="primary" />
            <AppText variant="heading" accessibilityRole="header">
              이 검사는요
            </AppText>
          </View>
          <AppText variant="body" scalable>
            {trend.plainExplanation}
          </AppText>
        </Card>
      ) : null}

      <Button
        label="이 검사에 대해 질문 추가"
        icon="chatbubble-ellipses-outline"
        variant="secondary"
        size="lg"
        fullWidth
        onPress={addQuestion}
        accessibilityHint="다음 진료 때 물어볼 질문 목록에 추가해요"
      />

      <AiDisclaimer />
    </>
  );
}

const styles = StyleSheet.create({
  chartNote: { marginTop: Spacing.md },
  explanationCard: { gap: Spacing.sm },
  explanationHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
