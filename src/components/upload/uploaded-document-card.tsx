import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatDate } from '@/lib/format';
import { DOCUMENT_TYPE_LABEL } from '@/lib/labels';
import type { MedicalDocument } from '@/types/domain';

/** 방금 등록한 문서 요약 (제목 · 병원 · 진료일 · 페이지 수) */
export function UploadedDocumentCard({ document }: { document: MedicalDocument }) {
  const place = [document.hospitalName, document.department].filter(Boolean).join(' · ');
  const pages = document.source === 'pdf' ? 'PDF 파일' : `사진 ${document.pageCount}장`;
  const meta = `${formatDate(document.visitDate)} 진료 · ${DOCUMENT_TYPE_LABEL[document.documentType]} · ${pages}`;
  return (
    <Card variant="outlined" style={styles.card} testID="uploaded-document">
      <View style={styles.iconWrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Icon name="document-text-outline" size={22} color="primary" />
      </View>
      <View style={styles.texts}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {document.title}
        </AppText>
        <AppText variant="callout" color="textSecondary" numberOfLines={1}>
          {place}
        </AppText>
        <AppText variant="caption" color="textTertiary">
          {meta}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: Spacing.xxs },
});
