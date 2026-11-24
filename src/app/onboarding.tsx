import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

import { AiDisclaimer } from '@/components/domain/ai-disclaimer';
import {
  ConsentChecklist,
  INITIAL_CONSENT,
  isConsentComplete,
  type ConsentState,
} from '@/components/onboarding/consent-checklist';
import { INTRO_PAGES } from '@/components/onboarding/intro-pages';
import { OnboardingIllustration } from '@/components/onboarding/onboarding-illustration';
import { OnboardingPage } from '@/components/onboarding/onboarding-page';
import { PageDots } from '@/components/onboarding/page-dots';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Colors, HitSize, Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useSettings } from '@/store/settings';

/** 소개 3쪽 + 동의 1쪽 */
const PAGE_COUNT = INTRO_PAGES.length + 1;
const CONSENT_PAGE = PAGE_COUNT - 1;

/**
 * 온보딩 — 첫 실행 안내 + AI 해설 고지·민감정보 처리 동의.
 *
 * 가로 페이징 ScrollView 로 넘기며, 웹처럼 스와이프가 어려운 환경을 위해
 * 이전/다음 버튼과 건너뛰기를 함께 제공한다. 필수 항목에 모두 동의해야 시작할 수 있다.
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const completeOnboarding = useSettings((s) => s.completeOnboarding);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [consent, setConsent] = useState<ConsentState>(INITIAL_CONSENT);

  const isConsentPage = index === CONSENT_PAGE;
  const canStart = isConsentComplete(consent);

  const clampPage = (page: number) => Math.min(CONSENT_PAGE, Math.max(0, page));

  const goTo = (page: number) => {
    const target = clampPage(page);
    haptics.light();
    scrollRef.current?.scrollTo({ x: target * width, animated: true });
    setIndex(target);
  };

  // 화면 폭이 바뀌면(회전·웹 창 크기 변경) 현재 쪽 위치를 다시 맞춘다
  const onLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth === width) return;
    setWidth(nextWidth);
    scrollRef.current?.scrollTo({ x: index * nextWidth, animated: false });
  };

  // 웹은 onMomentumScrollEnd 를 지원하지 않으므로 onScroll 로 현재 쪽을 계산한다
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width === 0) return;
    const page = clampPage(Math.round(event.nativeEvent.contentOffset.x / width));
    if (page !== index) setIndex(page);
  };

  const start = () => {
    if (!canStart) return;
    haptics.success();
    completeOnboarding();
    router.replace('/');
  };

  const footer = (
    <>
      <PageDots count={PAGE_COUNT} index={index} />
      {isConsentPage && !canStart ? (
        <AppText variant="caption" color="textTertiary" align="center">
          필수 항목에 모두 동의하면 시작할 수 있어요
        </AppText>
      ) : null}
      <View style={styles.actions}>
        {index > 0 ? (
          <Button
            label="이전"
            variant="outline"
            size="lg"
            onPress={() => goTo(index - 1)}
            style={styles.prev}
          />
        ) : null}
        {isConsentPage ? (
          <Button
            label="동의하고 시작하기"
            size="lg"
            icon="checkmark"
            disabled={!canStart}
            onPress={start}
            style={styles.next}
            testID="onboarding-start"
          />
        ) : (
          <Button
            label="다음"
            size="lg"
            icon="arrow-forward"
            iconPosition="right"
            onPress={() => goTo(index + 1)}
            style={styles.next}
            testID="onboarding-next"
          />
        )}
      </View>
    </>
  );

  return (
    <Screen scroll={false} padded={false} safeTop footer={footer} testID="onboarding-screen">
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Icon name="heart" size={14} color="onPrimary" />
          </View>
          <AppText variant="calloutStrong" color="primary">
            건강수첩
          </AppText>
        </View>
        {!isConsentPage ? (
          <Pressable
            onPress={() => goTo(CONSENT_PAGE)}
            accessibilityRole="button"
            accessibilityLabel="안내 건너뛰기"
            accessibilityHint="동의 화면으로 바로 이동해요"
            style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
            testID="onboarding-skip">
            <AppText variant="calloutStrong" color="textSecondary">
              건너뛰기
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.pager} onLayout={onLayout}>
        {width > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            testID="onboarding-pager">
            {INTRO_PAGES.map((page, i) => (
              <OnboardingPage
                key={page.key}
                width={width}
                eyebrow={`${i + 1} / ${INTRO_PAGES.length}`}
                title={page.title}
                description={page.description}
                illustration={<OnboardingIllustration {...page.illustration} />}
              />
            ))}
            <OnboardingPage
              width={width}
              title="시작하기 전에 확인해 주세요"
              description="건강수첩은 진료기록을 쉽게 이해하도록 돕는 참고용 서비스예요."
              illustration={
                <View style={styles.consentIcon}>
                  <Icon name="shield-checkmark" size={36} color="primary" />
                </View>
              }>
              <AiDisclaimer />
              <ConsentChecklist consent={consent} onChange={setConsent} />
            </OnboardingPage>
          </ScrollView>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: HitSize,
    paddingHorizontal: ScreenPadding,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  logo: {
    width: Spacing.xxl,
    height: Spacing.xxl,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skip: {
    minHeight: HitSize,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    marginRight: -Spacing.sm,
  },
  pressed: { opacity: 0.6 },
  pager: { flex: 1 },
  consentIcon: {
    width: 80,
    height: 80,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  prev: { minWidth: 96 },
  next: { flex: 1 },
});
