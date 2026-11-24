import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { getErrorMessage } from '@/api/errors';
import { isGoneError, type QueryLike } from '@/components/states/query-state';
import { RefreshErrorBanner } from '@/components/states/refresh-error-banner';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, Radius, Spacing, type ColorToken } from '@/constants/theme';

/**
 * 홈 섹션 단위 상태 처리.
 * 화면 전체를 덮는 `QueryState` 대신, 섹션마다 작은 로딩 자리표시·오류(다시 시도)를 보여줘
 * 한 섹션이 실패해도 나머지 홈 화면은 그대로 쓸 수 있게 한다.
 *
 * 섹션 오류 카드는 보여 줄 데이터가 없을 때만 쓴다. 이미 받은 데이터가 있는데 재조회만 실패하면
 * (TanStack v5 는 이때도 `isError`) 내용을 그대로 두고 섹션 위에 작은 안내만 띄운다.
 */
export interface SectionQueryStateProps<T> {
  query: QueryLike<T>;
  /** 로딩 중 스크린리더 안내 */
  loadingLabel: string;
  /** 로딩 자리표시 줄 수 */
  skeletonRows?: number;
  children: (data: T) => ReactNode;
}

export function SectionQueryState<T>({
  query,
  loadingLabel,
  skeletonRows = 2,
  children,
}: SectionQueryStateProps<T>) {
  if (query.isPending) return <SectionSkeleton rows={skeletonRows} label={loadingLabel} />;
  const retry = () => void query.refetch();
  const retrying = Boolean(query.isRefetching);
  if (query.data === undefined || (query.isError && isGoneError(query.error))) {
    return <SectionError error={query.error} onRetry={retry} retrying={retrying} />;
  }
  if (!query.isError) return <>{children(query.data)}</>;
  return (
    <View style={styles.stack}>
      <RefreshErrorBanner error={query.error} onRetry={retry} retrying={retrying} style={styles.inlineBanner} />
      {children(query.data)}
    </View>
  );
}

/** 은은하게 깜빡이는 자리표시 카드 */
export function SectionSkeleton({ rows = 2, label }: { rows?: number; label: string }) {
  const [opacity] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Card testID="section-skeleton">
      <Animated.View
        style={[styles.skeleton, { opacity }]}
        accessibilityRole="progressbar"
        accessibilityLabel={label}>
        {Array.from({ length: rows }, (_, index) => (
          <View key={index} style={styles.skeletonRow}>
            <View style={styles.skeletonSquare} />
            <View style={styles.skeletonLines}>
              <View style={[styles.skeletonLine, styles.skeletonLineWide]} />
              <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
            </View>
          </View>
        ))}
      </Animated.View>
    </Card>
  );
}

/** 섹션 오류 + 다시 시도 (작은 크기) */
export function SectionError({
  error,
  onRetry,
  retrying,
}: {
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <Card variant="outlined" testID="section-error">
      <View style={styles.errorRow} accessibilityRole="alert">
        <Icon name="alert-circle-outline" size={22} color="danger" />
        <AppText variant="callout" color="textSecondary" style={styles.flex}>
          {getErrorMessage(error)}
        </AppText>
      </View>
      <Button
        label="다시 시도"
        icon="refresh"
        variant="secondary"
        onPress={onRetry}
        loading={retrying}
        style={styles.retry}
      />
    </Card>
  );
}

type NoteTone = 'primary' | 'normal' | 'neutral';

const NOTE_TONE: Record<NoteTone, { fg: ColorToken; bg: ColorToken }> = {
  primary: { fg: 'primary', bg: 'primarySoft' },
  normal: { fg: 'normal', bg: 'normalSoft' },
  neutral: { fg: 'textSecondary', bg: 'surfaceMuted' },
};

/** 섹션 안내 문구 (데이터가 없거나 모두 정상일 때) */
export function SectionNote({
  icon,
  tone = 'primary',
  title,
  description,
  children,
}: {
  icon: IconName;
  tone?: NoteTone;
  title: string;
  description?: string;
  /** 문구 아래 추가 동작 (버튼 등) */
  children?: ReactNode;
}) {
  const colors = NOTE_TONE[tone];
  return (
    <Card>
      <View style={styles.noteRow}>
        <View style={[styles.noteIcon, { backgroundColor: Colors[colors.bg] }]}>
          <Icon name={icon} size={22} color={colors.fg} />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{title}</AppText>
          {description ? (
            <AppText variant="callout" color="textSecondary">
              {description}
            </AppText>
          ) : null}
        </View>
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: Spacing.sm },
  // 섹션은 이미 화면 여백 안에 있으므로 배너의 가로 여백을 뺀다
  inlineBanner: { marginHorizontal: 0, marginVertical: 0 },
  skeleton: { gap: Spacing.lg },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  skeletonSquare: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  skeletonLines: { flex: 1, gap: Spacing.sm },
  skeletonLine: { height: 12, borderRadius: Radius.sm, backgroundColor: Colors.surfaceMuted },
  skeletonLineWide: { width: '80%' },
  skeletonLineShort: { width: '45%' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  retry: { marginTop: Spacing.md, alignSelf: 'flex-start' },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  noteIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
