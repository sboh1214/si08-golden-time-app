import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ErrorState, LoadingState } from '@/components/states';
import { AppText } from '@/components/ui/app-text';
import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import { useDocuments } from '@/hooks/api';
import { formatDate } from '@/lib/format';

import { pickRecentDocuments } from './question-rules';

export interface RelatedDocumentPickerProps {
  /** 선택된 문서 id (없으면 '선택 안 함') */
  value: string | undefined;
  onChange: (documentId: string | undefined) => void;
}

/** 질문과 연결할 진료기록 선택 — 해설이 끝난 최근 기록을 칩으로 보여 준다 */
export function RelatedDocumentPicker({ value, onChange }: RelatedDocumentPickerProps) {
  const documentsQuery = useDocuments();
  const options = useMemo(
    () => pickRecentDocuments(documentsQuery.data ?? [], value),
    [documentsQuery.data, value],
  );

  if (documentsQuery.isPending) {
    return <LoadingState fill={false} message="진료기록을 불러오는 중이에요…" />;
  }
  if (documentsQuery.isError) {
    return (
      <ErrorState
        fill={false}
        title="진료기록을 불러오지 못했어요"
        error={documentsQuery.error}
        onRetry={() => void documentsQuery.refetch()}
        retrying={documentsQuery.isRefetching}
      />
    );
  }
  if (options.length === 0) {
    return (
      <AppText variant="caption" color="textTertiary">
        해설이 끝난 진료기록이 아직 없어요. 기록 없이도 질문을 저장할 수 있어요.
      </AppText>
    );
  }
  return (
    <View style={styles.chips}>
      <Chip label="선택 안 함" selected={!value} onPress={() => onChange(undefined)} />
      {options.map((document) => (
        <Chip
          key={document.id}
          label={`${formatDate(document.visitDate)} · ${document.hospitalName}`}
          icon="document-text-outline"
          selected={value === document.id}
          onPress={() => onChange(document.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
