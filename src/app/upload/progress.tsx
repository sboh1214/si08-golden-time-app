import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { getErrorMessage } from '@/api/errors';
import { AiDisclaimer } from '@/components/domain/ai-disclaimer';
import { ErrorState, isGoneError, LoadingState, RefreshErrorBanner } from '@/components/states';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import type { IconName } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { HeaderButton } from '@/components/ui/header-button';
import { Screen } from '@/components/ui/screen';
import { AnalysisSummaryTiles } from '@/components/upload/analysis-summary-tiles';
import { CaptureTipsCard } from '@/components/upload/capture-tips-card';
import { ProcessingSteps } from '@/components/upload/processing-steps';
import { StatusHero } from '@/components/upload/status-hero';
import { UploadedDocumentCard } from '@/components/upload/uploaded-document-card';
import { useCloseUploadFlow } from '@/components/upload/use-close-upload-flow';
import { Spacing } from '@/constants/theme';
import { useDocument, useReanalyzeDocument } from '@/hooks/api';
import { notify } from '@/lib/dialog';
import { haptics } from '@/lib/haptics';
import {
  ANALYSIS_FAILED_TITLE,
  DOCUMENT_SECTION_LABEL,
  PROCESSING_STATUS_LABEL,
  failureReasonText,
  formatProgress,
  isProcessing,
} from '@/lib/labels';
import type { DocumentSource, MedicalDocument, ProcessingStatus } from '@/types/domain';

/** 분석 실패 시 '새로 등록' 버튼 — 처음 등록한 방법에 맞춘 문구 */
const REGISTER_AGAIN_ACTION: Record<DocumentSource, { label: string; icon: IconName }> = {
  camera: { label: '다시 촬영하기', icon: 'camera-outline' },
  gallery: { label: '다른 사진 고르기', icon: 'images-outline' },
  pdf: { label: '다른 파일 고르기', icon: 'document-outline' },
};

/** 문서 등록 ③ AI 해설 진행 (자동 폴링) → 완료 요약 / 실패 안내 */
export default function UploadProgressScreen() {
  const closeFlow = useCloseUploadFlow();
  const params = useLocalSearchParams<{ documentId?: string }>();
  const documentId = typeof params.documentId === 'string' && params.documentId ? params.documentId : undefined;
  // 처리 중이면 완료·실패까지 자동으로 다시 조회한다 (useDocument 내부 폴링)
  const query = useDocument(documentId);
  const document = query.data;

  useOutcomeFeedback(document?.status);

  const header = (
    <Stack.Screen
      options={{
        title: screenTitle(document?.status),
        headerRight: () => (
          <HeaderButton icon="close" accessibilityLabel="닫기" color="text" onPress={closeFlow} testID="upload-close" />
        ),
      }}
    />
  );

  if (!documentId) {
    return (
      <>
        {header}
        <ErrorState title="잘못된 접근이에요" message="진행 상황을 확인할 진료기록 정보를 찾을 수 없어요." />
      </>
    );
  }
  if (query.isPending) {
    return (
      <>
        {header}
        <LoadingState message="진행 상황을 불러오는 중이에요…" />
      </>
    );
  }
  // 전체 오류 화면은 보여 줄 문서가 없을 때(또는 문서가 삭제됐을 때)만 쓴다
  if (document === undefined || isGoneError(query.error)) {
    return (
      <>
        {header}
        <ErrorState error={query.error} onRetry={() => void query.refetch()} retrying={query.isRefetching} />
      </>
    );
  }

  // 폴링 재조회만 실패했으면 진행 화면을 유지하고 위에 작은 안내만 띄운다
  const refreshError = query.isError ? (
    <RefreshErrorBanner error={query.error} onRetry={() => void query.refetch()} retrying={query.isRefetching} />
  ) : null;

  return (
    <>
      {header}
      {refreshError}
      {document.status === 'completed' ? (
        <CompletedView document={document} onClose={closeFlow} />
      ) : document.status === 'failed' ? (
        <FailedView document={document} />
      ) : (
        <ProcessingView document={document} status={document.status} onClose={closeFlow} />
      )}
    </>
  );
}

function screenTitle(status: ProcessingStatus | undefined): string {
  if (status === 'completed') return '해설 완료';
  if (status === 'failed') return '분석 실패';
  return '해설 만드는 중';
}

/**
 * 처리 결과가 나오는 순간 한 번만 햅틱·스크린리더 안내.
 * 이미 끝난 문서를 열었을 때는 알리지 않는다.
 */
function useOutcomeFeedback(status: ProcessingStatus | undefined) {
  const sawProcessing = useRef(false);
  useEffect(() => {
    if (!status) return;
    if (isProcessing(status)) {
      sawProcessing.current = true;
      return;
    }
    if (!sawProcessing.current) return;
    sawProcessing.current = false;
    if (status === 'completed') {
      haptics.success();
      AccessibilityInfo.announceForAccessibility('해설이 완성됐어요.');
    } else {
      haptics.error();
      AccessibilityInfo.announceForAccessibility(`${ANALYSIS_FAILED_TITLE}.`);
    }
  }, [status]);
}

/* ------------------------------------------------------------------ */
/* 상태별 화면                                                          */
/* ------------------------------------------------------------------ */

function ProcessingView({
  document,
  status,
  onClose,
}: {
  document: MedicalDocument;
  status: Exclude<ProcessingStatus, 'completed' | 'failed'>;
  onClose: () => void;
}) {
  const progress = formatProgress(document.progress);
  return (
    <Screen
      testID="upload-progress-screen"
      footer={
        <Button
          label="닫고 기다리기"
          icon="time-outline"
          variant="secondary"
          size="lg"
          fullWidth
          onPress={onClose}
          accessibilityHint="화면을 닫아도 해설은 계속 만들어져요."
          testID="progress-close"
        />
      }>
      <StatusHero
        icon="sparkles"
        tone={{ color: 'primary', background: 'primarySoft' }}
        title="AI가 해설을 만들고 있어요"
        description={'보통 1분 안에 끝나요.\n이 화면을 닫아도 계속 진행되고, 끝나면 내 기록에서 볼 수 있어요.'}
      />

      <Card style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <AppText variant="calloutStrong">{PROCESSING_STATUS_LABEL[status]}</AppText>
          <AppText variant="calloutStrong" color="primary">
            {progress}%
          </AppText>
        </View>
        <ProgressBar value={progress / 100} accessibilityLabel="해설 진행률" />
        <Divider spacing="sm" />
        <ProcessingSteps status={status} />
      </Card>

      <UploadedDocumentCard document={document} />
    </Screen>
  );
}

function CompletedView({ document, onClose }: { document: MedicalDocument; onClose: () => void }) {
  const router = useRouter();
  // 등록 모달을 결과 화면으로 교체한다 (결과 화면에서 뒤로 가면 원래 탭으로 돌아감)
  const openResult = () => router.dismissTo({ pathname: '/documents/[id]', params: { id: document.id } });

  return (
    <Screen
      testID="upload-completed-screen"
      footer={
        <>
          <Button
            label={`${DOCUMENT_SECTION_LABEL.result} 보기`}
            icon="arrow-forward"
            iconPosition="right"
            size="lg"
            fullWidth
            onPress={openResult}
            testID="progress-open-result"
          />
          <Button label="나중에 볼게요" variant="ghost" fullWidth onPress={onClose} />
        </>
      }>
      <StatusHero
        icon="checkmark-circle"
        tone={{ color: 'normal', background: 'normalSoft' }}
        title="해설이 완성됐어요"
        description="진단명·검사 수치·처방 약을 정리하고 쉬운 말로 풀어 두었어요."
        testID="progress-completed"
      />
      {document.summary ? <AnalysisSummaryTiles summary={document.summary} /> : null}
      <UploadedDocumentCard document={document} />
      <AiDisclaimer compact />
    </Screen>
  );
}

function FailedView({ document }: { document: MedicalDocument }) {
  const router = useRouter();
  const reanalyze = useReanalyzeDocument();
  const registerAgain = REGISTER_AGAIN_ACTION[document.source];

  const retryAnalysis = () =>
    reanalyze.mutate(document.id, {
      onError: (error) => {
        haptics.error();
        notify('다시 분석하지 못했어요', getErrorMessage(error));
      },
    });

  return (
    <Screen
      testID="upload-failed-screen"
      footer={
        <>
          <Button
            label="다시 분석하기"
            icon="refresh"
            size="lg"
            fullWidth
            loading={reanalyze.isPending}
            onPress={retryAnalysis}
            testID="progress-reanalyze"
          />
          <Button
            label={registerAgain.label}
            icon={registerAgain.icon}
            variant="outline"
            fullWidth
            disabled={reanalyze.isPending}
            onPress={() => router.replace('/upload')}
            accessibilityHint="등록 방법 선택 화면으로 돌아가 새로 촬영하거나 파일을 골라요."
            testID="progress-retake"
          />
        </>
      }>
      <StatusHero
        icon="alert-circle"
        tone={{ color: 'danger', background: 'dangerSoft' }}
        title={ANALYSIS_FAILED_TITLE}
        description={failureReasonText(document)}
        testID="progress-failed"
      />
      <UploadedDocumentCard document={document} />
      {/* 촬영 요령은 사진으로 등록한 경우에만 도움이 된다 */}
      {document.source === 'pdf' ? null : <CaptureTipsCard />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressCard: { gap: Spacing.md },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
