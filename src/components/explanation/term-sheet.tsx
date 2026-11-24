import { useEffect, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Colors, HitSize, MaxContentWidth, Radius, ScreenPadding, Spacing } from '@/constants/theme';
import type { GlossaryTerm } from '@/types/domain';

export interface TermSheetProps {
  /** 보여줄 용어 (null 이면 닫힘) */
  term: GlossaryTerm | null;
  onClose: () => void;
}

/** 시트가 아래에서 올라오는 거리 */
const SLIDE_DISTANCE = 48;
const SLIDE_DURATION_MS = 220;

/**
 * 의학 용어 풀이 바텀시트.
 * React Native 기본 Modal 로 만들어 iOS·Android·웹에서 똑같이 동작한다.
 * (배경 누르기, Android 뒤로 가기, 웹 Esc 키로 닫힘)
 */
export function TermSheet({ term, onClose }: TermSheetProps) {
  const insets = useSafeAreaInsets();
  const [translateY] = useState(() => new Animated.Value(SLIDE_DISTANCE));
  const visible = term !== null;

  // 닫히는 애니메이션 동안 내용이 비지 않도록 마지막 용어를 유지한다
  const [shownTerm, setShownTerm] = useState<GlossaryTerm | null>(term);
  if (term !== null && term !== shownTerm) setShownTerm(term);

  useEffect(() => {
    if (!visible) return;
    translateY.setValue(SLIDE_DISTANCE);
    const animation = Animated.timing(translateY, {
      toValue: 0,
      duration: SLIDE_DURATION_MS,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [visible, translateY]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          // 배경 누르기는 터치 전용 — 스크린리더·키보드는 닫기 버튼을 쓴다
          accessible={false}
          focusable={false}
        />
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.sm, transform: [{ translateY }] },
          ]}
          accessibilityViewIsModal>
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <View style={styles.eyebrow}>
                <Icon name="book-outline" size={16} color="caution" />
                <AppText variant="captionStrong" color="textSecondary">
                  용어 풀이
                </AppText>
              </View>
              <AppText variant="title" accessibilityRole="header" selectable>
                {shownTerm?.term}
              </AppText>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="용어 풀이 닫기"
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <Icon name="close" size={22} color="textSecondary" />
            </Pressable>
          </View>

          <View style={styles.meaningBox}>
            <AppText variant="body" scalable selectable>
              {shownTerm?.meaning || '이 용어의 풀이가 아직 없어요. 진료 때 의료진에게 뜻을 물어보세요.'}
            </AppText>
          </View>

          <Button label="확인했어요" onPress={onClose} fullWidth size="lg" />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: ScreenPadding,
    paddingTop: Spacing.xl,
    gap: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  titleWrap: { flex: 1, gap: Spacing.xs },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  closeButton: {
    width: HitSize,
    height: HitSize,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceMuted,
  },
  pressed: { opacity: 0.7 },
  meaningBox: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
  },
});
