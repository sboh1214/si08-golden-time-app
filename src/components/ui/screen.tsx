import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, MaxContentWidth, MaxContentWidthWide, ScreenPadding, Spacing } from '@/constants/theme';

export interface ScreenProps {
  children: ReactNode;
  /** false 면 스크롤 없이 고정 (FlatList 를 직접 쓰는 화면 등) */
  scroll?: boolean;
  /** 좌우 기본 여백 적용 (기본 true) */
  padded?: boolean;
  /** 하단 고정 영역 (예: 주요 CTA 버튼). 안전 영역 여백이 자동 적용된다. */
  footer?: ReactNode;
  /** 당겨서 새로고침 */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** 헤더가 없는 화면(온보딩 등)에서 상단 안전 영역 적용 */
  safeTop?: boolean;
  /** 탭 화면처럼 하단 탭바가 있는 경우 false (기본 false: 탭바가 안전 영역을 처리) */
  safeBottom?: boolean;
  /** 키보드 입력이 있는 화면 */
  keyboard?: boolean;
  /** 2단 배치 화면: 최대 폭을 넓힌다 (MaxContentWidthWide) */
  wide?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * 모든 화면의 기본 컨테이너.
 * - 배경색·좌우 여백·최대 폭(태블릿/웹)·하단 CTA·당겨서 새로고침을 통일한다.
 * - 루트 Stack 헤더는 불투명이므로 콘텐츠는 헤더 아래에서 시작한다.
 */
export function Screen({
  children,
  scroll = true,
  padded = true,
  footer,
  refreshing,
  onRefresh,
  safeTop = false,
  safeBottom = false,
  keyboard = false,
  wide = false,
  contentStyle,
  testID,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const inner = [
    styles.inner,
    wide && styles.wide,
    padded && styles.padded,
    safeTop && { paddingTop: insets.top + Spacing.lg },
    contentStyle,
  ];

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        inner,
        styles.scrollContent,
        !footer && safeBottom && { paddingBottom: insets.bottom + Spacing.xxl },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={Colors.primary} />
        ) : undefined
      }>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, inner, !footer && safeBottom && { paddingBottom: insets.bottom }]}>{children}</View>
  );

  const content = (
    <View style={styles.root} testID={testID}>
      {body}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
          <View style={styles.footerInner}>{footer}</View>
        </View>
      ) : null}
    </View>
  );

  if (keyboard) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
        {content}
      </KeyboardAvoidingView>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  wide: { maxWidth: MaxContentWidthWide },
  padded: { paddingHorizontal: ScreenPadding },
  scrollContent: { paddingTop: Spacing.lg, paddingBottom: Spacing.huge, gap: Spacing.xxl },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingTop: Spacing.md,
    paddingHorizontal: ScreenPadding,
  },
  footerInner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.sm },
});
