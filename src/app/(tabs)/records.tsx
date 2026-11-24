import { Tabs, useRouter } from 'expo-router';

import { RecordsList } from '@/components/records/records-list';
import { QueryState } from '@/components/states/query-state';
import { HeaderButton } from '@/components/ui/header-button';
import { Screen } from '@/components/ui/screen';
import { useDocuments } from '@/hooks/api';
import { useManualRefresh } from '@/hooks/use-manual-refresh';
import { UPLOAD_CTA_LABEL } from '@/lib/labels';

/**
 * 내 기록 — 등록한 진료기록 목록.
 * 검색(제목·병원·진료과) · 문서 종류 필터 · 진료일 정렬, 처리 중 문서는 진행률을 함께 보여준다.
 */
export default function RecordsScreen() {
  const router = useRouter();
  const documentsQuery = useDocuments();
  const { refreshing, onRefresh } = useManualRefresh([documentsQuery.refetch]);
  const goUpload = () => router.push('/upload');

  return (
    <Screen scroll={false} padded={false} testID="records-screen">
      <Tabs.Screen
        options={{
          headerRight: () => (
            <HeaderButton
              icon="add"
              label="등록"
              accessibilityLabel={UPLOAD_CTA_LABEL}
              onPress={goUpload}
              testID="records-add"
            />
          ),
        }}
      />
      <QueryState
        query={documentsQuery}
        loadingMessage="기록을 불러오는 중이에요…"
        isEmpty={(documents) => documents.length === 0}
        empty={{
          icon: 'folder-open-outline',
          title: '아직 등록한 진료기록이 없어요',
          description: '진료기록을 찍거나 PDF로 올리면\nAI가 진단·검사·약을 쉽게 정리해 드려요.',
          actionLabel: UPLOAD_CTA_LABEL,
          onAction: goUpload,
        }}>
        {(documents) => <RecordsList documents={documents} refreshing={refreshing} onRefresh={onRefresh} />}
      </QueryState>
    </Screen>
  );
}
