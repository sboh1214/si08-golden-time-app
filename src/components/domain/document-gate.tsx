import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { getErrorMessage } from '@/api/errors';
import { isGoneError } from '@/components/states/query-state';
import { ErrorState } from '@/components/states/error-state';
import { LoadingState } from '@/components/states/loading-state';
import { RefreshErrorBanner } from '@/components/states/refresh-error-banner';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Colors, Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { useAnalysis, useDocument, useReanalyzeDocument } from '@/hooks/api';
import { notify } from '@/lib/dialog';
import { haptics } from '@/lib/haptics';
import {
  ANALYSIS_FAILED_TITLE,
  PROCESSING_STATUS_LABEL,
  failureReasonText,
  formatProgress,
  isProcessing,
} from '@/lib/labels';
import type { DocumentAnalysis, MedicalDocument } from '@/types/domain';

import { ProcessingStatusBadge } from './processing-status-badge';

export interface DocumentGateProps {
  documentId: string | undefined;
  /** 문서와 해설이 모두 준비되었을 때만 호출된다 */
  children: (document: MedicalDocument, analysis: DocumentAnalysis) => ReactNode;
}

/**
 * 문서 상세 화면 공통 상태 처리.
 *
 * 문서 조회 중 → 로딩 / 조회 실패 → 오류+재시도
 * AI 처리 중 → 진행률 안내 (자동 폴링, 완료 시 자동 전환)
 * 분석 실패 → 실패 사유 + 다시 분석하기
 * 해설 조회 중/실패 → 로딩 / 오류+재시도
 * 모두 준비 → children(document, analysis)
 *
 * 전체 오류 화면은 보여 줄 데이터가 없을 때만 쓴다. 이미 받은 문서·해설이 있는데 재조회(폴링 포함)만
 * 실패하면 화면을 그대로 두고 위에 작은 안내(`RefreshErrorBanner`)를 띄운다.
 */
export function DocumentGate({ documentId, children }: DocumentGateProps) {
  const documentQuery = useDocument(documentId);
  const document = documentQuery.data;
  const analysisQuery = useAnalysis(documentId, { enabled: document?.status === 'completed' });
  const reanalyze = useReanalyzeDocument();

  if (!documentId) {
    return <ErrorState title="잘못된 접근이에요" message="진료기록 정보를 찾을 수 없어요." />;
  }
  if (documentQuery.isPending) return <LoadingState message="진료기록을 불러오는 중이에요…" />;
  // 문서가 삭제되어(404) 재조회가 실패한 경우는 이전 내용을 계속 보여 주지 않는다
  if (!document || isGoneError(documentQuery.error)) {
    return (
      <ErrorState
        error={documentQuery.error}
        onRetry={() => void documentQuery.refetch()}
        retrying={documentQuery.isRefetching}
      />
    );
  }

  /** 문서 재조회(폴링) 실패 안내 — inset: 이미 여백이 있는 가운데 정렬 카드 화면 안에 넣을 때 */
  const documentRefreshError = (inset = false) =>
    documentQuery.isError ? (
      <RefreshErrorBanner
        error={documentQuery.error}
        onRetry={() => void documentQuery.refetch()}
        retrying={documentQuery.isRefetching}
        style={inset ? styles.insetBanner : undefined}
      />
    ) : null;

  if (isProcessing(document.status)) {
    const progress = formatProgress(document.progress);
    return (
      <View style={styles.center}>
        {documentRefreshError(true)}
        <Card style={styles.card}>
          <View style={styles.iconWrap}>
            <Icon name="sparkles" size={28} color="primary" />
          </View>
          <AppText variant="heading" align="center">
            AI가 해설을 만들고 있어요
          </AppText>
          <AppText variant="callout" color="textSecondary" align="center">
            {PROCESSING_STATUS_LABEL[document.status]} · 보통 1분 안에 끝나요.{'\n'}이 화면을 닫아도 계속 진행돼요.
          </AppText>
          <ProgressBar value={progress / 100} accessibilityLabel="해설 진행률" />
          <AppText variant="captionStrong" color="primary">
            {progress}%
          </AppText>
        </Card>
      </View>
    );
  }

  if (document.status === 'failed') {
    return (
      <View style={styles.center}>
        {documentRefreshError(true)}
        <Card style={styles.card}>
          <ProcessingStatusBadge status="failed" />
          <AppText variant="heading" align="center">
            {ANALYSIS_FAILED_TITLE}
          </AppText>
          <AppText variant="callout" color="textSecondary" align="center">
            {failureReasonText(document)}
          </AppText>
          <Button
            label="다시 분석하기"
            icon="refresh"
            fullWidth
            loading={reanalyze.isPending}
            onPress={() =>
              reanalyze.mutate(document.id, {
                onError: (error) => {
                  haptics.error();
                  notify('다시 분석하지 못했어요', getErrorMessage(error));
                },
              })
            }
          />
        </Card>
      </View>
    );
  }

  if (analysisQuery.isPending) return <LoadingState message="해설을 불러오는 중이에요…" />;
  if (!analysisQuery.data || isGoneError(analysisQuery.error)) {
    return (
      <ErrorState
        error={analysisQuery.error}
        onRetry={() => void analysisQuery.refetch()}
        retrying={analysisQuery.isRefetching}
      />
    );
  }

  const refreshError =
    documentRefreshError() ??
    (analysisQuery.isError ? (
      <RefreshErrorBanner
        error={analysisQuery.error}
        onRetry={() => void analysisQuery.refetch()}
        retrying={analysisQuery.isRefetching}
      />
    ) : null);

  return (
    <>
      {refreshError}
      {children(document, analysisQuery.data)}
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    padding: ScreenPadding,
    backgroundColor: Colors.background,
  },
  card: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl },
  insetBanner: { marginHorizontal: 0, marginTop: 0, marginBottom: Spacing.md },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
