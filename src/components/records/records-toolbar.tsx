import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { TextField } from '@/components/ui/text-field';
import { HitSize, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { DOCUMENT_TYPE_LABEL } from '@/lib/labels';

import type { DocumentTypeCount, RecordFilter } from './filter';

const SORT_LABEL: Record<RecordFilter['sort'], string> = {
  visit_desc: '진료일 최신순',
  visit_asc: '진료일 오래된순',
};

export interface RecordsToolbarProps {
  filter: RecordFilter;
  onChange: (patch: Partial<RecordFilter>) => void;
  /** 존재하는 문서 종류별 개수 */
  typeCounts: DocumentTypeCount[];
  /** 전체 문서 수 */
  total: number;
  /** 조건에 맞는 문서 수 */
  resultCount: number;
}

/** 내 기록 상단: 검색 · 기록 종류 필터 · 정렬 */
export function RecordsToolbar({ filter, onChange, typeCounts, total, resultCount }: RecordsToolbarProps) {
  const nextSort = filter.sort === 'visit_desc' ? 'visit_asc' : 'visit_desc';

  const selectType = (documentType: RecordFilter['documentType']) => {
    if (documentType === filter.documentType) return;
    haptics.selection();
    onChange({ documentType });
  };

  return (
    <View style={styles.container}>
      <TextField
        value={filter.query}
        onChangeText={(query) => onChange({ query })}
        placeholder="병원·진료과·제목으로 찾기"
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel="기록 검색"
        testID="records-search"
        leading={<Icon name="search" size={20} color="textTertiary" />}
        trailing={
          filter.query ? (
            <Pressable
              onPress={() => onChange({ query: '' })}
              accessibilityRole="button"
              accessibilityLabel="검색어 지우기"
              style={styles.clear}>
              <Icon name="close-circle" size={20} color="textTertiary" />
            </Pressable>
          ) : undefined
        }
      />

      {typeCounts.length > 1 || filter.documentType !== 'all' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          accessibilityLabel="기록 종류 필터">
          <Chip
            label="전체"
            count={total}
            selected={filter.documentType === 'all'}
            onPress={() => selectType('all')}
          />
          {typeCounts.map(({ type, count }) => (
            <Chip
              key={type}
              label={DOCUMENT_TYPE_LABEL[type]}
              count={count}
              selected={filter.documentType === type}
              onPress={() => selectType(type)}
            />
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.metaRow}>
        <AppText variant="callout" color="textSecondary" accessibilityLiveRegion="polite">
          {resultCount === total ? `기록 ${total}건` : `${total}건 중 ${resultCount}건`}
        </AppText>
        <Pressable
          onPress={() => {
            haptics.selection();
            onChange({ sort: nextSort });
          }}
          accessibilityRole="button"
          accessibilityLabel={`정렬: ${SORT_LABEL[filter.sort]}`}
          accessibilityHint={`눌러서 ${SORT_LABEL[nextSort]}으로 바꿔요`}
          style={({ pressed }) => [styles.sort, pressed && styles.pressed]}
          testID="records-sort">
          <Icon name="swap-vertical" size={18} color="textSecondary" />
          <AppText variant="calloutStrong" color="textSecondary">
            {SORT_LABEL[filter.sort]}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
  clear: {
    width: HitSize,
    height: HitSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { gap: Spacing.sm, paddingVertical: Spacing.xxs },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sort: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: HitSize,
    paddingHorizontal: Spacing.sm,
    marginRight: -Spacing.sm,
  },
  pressed: { opacity: 0.6 },
});
