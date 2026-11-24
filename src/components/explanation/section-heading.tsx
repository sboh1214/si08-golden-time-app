import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

import { getSectionHint } from './derive';

const MARKER_WIDTH = 4;

export interface SectionHeadingProps {
  /** 진료기록 구역 이름 (예: 현병력) */
  title: string;
  count: number;
}

/** 구역 제목 — 의학 용어인 구역 이름 옆에 쉬운 설명을 함께 보여준다 */
export const SectionHeading = memo(function SectionHeading({ title, count }: SectionHeadingProps) {
  const hint = getSectionHint(title);
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${title}${hint ? `, ${hint}` : ''}, 문장 ${count}개`}>
      <View style={styles.titleRow}>
        <View style={styles.marker} />
        <AppText variant="heading">{title}</AppText>
        <AppText variant="captionStrong" color="textTertiary">
          {`${count}문장`}
        </AppText>
      </View>
      {hint ? (
        <AppText variant="caption" color="textSecondary" style={styles.hint}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.xxs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  marker: {
    width: MARKER_WIDTH,
    height: 18,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  // 제목 글자와 시작선을 맞춘다
  hint: { marginLeft: MARKER_WIDTH + Spacing.sm },
});
