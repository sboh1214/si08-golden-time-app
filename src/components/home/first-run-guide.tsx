import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, Radius, Spacing, type ColorToken } from '@/constants/theme';
import { UPLOAD_CTA_LABEL } from '@/lib/labels';

const STEPS: {
  icon: IconName;
  color: ColorToken;
  background: ColorToken;
  title: string;
  description: string;
}[] = [
  {
    icon: 'camera',
    color: 'primary',
    background: 'primarySoft',
    title: '진료기록 올리기',
    description: '진료기록·검사 결과지·처방전을 찍거나 사진·PDF로 올려요.',
  },
  {
    icon: 'sparkles',
    color: 'caution',
    background: 'accentSoft',
    title: 'AI가 정리하고 풀어 줘요',
    description: '진단명·검사 수치·처방 약을 항목별로 정리하고 쉬운 말로 설명해요.',
  },
  {
    icon: 'chatbubbles',
    color: 'info',
    background: 'infoSoft',
    title: '질문 준비하기',
    description: '궁금한 점을 질문 노트에 모아 두고 다음 진료 때 물어봐요.',
  },
];

/** 첫 실행(등록한 기록이 없을 때) 안내 — 3단계 사용법 + 등록 버튼 */
export function FirstRunGuide({ onStart }: { onStart: () => void }) {
  return (
    <Card padding="xl" testID="home-first-run">
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Icon name="document-text" size={34} color="primary" />
        </View>
        <AppText variant="title" align="center">
          첫 진료기록을 등록해 보세요
        </AppText>
        <AppText variant="callout" color="textSecondary" align="center">
          어려운 진료기록도 세 단계면 쉽게 이해할 수 있어요.
        </AppText>
      </View>

      <View style={styles.steps}>
        {STEPS.map((step, index) => (
          <View
            key={step.title}
            style={styles.step}
            accessible
            accessibilityLabel={`${index + 1}단계, ${step.title}. ${step.description}`}>
            <View style={[styles.stepIcon, { backgroundColor: Colors[step.background] }]}>
              <Icon name={step.icon} size={22} color={step.color} />
            </View>
            <View style={styles.stepTexts}>
              <AppText variant="captionStrong" color="textTertiary">
                {index + 1}단계
              </AppText>
              <AppText variant="bodyStrong">{step.title}</AppText>
              <AppText variant="callout" color="textSecondary">
                {step.description}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <Button label={UPLOAD_CTA_LABEL} icon="camera" size="lg" fullWidth onPress={onStart} />
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: Spacing.sm },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  steps: { gap: Spacing.lg, marginVertical: Spacing.xxl },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTexts: { flex: 1, gap: Spacing.xxs },
});
