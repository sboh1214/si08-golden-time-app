import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, Radius, Spacing, type ColorToken } from '@/constants/theme';
import { DOCUMENT_TYPE_ICON } from '@/lib/icons';
import type { DocumentType, MedicalDocument } from '@/types/domain';

/** 문서 종류별 아이콘 타일 (미리보기 이미지가 없을 때) */
export const DOCUMENT_TYPE_VISUAL: Record<
  DocumentType,
  { icon: IconName; color: ColorToken; background: ColorToken }
> = {
  medical_record: { icon: DOCUMENT_TYPE_ICON.medical_record, color: 'primary', background: 'primarySoft' },
  lab_result: { icon: DOCUMENT_TYPE_ICON.lab_result, color: 'info', background: 'infoSoft' },
  prescription: { icon: DOCUMENT_TYPE_ICON.prescription, color: 'caution', background: 'cautionSoft' },
  opinion: { icon: DOCUMENT_TYPE_ICON.opinion, color: 'normal', background: 'normalSoft' },
  discharge_summary: { icon: DOCUMENT_TYPE_ICON.discharge_summary, color: 'low', background: 'lowSoft' },
  other: { icon: DOCUMENT_TYPE_ICON.other, color: 'textSecondary', background: 'surfaceMuted' },
};

export interface DocumentThumbnailProps {
  document: Pick<MedicalDocument, 'documentType' | 'source' | 'pageCount' | 'thumbnailUri'>;
  size?: number;
}

/**
 * 문서 미리보기.
 * 첫 페이지 이미지가 있으면 이미지를, 없거나(PDF 등) 불러오지 못하면 문서 종류 아이콘을 보여준다.
 * 카드 전체에 접근성 라벨이 있으므로 이 요소는 스크린리더에서 숨긴다.
 */
export function DocumentThumbnail({ document, size = 64 }: DocumentThumbnailProps) {
  const [failed, setFailed] = useState(false);
  // 계약에 없는 문서 종류가 와도 화면이 깨지지 않도록 '기타' 모양으로 표시
  const visual = DOCUMENT_TYPE_VISUAL[document.documentType] ?? DOCUMENT_TYPE_VISUAL.other;
  const showImage = Boolean(document.thumbnailUri) && !failed;
  const tag = document.source === 'pdf' ? 'PDF' : document.pageCount > 1 ? `${document.pageCount}장` : null;

  return (
    <View
      style={[styles.tile, { width: size, height: size, backgroundColor: Colors[visual.background] }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {showImage ? (
        <Image
          source={{ uri: document.thumbnailUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          onError={() => setFailed(true)}
        />
      ) : (
        <Icon name={visual.icon} size={Math.round(size * 0.44)} color={visual.color} />
      )}
      {tag ? (
        <View style={styles.tag}>
          <AppText variant="caption" color="textInverse">
            {tag}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tag: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    borderTopLeftRadius: Radius.sm,
    backgroundColor: Colors.overlay,
  },
});
