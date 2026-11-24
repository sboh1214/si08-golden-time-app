import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, HitSize, Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { formatBytes } from '@/lib/format';
import type { DocumentFile } from '@/types/domain';

/** 썸네일 크기 (A4 세로 비율에 가깝게) */
const TILE_WIDTH = 104;
const TILE_HEIGHT = 140;

export interface PageThumbnailsProps {
  files: DocumentFile[];
  /** 입력 잠금 (업로드 중) */
  disabled?: boolean;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
  /** 마지막 '추가' 타일. 없으면 표시하지 않는다 */
  addAction?: {
    label: string;
    caption?: string;
    icon: IconName;
    onPress: () => void;
    loading?: boolean;
  };
}

/**
 * 선택한 페이지 미리보기 (가로 스크롤).
 * 페이지 번호 · 빼기(X) · 순서 바꾸기(‹ ›) · 페이지 추가를 제공한다.
 */
export function PageThumbnails({ files, disabled = false, onRemove, onMove, addAction }: PageThumbnailsProps) {
  const reorderable = files.length > 1;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      testID="upload-pages">
      {files.map((file, index) => (
        <View key={file.uri} style={styles.item}>
          <PageTile file={file} pageNumber={index + 1} disabled={disabled} onRemove={() => onRemove(index)} />
          {reorderable ? (
            <View style={styles.moveRow}>
              <MoveButton
                icon="chevron-back"
                label={`${index + 1}쪽을 앞으로 옮기기`}
                disabled={disabled || index === 0}
                onPress={() => onMove(index, index - 1)}
              />
              <MoveButton
                icon="chevron-forward"
                label={`${index + 1}쪽을 뒤로 옮기기`}
                disabled={disabled || index === files.length - 1}
                onPress={() => onMove(index, index + 1)}
              />
            </View>
          ) : null}
        </View>
      ))}
      {addAction ? (
        <Pressable
          onPress={addAction.onPress}
          disabled={disabled || addAction.loading}
          accessibilityRole="button"
          accessibilityLabel={addAction.caption ? `${addAction.label}, ${addAction.caption}` : addAction.label}
          accessibilityState={{ disabled: disabled || addAction.loading, busy: addAction.loading }}
          style={({ pressed }) => [styles.addTile, pressed && styles.pressed, disabled && styles.dimmed]}
          testID="upload-add-page">
          {addAction.loading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Icon name={addAction.icon} size={28} color="primary" />
          )}
          <AppText variant="calloutStrong" color="primary" align="center">
            {addAction.label}
          </AppText>
          {addAction.caption ? (
            <AppText variant="caption" color="textTertiary" align="center">
              {addAction.caption}
            </AppText>
          ) : null}
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function PageTile({
  file,
  pageNumber,
  disabled,
  onRemove,
}: {
  file: DocumentFile;
  pageNumber: number;
  disabled: boolean;
  onRemove: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const isImage = file.mimeType.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';

  return (
    <View style={styles.tile}>
      <View
        style={styles.preview}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${pageNumber}쪽 미리보기${isPdf ? `, PDF 파일 ${file.name}` : ''}`}>
        {isImage && !failed ? (
          <Image
            source={{ uri: file.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
            onError={() => setFailed(true)}
          />
        ) : (
          <View style={styles.fileInfo}>
            <Icon name={isPdf ? 'document-text' : 'image-outline'} size={34} color={isPdf ? 'caution' : 'textTertiary'} />
            <AppText variant="caption" color="textSecondary" align="center" numberOfLines={2}>
              {isImage ? '미리보기 없음' : file.name}
            </AppText>
            {file.size !== undefined ? (
              <AppText variant="caption" color="textTertiary">
                {formatBytes(file.size)}
              </AppText>
            ) : null}
          </View>
        )}
        <View style={styles.pageBadge}>
          <AppText variant="captionStrong" color="textInverse">
            {pageNumber}
          </AppText>
        </View>
      </View>
      <Pressable
        onPress={onRemove}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${pageNumber}쪽 빼기`}
        accessibilityState={{ disabled }}
        hitSlop={8}
        style={({ pressed }) => [styles.removeButton, pressed && styles.pressed, disabled && styles.dimmed]}
        testID={`upload-remove-page-${pageNumber}`}>
        <Icon name="close" size={16} color="textInverse" />
      </Pressable>
    </View>
  );
}

function MoveButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.moveButton, pressed && styles.pressed, disabled && styles.moveDisabled]}>
      <Icon name={icon} size={20} color={disabled ? 'textTertiary' : 'text'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 화면 좌우 여백 밖까지 스크롤되도록 여백을 상쇄하고 콘텐츠에 다시 준다
  scroll: { marginHorizontal: -ScreenPadding, flexGrow: 0 },
  content: { paddingHorizontal: ScreenPadding, gap: Spacing.md, alignItems: 'flex-start' },
  item: { width: TILE_WIDTH, gap: Spacing.xs },
  tile: { width: TILE_WIDTH, height: TILE_HEIGHT },
  preview: {
    flex: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderStrong,
  },
  fileInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    padding: Spacing.sm,
  },
  pageBadge: {
    position: 'absolute',
    left: Spacing.xs,
    bottom: Spacing.xs,
    minWidth: 24,
    height: 24,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.pill,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moveButton: {
    width: (TILE_WIDTH - Spacing.xs) / 2,
    height: HitSize,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveDisabled: { opacity: 0.4 },
  addTile: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    padding: Spacing.sm,
  },
  pressed: { opacity: 0.7 },
  dimmed: { opacity: 0.45 },
});
