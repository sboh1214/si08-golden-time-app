import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { DOCUMENT_SOURCE_ICON, outlineIcon } from '@/lib/icons';
import { DOCUMENT_SOURCE_LABEL, UPLOAD_CTA_LABEL } from '@/lib/labels';
import type { DocumentSource } from '@/types/domain';

const SOURCE_ORDER: DocumentSource[] = ['camera', 'gallery', 'pdf'];
const SOURCES: { icon: IconName; label: string }[] = SOURCE_ORDER.map((source) => ({
  icon: outlineIcon(DOCUMENT_SOURCE_ICON[source]),
  label: DOCUMENT_SOURCE_LABEL[source],
}));

/** 홈 주요 동작: 진료기록 등록 */
export function UploadCtaCard({ onPress }: { onPress: () => void }) {
  return (
    <Card
      onPress={onPress}
      padding="xl"
      style={styles.card}
      accessibilityLabel={UPLOAD_CTA_LABEL}
      accessibilityHint="촬영, 사진, PDF로 진료기록을 올릴 수 있어요"
      testID="home-upload-cta">
      <View style={styles.top}>
        <View style={styles.texts}>
          <AppText variant="title" color="onPrimary">
            {UPLOAD_CTA_LABEL}
          </AppText>
          <AppText variant="callout" color="onPrimary">
            찍어서 올리면 AI가 진단·검사·약을{'\n'}쉬운 말로 정리해 드려요
          </AppText>
        </View>
        <View style={styles.iconCircle}>
          <Icon name="camera" size={30} color="primary" />
        </View>
      </View>
      <View style={styles.sources}>
        {SOURCES.map((source) => (
          <View key={source.label} style={styles.source}>
            <Icon name={source.icon} size={16} color="onPrimary" />
            <AppText variant="captionStrong" color="onPrimary">
              {source.label}
            </AppText>
          </View>
        ))}
        <View style={styles.arrow}>
          <Icon name="arrow-forward" size={22} color="onPrimary" />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.primary, gap: Spacing.lg },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  texts: { flex: 1, gap: Spacing.xs },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sources: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryPressed,
  },
  arrow: { marginLeft: 'auto' },
});
