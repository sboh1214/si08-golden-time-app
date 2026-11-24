import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { ScreenPadding, Spacing } from '@/constants/theme';

export interface OnboardingPageProps {
  /** 페이지 너비 (가로 페이징 단위) */
  width: number;
  /** 단계 표시 (예: "1 / 3") */
  eyebrow?: string;
  title: string;
  description: string;
  /** 상단 그림 */
  illustration?: ReactNode;
  /** 설명 아래 추가 내용 (동의 항목 등) */
  children?: ReactNode;
  testID?: string;
}

/**
 * 온보딩 한 페이지.
 * 글자 크게 보기·작은 화면에서도 잘리지 않도록 페이지마다 세로 스크롤을 둔다.
 */
export function OnboardingPage({
  width,
  eyebrow,
  title,
  description,
  illustration,
  children,
  testID,
}: OnboardingPageProps) {
  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID={testID}>
      {illustration ? <View style={styles.illustration}>{illustration}</View> : null}
      <View style={styles.texts}>
        {eyebrow ? (
          <AppText variant="captionStrong" color="primary" align="center">
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant="title" align="center" accessibilityRole="header">
          {title}
        </AppText>
        <AppText variant="body" color="textSecondary" align="center">
          {description}
        </AppText>
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: Spacing.xxl,
    paddingHorizontal: ScreenPadding,
    paddingVertical: Spacing.xl,
  },
  illustration: { alignItems: 'center' },
  texts: { gap: Spacing.sm },
});
