import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Colors, MaxContentWidth, Radius, ScreenPadding, Spacing } from '@/constants/theme';
import type { MedicalDocument } from '@/types/domain';

import { DocumentCard } from './document-card';
import { applyRecordFilter, countByDocumentType, DEFAULT_RECORD_FILTER, type RecordFilter } from './filter';
import { RecordsToolbar } from './records-toolbar';

export interface RecordsListProps {
  documents: MedicalDocument[];
  refreshing: boolean;
  onRefresh: () => void;
}

/** 내 기록 목록 (검색·필터·정렬 + 당겨서 새로고침) */
export function RecordsList({ documents, refreshing, onRefresh }: RecordsListProps) {
  const [filter, setFilter] = useState<RecordFilter>(DEFAULT_RECORD_FILTER);

  const typeCounts = countByDocumentType(documents);
  // 선택한 종류의 문서가 모두 삭제되면 '전체'로 되돌린다
  const effectiveFilter: RecordFilter =
    filter.documentType === 'all' || typeCounts.some((c) => c.type === filter.documentType)
      ? filter
      : { ...filter, documentType: 'all' };
  const visible = applyRecordFilter(documents, effectiveFilter);

  const updateFilter = (patch: Partial<RecordFilter>) => setFilter((prev) => ({ ...prev, ...patch }));
  const resetFilter = () => setFilter((prev) => ({ ...DEFAULT_RECORD_FILTER, sort: prev.sort }));

  return (
    <FlatList
      data={visible}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <DocumentCard document={item} />}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={
        <RecordsToolbar
          filter={effectiveFilter}
          onChange={updateFilter}
          typeCounts={typeCounts}
          total={documents.length}
          resultCount={visible.length}
        />
      }
      ListHeaderComponentStyle={styles.header}
      ListEmptyComponent={<NoMatches onReset={resetFilter} />}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
      testID="records-list"
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

/** 검색·필터 결과가 없을 때 */
function NoMatches({ onReset }: { onReset: () => void }) {
  return (
    <View style={styles.noMatches} testID="records-no-matches">
      <View style={styles.noMatchesIcon}>
        <Icon name="search" size={26} color="textTertiary" />
      </View>
      <AppText variant="heading" align="center">
        조건에 맞는 기록이 없어요
      </AppText>
      <AppText variant="callout" color="textSecondary" align="center">
        검색어나 문서 종류를 바꿔 보세요.
      </AppText>
      <Button
        label="검색 조건 지우기"
        icon="refresh"
        variant="outline"
        onPress={onReset}
        style={styles.resetButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: ScreenPadding,
    paddingBottom: Spacing.huge,
  },
  header: { marginBottom: Spacing.md },
  separator: { height: Spacing.md },
  noMatches: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.lg,
  },
  noMatchesIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  resetButton: { marginTop: Spacing.md, minWidth: 180 },
});
