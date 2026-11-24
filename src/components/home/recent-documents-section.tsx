import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DocumentCard } from '@/components/records/document-card';
import type { QueryLike } from '@/components/states/query-state';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import type { MedicalDocument } from '@/types/domain';

import { SectionQueryState } from './section-state';
import { selectRecentDocuments } from './select';

const MAX_ITEMS = 3;

/** 홈: 최근 진료기록 3건 */
export function RecentDocumentsSection({ query }: { query: QueryLike<MedicalDocument[]> }) {
  const router = useRouter();
  return (
    <View>
      <SectionHeader
        title="최근 진료기록"
        actionLabel="전체 보기"
        onActionPress={() => router.navigate('/records')}
      />
      <SectionQueryState query={query} loadingLabel="최근 진료기록을 불러오는 중이에요" skeletonRows={3}>
        {(documents) => (
          <View style={styles.list}>
            {selectRecentDocuments(documents, MAX_ITEMS).map((document) => (
              <DocumentCard key={document.id} document={document} />
            ))}
          </View>
        )}
      </SectionQueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.md },
});
