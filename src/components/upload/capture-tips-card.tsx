import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';

const TIPS: { icon: IconName; text: string }[] = [
  { icon: 'sunny-outline', text: '밝은 곳에서 찍어 주세요.' },
  { icon: 'contrast-outline', text: '그림자나 빛 반사가 글자를 가리지 않게 해 주세요.' },
  { icon: 'scan-outline', text: '종이의 네 모서리가 모두 화면에 보이게 찍어 주세요.' },
  { icon: 'layers-outline', text: '여러 장이면 첫 장부터 순서대로 찍어 주세요.' },
];

/** 인식률을 높이기 위한 촬영 요령 */
export function CaptureTipsCard() {
  return (
    <Card variant="muted" style={styles.card}>
      <View style={styles.header}>
        <Icon name="bulb-outline" size={20} color="accent" />
        <AppText variant="bodyStrong" accessibilityRole="header">
          잘 찍는 팁
        </AppText>
      </View>
      <View style={styles.list}>
        {TIPS.map((tip) => (
          <View key={tip.text} style={styles.row}>
            <View style={styles.iconWrap}>
              <Icon name={tip.icon} size={16} color="primary" />
            </View>
            <AppText variant="callout" color="textSecondary" style={styles.text}>
              {tip.text}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  list: { gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, paddingTop: 3 },
});
