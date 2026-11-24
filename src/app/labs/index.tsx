/**
 * 내 검사 수치 (과업 ④ 검사 수치 시각화)
 *
 * 지금까지 등록한 모든 문서에서 측정된 검사 항목을 모아 보여준다.
 * 최근 결과가 참고치를 벗어난 항목을 먼저, 나머지는 검사 분류별로 묶는다.
 * 항목을 누르면 항목별 수치 변화 화면으로 이동한다.
 */
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AiDisclaimer } from '@/components/domain/ai-disclaimer';
import { LabCatalogRow } from '@/components/labs/lab-catalog-row';
import { groupByCategory } from '@/components/labs/lab-utils';
import { QueryState } from '@/components/states/query-state';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useLabCatalog } from '@/hooks/api';
import { useManualRefresh } from '@/hooks/use-manual-refresh';
import { UPLOAD_CTA_LABEL } from '@/lib/labels';
import { isAbnormal } from '@/lib/labs';
import type { LabCatalogItem } from '@/types/domain';

export default function LabCatalogScreen() {
  const router = useRouter();
  const query = useLabCatalog();
  const { refreshing, onRefresh } = useManualRefresh([query.refetch]);

  return (
    <QueryState
      query={query}
      loadingMessage="검사 수치를 불러오는 중이에요…"
      isEmpty={(items) => items.length === 0}
      empty={{
        icon: 'stats-chart-outline',
        title: '아직 모인 검사 수치가 없어요',
        description: '검사 결과가 담긴 진료기록이나 검사 결과지를 등록하면 검사 항목별로 수치 변화를 모아 보여드려요.',
        actionLabel: UPLOAD_CTA_LABEL,
        onAction: () => router.push('/upload'),
      }}>
      {(items) => (
        <Screen refreshing={refreshing} onRefresh={onRefresh}>
          <LabCatalogContent
            items={items}
            onSelect={(code) => router.push({ pathname: '/labs/[code]', params: { code } })}
          />
        </Screen>
      )}
    </QueryState>
  );
}

function LabCatalogContent({ items, onSelect }: { items: LabCatalogItem[]; onSelect: (code: string) => void }) {
  const attention = items.filter((item) => isAbnormal(item.latestFlag));
  const groups = groupByCategory(items.filter((item) => !isAbnormal(item.latestFlag)));

  return (
    <>
      <View style={styles.intro}>
        <AppText variant="body" color="textSecondary">
          지금까지 등록한 기록에서 찾은 검사 {items.length}가지예요. 항목을 누르면 수치가 어떻게 변해 왔는지 볼 수 있어요.
        </AppText>
        <AppText variant="caption" color="textTertiary">
          판정은 각 결과지에 적힌 참고치를 기준으로 해요. 병원이나 검사 방법에 따라 참고치가 다를 수 있어요.
        </AppText>
      </View>

      {attention.length > 0 ? (
        <View>
          <SectionHeader
            title="확인이 필요한 항목"
            subtitle="가장 최근 검사에서 참고치를 벗어났어요"
            count={attention.length}
          />
          <CatalogList items={attention} onSelect={onSelect} />
        </View>
      ) : null}

      {groups.map((group) => (
        <View key={group.category}>
          <SectionHeader title={group.category} count={group.items.length} />
          <CatalogList items={group.items} onSelect={onSelect} />
        </View>
      ))}

      <AiDisclaimer />
    </>
  );
}

function CatalogList({ items, onSelect }: { items: LabCatalogItem[]; onSelect: (code: string) => void }) {
  return (
    <Card padding={0} clip>
      {items.map((item, index) => (
        <View key={item.code}>
          {index > 0 ? <Divider inset={Spacing.lg} /> : null}
          <LabCatalogRow item={item} onPress={() => onSelect(item.code)} />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.xs },
});
