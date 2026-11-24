import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { formatLabValue, LAB_TREND_HINT } from '@/components/labs/lab-utils';
import { LabValueRow } from '@/components/labs/lab-value';
import type { QueryLike } from '@/components/states/query-state';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { formatDate, formatDateLong } from '@/lib/format';
import { LAB_FLAG_LABEL } from '@/lib/labels';
import type { LabCatalogItem } from '@/types/domain';

import { SectionNote, SectionQueryState } from './section-state';
import { selectAbnormalLabs } from './select';

const MAX_ITEMS = 3;

/** 홈: 참고치를 벗어난 최근 검사 (상위 3개) */
export function AbnormalLabsSection({ query }: { query: QueryLike<LabCatalogItem[]> }) {
  const router = useRouter();
  const abnormal = query.data ? selectAbnormalLabs(query.data) : [];

  return (
    <View>
      <SectionHeader
        title="확인이 필요한 검사"
        subtitle="참고치를 벗어난 가장 최근 결과예요"
        count={abnormal.length > 0 ? abnormal.length : undefined}
        actionLabel="전체 보기"
        onActionPress={() => router.push('/labs')}
      />
      <SectionQueryState query={query} loadingLabel="검사 결과를 불러오는 중이에요">
        {(catalog) => {
          if (catalog.length === 0) {
            return (
              <SectionNote
                icon="flask-outline"
                tone="neutral"
                title="아직 검사 결과가 없어요"
                description="검사 결과지를 등록하면 수치를 모아서 보여 드려요."
              />
            );
          }
          if (abnormal.length === 0) {
            return (
              <SectionNote
                icon="checkmark-circle"
                tone="normal"
                title="모두 참고치 안에 있어요"
                description="가장 최근에 측정한 검사 수치가 모두 정상 범위예요."
              />
            );
          }
          return (
            <Card padding={0} clip>
              {abnormal.slice(0, MAX_ITEMS).map((item, index) => (
                <View key={item.code}>
                  {index > 0 ? <Divider inset={Spacing.lg} /> : null}
                  <LabValueRow
                    title={item.name}
                    subtitle={`${item.originalName} · ${formatDate(item.latestMeasuredAt)}`}
                    value={item.latestValue}
                    unit={item.unit}
                    flag={item.latestFlag}
                    onPress={() => router.push({ pathname: '/labs/[code]', params: { code: item.code } })}
                    accessibilityLabel={`${item.name}, ${formatLabValue(item.latestValue, item.unit)}, ${LAB_FLAG_LABEL[item.latestFlag]}, ${formatDateLong(item.latestMeasuredAt)} 측정`}
                    accessibilityHint={LAB_TREND_HINT}
                    testID={`home-lab-${item.code}`}
                  />
                </View>
              ))}
            </Card>
          );
        }}
      </SectionQueryState>
    </View>
  );
}
