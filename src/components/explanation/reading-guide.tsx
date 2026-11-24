import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';

import type { ExplanationLayout } from './layout';

export interface ReadingGuideProps {
  layout: ExplanationLayout;
  /** 나란히 보기를 골랐지만 화면이 좁아 위아래로 보여 주는 중 */
  autoStacked?: boolean;
  sentenceCount: number;
  termCount: number;
  /** 의료진 확인 권장 문장 수 */
  cautionCount: number;
}

/** 화면 상단 "이렇게 읽어요" 안내 + 문장·용어 개수 */
export function ReadingGuide({
  layout,
  autoStacked = false,
  sentenceCount,
  termCount,
  cautionCount,
}: ReadingGuideProps) {
  const tips = [
    layout === 'side'
      ? '왼쪽은 진료기록 원문, 오른쪽은 쉽게 풀어 쓴 해설이에요.'
      : '위는 진료기록 원문, 아래는 쉽게 풀어 쓴 해설이에요.',
    '밑줄 친 의학 용어나 문장 아래 용어 버튼을 누르면 뜻을 볼 수 있어요.',
    autoStacked
      ? '화면이 좁아 원문과 해설을 위아래로 보여 드려요. 글자 크게 보기를 끄거나 화면이 넓어지면 나란히 볼 수 있어요.'
      : '오른쪽 위 버튼으로 보는 방식과 글자 크기를 바꿀 수 있어요.',
  ];
  if (cautionCount > 0) {
    tips.push("'의료진 확인 권장' 표시가 있는 문장은 진료 때 꼭 확인하세요.");
  }

  return (
    <Card variant="outlined" padding="lg" style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.iconWrap}>
          <Icon name="bulb-outline" size={18} color="caution" />
        </View>
        <AppText variant="bodyStrong" accessibilityRole="header">
          이렇게 읽어요
        </AppText>
      </View>

      <View style={styles.tips}>
        {tips.map((tip) => (
          <View key={tip} style={styles.tipRow}>
            <View style={styles.bullet} />
            <AppText variant="callout" color="textSecondary" scalable style={styles.tipText}>
              {tip}
            </AppText>
          </View>
        ))}
      </View>

      <View style={styles.counts}>
        <Badge label={`문장 ${sentenceCount}개`} icon="document-text-outline" size="md" />
        <Badge label={`어려운 용어 ${termCount}개`} tone="accent" icon="book-outline" size="md" />
        {cautionCount > 0 ? (
          <Badge label={`확인 권장 ${cautionCount}개`} tone="caution" icon="alert-circle" size="md" />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tips: { gap: Spacing.xs },
  tipRow: { flexDirection: 'row', gap: Spacing.sm },
  // 본문 첫 줄 가운데에 맞춘 글머리 점 (callout 줄 높이 22 기준)
  bullet: {
    width: 5,
    height: 5,
    marginTop: 9,
    borderRadius: Radius.pill,
    backgroundColor: Colors.textTertiary,
  },
  tipText: { flex: 1 },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
