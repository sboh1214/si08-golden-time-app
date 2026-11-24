import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatDateLong } from '@/lib/format';
import { DOCUMENT_SOURCE_ICON, DOCUMENT_TYPE_ICON, outlineIcon } from '@/lib/icons';
import { DOCUMENT_SOURCE_LABEL, DOCUMENT_TYPE_LABEL } from '@/lib/labels';
import type { MedicalDocument } from '@/types/domain';

export interface DocumentHeaderProps {
  document: MedicalDocument;
}

/** 정리 결과 화면 최상단 — 어떤 문서인지(병원·진료일·종류·등록 방식) 한눈에 보여준다 */
export function DocumentHeader({ document }: DocumentHeaderProps) {
  const typeLabel = DOCUMENT_TYPE_LABEL[document.documentType];
  // 내 기록 목록의 미리보기 타일과 같은 모양의 외곽선 버전 (계약에 없는 종류는 기본 문서 모양)
  const typeIcon = outlineIcon(DOCUMENT_TYPE_ICON[document.documentType] ?? 'document');
  const sourceIcon = outlineIcon(DOCUMENT_SOURCE_ICON[document.source] ?? 'document');
  const place = document.department ? `${document.hospitalName} · ${document.department}` : document.hospitalName;
  const visitDate = formatDateLong(document.visitDate);
  // 저장된 미리보기 주소가 더 이상 열리지 않으면(웹 blob: URL 만료, 캐시 정리 등) 빈 상자 대신 미리보기를 숨긴다.
  // 주소가 바뀌면(다시 불러오기) 새 주소로 다시 시도한다.
  const [failedThumbnailUri, setFailedThumbnailUri] = useState<string>();
  const thumbnailUri = document.thumbnailUri !== failedThumbnailUri ? document.thumbnailUri : undefined;

  return (
    <Card>
      <View style={styles.top}>
        <View style={styles.texts}>
          <View style={styles.typeRow}>
            <View style={styles.typeIcon}>
              <Icon name={typeIcon} size={16} color="primary" />
            </View>
            <AppText variant="captionStrong" color="primary">
              {typeLabel}
            </AppText>
          </View>
          <AppText variant="title" accessibilityRole="header">
            {document.title}
          </AppText>
        </View>
        {thumbnailUri ? (
          <Image
            source={{ uri: thumbnailUri }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={150}
            onError={() => setFailedThumbnailUri(thumbnailUri)}
            accessibilityLabel="등록한 진료기록 첫 페이지 미리보기"
          />
        ) : null}
      </View>

      <View style={styles.meta}>
        <MetaLine icon="business-outline" text={place} />
        <MetaLine icon="calendar-outline" text={visitDate} />
      </View>

      <View style={styles.badges}>
        <Badge label={`${document.pageCount}쪽`} icon="documents-outline" />
        <Badge label={`${DOCUMENT_SOURCE_LABEL[document.source]} 등록`} icon={sourceIcon} />
      </View>
    </Card>
  );
}

function MetaLine({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.metaLine}>
      <Icon name={icon} size={18} color="textTertiary" />
      <AppText variant="callout" color="textSecondary" style={styles.metaText}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', gap: Spacing.md },
  texts: { flex: 1, gap: Spacing.sm },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  typeIcon: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnail: {
    width: 64,
    height: 84,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  meta: { marginTop: Spacing.md, gap: Spacing.xs },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  metaText: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
});
