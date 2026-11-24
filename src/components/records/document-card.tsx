import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ProcessingStatusBadge } from '@/components/domain/processing-status-badge';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Spacing } from '@/constants/theme';
import { formatDate, formatDateLong } from '@/lib/format';
import {
  DOCUMENT_SECTION_LABEL,
  DOCUMENT_TYPE_LABEL,
  PROCESSING_STATUS_LABEL,
  SUMMARY_ITEM_LABEL,
  abnormalCountText,
  failureReasonText,
  formatProgress,
  isProcessing,
} from '@/lib/labels';
import type { DocumentSummaryCounts, MedicalDocument } from '@/types/domain';

import { DocumentThumbnail } from './document-thumbnail';

export interface DocumentCardProps {
  document: MedicalDocument;
  /** 지정하지 않으면 문서 상세(정리 결과) 화면으로 이동한다 */
  onPress?: () => void;
}

interface SummaryPart {
  key: 'diagnosis' | 'lab' | 'medication';
  text: string;
}

/** 정리 결과 항목별 개수 — 예: 진단 2 / 검사 12 / 처방 약 2 (개수가 0인 항목은 생략) */
function summaryParts(summary: DocumentSummaryCounts): SummaryPart[] {
  const parts: (SummaryPart & { count: number })[] = [
    {
      key: 'diagnosis',
      text: `${SUMMARY_ITEM_LABEL.diagnosis} ${summary.diagnosisCount}`,
      count: summary.diagnosisCount,
    },
    { key: 'lab', text: `${SUMMARY_ITEM_LABEL.lab} ${summary.labCount}`, count: summary.labCount },
    {
      key: 'medication',
      text: `${SUMMARY_ITEM_LABEL.medication} ${summary.medicationCount}`,
      count: summary.medicationCount,
    },
  ];
  return parts.filter((part) => part.count > 0);
}

/** 스크린리더용 요약 문장 */
function describeSummary(summary: DocumentSummaryCounts | undefined): string {
  if (!summary) return '';
  const parts = summaryParts(summary);
  if (parts.length === 0) return '정리된 항목이 없어요';
  const abnormal = summary.abnormalLabCount > 0 ? `, 확인이 필요한 검사 ${summary.abnormalLabCount}개` : '';
  return `${parts.map((part) => part.text).join(', ')}${abnormal}`;
}

/** 진료기록 1건 카드 (내 기록 목록·홈 최근 기록에서 공용) */
export function DocumentCard({ document, onPress }: DocumentCardProps) {
  const router = useRouter();
  const processing = isProcessing(document.status);
  const meta = [document.hospitalName, document.department].filter(Boolean).join(' · ');
  const progress = formatProgress(document.progress);
  const statusText = processing
    ? `${PROCESSING_STATUS_LABEL[document.status]} ${progress}%`
    : PROCESSING_STATUS_LABEL[document.status];
  const summaryText = document.status === 'completed' ? describeSummary(document.summary) : '';

  const handlePress =
    onPress ?? (() => router.push({ pathname: '/documents/[id]', params: { id: document.id } }));

  return (
    <Card
      onPress={handlePress}
      accessibilityLabel={[
        document.title,
        meta,
        `진료일 ${formatDateLong(document.visitDate)}`,
        DOCUMENT_TYPE_LABEL[document.documentType],
        statusText,
        summaryText,
      ]
        .filter(Boolean)
        .join(', ')}
      accessibilityHint={processing ? '눌러서 진행 상황을 봐요' : `눌러서 ${DOCUMENT_SECTION_LABEL.result}를 봐요`}
      testID={`document-card-${document.id}`}>
      <View style={styles.row}>
        <DocumentThumbnail document={document} />
        <View style={styles.body}>
          <AppText variant="caption" color="textTertiary">
            {formatDate(document.visitDate)} · {DOCUMENT_TYPE_LABEL[document.documentType]}
          </AppText>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {document.title}
          </AppText>
          {meta ? (
            <AppText variant="callout" color="textSecondary" numberOfLines={1}>
              {meta}
            </AppText>
          ) : null}
          <View style={styles.statusRow}>
            <ProcessingStatusBadge status={document.status} />
            {processing ? (
              <AppText variant="captionStrong" color="primary">
                {progress}%
              </AppText>
            ) : null}
          </View>
          {processing ? (
            <ProgressBar value={progress / 100} height={6} accessibilityLabel="해설 진행률" />
          ) : null}
          {document.status === 'completed' && document.summary ? (
            <DocumentSummaryLine summary={document.summary} />
          ) : null}
          {document.status === 'failed' ? (
            <AppText variant="caption" color="textSecondary" numberOfLines={2}>
              {failureReasonText(document)}
            </AppText>
          ) : null}
        </View>
        <Icon name="chevron-forward" size={18} color="textTertiary" />
      </View>
    </Card>
  );
}

/** "진단 2 · 검사 12 (확인 필요 3개) · 처방 약 2" — 확인 필요 개수는 글자로도 표시해 색에만 의존하지 않는다 */
function DocumentSummaryLine({ summary }: { summary: DocumentSummaryCounts }) {
  const parts = summaryParts(summary);
  if (parts.length === 0) {
    return (
      <AppText variant="caption" color="textTertiary">
        정리된 항목이 없어요
      </AppText>
    );
  }
  return (
    <AppText variant="caption" color="textSecondary">
      {parts.map((part, index) => (
        <AppText key={part.key} variant="caption" color="textSecondary">
          {index > 0 ? ' · ' : ''}
          {part.text}
          {part.key === 'lab' && summary.abnormalLabCount > 0 ? (
            <AppText variant="captionStrong" color="high">
              {` (${abnormalCountText(summary.abnormalLabCount)})`}
            </AppText>
          ) : null}
        </AppText>
      ))}
    </AppText>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  body: { flex: 1, gap: Spacing.xs },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xxs },
});
