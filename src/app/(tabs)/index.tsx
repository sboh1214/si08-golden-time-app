import { useRouter } from 'expo-router';

import { AiDisclaimer } from '@/components/domain/ai-disclaimer';
import { AbnormalLabsSection } from '@/components/home/abnormal-labs-section';
import { DocumentStatusBanners } from '@/components/home/document-status-banners';
import { FirstRunGuide } from '@/components/home/first-run-guide';
import { HomeHeader } from '@/components/home/home-header';
import { QuestionsSection } from '@/components/home/questions-section';
import { RecentDocumentsSection } from '@/components/home/recent-documents-section';
import { UploadCtaCard } from '@/components/home/upload-cta-card';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { useDocuments, useLabCatalog, useQuestions } from '@/hooks/api';
import { useManualRefresh } from '@/hooks/use-manual-refresh';

/**
 * 홈 — 진료기록 등록 바로가기와 내 건강 기록 요약.
 *
 * 섹션별로 로딩·오류를 따로 처리해 한 API 가 실패해도 나머지는 계속 볼 수 있다.
 * 등록한 기록이 하나도 없으면 사용법 안내(3단계)를 보여준다.
 */
export default function HomeScreen() {
  const router = useRouter();
  const documentsQuery = useDocuments();
  const labCatalogQuery = useLabCatalog();
  const questionsQuery = useQuestions();
  const { refreshing, onRefresh } = useManualRefresh([
    documentsQuery.refetch,
    labCatalogQuery.refetch,
    questionsQuery.refetch,
  ]);

  const goUpload = () => router.push('/upload');
  const isFirstRun = documentsQuery.data?.length === 0;

  return (
    <Screen safeTop refreshing={refreshing} onRefresh={onRefresh} testID="home-screen">
      <HomeHeader />
      {isFirstRun ? (
        <FirstRunGuide onStart={goUpload} />
      ) : (
        <>
          <UploadCtaCard onPress={goUpload} />
          {documentsQuery.data ? <DocumentStatusBanners documents={documentsQuery.data} /> : null}
          <AbnormalLabsSection query={labCatalogQuery} />
          <RecentDocumentsSection query={documentsQuery} />
          <QuestionsSection query={questionsQuery} />
          <Card padding={0} clip>
            <ListRow
              icon="git-commit-outline"
              title="건강 타임라인 보기"
              subtitle="진료·검사·처방 기록을 날짜순으로 모아 봐요"
              onPress={() => router.navigate('/timeline')}
              testID="home-timeline-link"
            />
          </Card>
        </>
      )}
      <AiDisclaimer compact />
    </Screen>
  );
}
