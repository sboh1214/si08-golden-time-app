import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { ANALYSIS_FAILED_TITLE, PROCESSING_STATUS_LABEL, failureReasonText, formatProgress } from '@/lib/labels';
import type { MedicalDocument } from '@/types/domain';

import { selectDocumentStatusGroups } from './select';

/** 실패 배너는 최대 이 개수까지만 표시 (나머지는 개수만 안내) */
const MAX_FAILED_BANNERS = 2;

/**
 * 홈 상단 알림: AI 해설 처리 중인 문서(진행률) · 분석에 실패한 문서.
 * 목록 쿼리가 처리 중 문서를 자동 폴링하므로 진행률이 저절로 갱신된다.
 */
export function DocumentStatusBanners({ documents }: { documents: MedicalDocument[] }) {
  const router = useRouter();
  const { processing, failed } = selectDocumentStatusGroups(documents);
  if (processing.length === 0 && failed.length === 0) return null;

  const open = (id: string) => router.push({ pathname: '/documents/[id]', params: { id } });
  const hiddenFailed = failed.length - MAX_FAILED_BANNERS;

  return (
    <View style={styles.container}>
      {processing.map((document) => {
        const progress = formatProgress(document.progress);
        return (
          <Card
            key={document.id}
            onPress={() => open(document.id)}
            variant="outlined"
            style={styles.processing}
            accessibilityLabel={`AI가 해설을 만들고 있어요. ${document.title}, ${PROCESSING_STATUS_LABEL[document.status]} ${progress}%`}
            accessibilityHint="눌러서 진행 상황을 봐요"
            testID={`home-processing-${document.id}`}>
            <View style={styles.row}>
              <View style={styles.iconCircle}>
                <Icon name="sparkles" size={20} color="primary" />
              </View>
              <View style={styles.texts}>
                <AppText variant="captionStrong" color="primary">
                  AI가 해설을 만들고 있어요
                </AppText>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {document.title}
                </AppText>
                <View style={styles.progressRow}>
                  <AppText variant="caption" color="textSecondary">
                    {PROCESSING_STATUS_LABEL[document.status]}
                  </AppText>
                  <AppText variant="captionStrong" color="primary">
                    {progress}%
                  </AppText>
                </View>
                <ProgressBar value={progress / 100} height={6} trackColor={Colors.surface} />
              </View>
              <Icon name="chevron-forward" size={18} color="textTertiary" />
            </View>
          </Card>
        );
      })}

      {failed.slice(0, MAX_FAILED_BANNERS).map((document) => (
        <Card
          key={document.id}
          onPress={() => open(document.id)}
          variant="outlined"
          style={styles.failed}
          accessibilityLabel={`분석에 실패한 기록이 있어요. ${document.title}`}
          accessibilityHint="눌러서 다시 분석할 수 있어요"
          testID={`home-failed-${document.id}`}>
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Icon name="alert-circle" size={22} color="danger" />
            </View>
            <View style={styles.texts}>
              <AppText variant="captionStrong" color="danger">
                {ANALYSIS_FAILED_TITLE} · 눌러서 다시 분석하기
              </AppText>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {document.title}
              </AppText>
              <AppText variant="caption" color="textSecondary" numberOfLines={2}>
                {failureReasonText(document)}
              </AppText>
            </View>
            <Icon name="chevron-forward" size={18} color="textTertiary" />
          </View>
        </Card>
      ))}
      {hiddenFailed > 0 ? (
        <AppText variant="caption" color="textTertiary">
          분석에 실패한 기록이 {hiddenFailed}건 더 있어요. 내 기록에서 확인해 주세요.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  processing: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
  failed: { backgroundColor: Colors.dangerSoft, borderColor: Colors.danger },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  texts: { flex: 1, gap: Spacing.xxs },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xxs,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
