import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, Radius, Shadow, type ColorToken } from '@/constants/theme';

export interface OnboardingIllustrationProps {
  /** 가운데 큰 아이콘 */
  icon: IconName;
  /** 주변을 둘러싼 작은 아이콘 (최대 3개: 왼쪽 위 · 오른쪽 위 · 아래) */
  satellites: readonly IconName[];
  color: ColorToken;
  background: ColorToken;
  size?: number;
}

/** 위성 아이콘 배치 (원 지름 대비 비율) */
const SATELLITE_POSITIONS = [
  { left: 0.02, top: 0.12 },
  { left: 0.74, top: 0.04 },
  { left: 0.7, top: 0.72 },
] as const;

/**
 * 이미지 파일 없이 아이콘을 겹쳐 만든 안내 일러스트.
 * 연한 색 원 위에 큰 아이콘, 주변에 작은 아이콘 배지를 띄운다. (장식용 — 스크린리더에서 숨김)
 */
export function OnboardingIllustration({
  icon,
  satellites,
  color,
  background,
  size = 220,
}: OnboardingIllustrationProps) {
  const inner = Math.round(size * 0.56);
  const satellite = Math.round(size * 0.24);
  return (
    <View
      style={[styles.outer, { width: size, height: size, backgroundColor: Colors[background] }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={[styles.inner, { width: inner, height: inner }]}>
        <Icon name={icon} size={Math.round(inner * 0.46)} color={color} />
      </View>
      {satellites.slice(0, SATELLITE_POSITIONS.length).map((name, index) => {
        const position = SATELLITE_POSITIONS[index];
        return (
          <View
            key={name}
            style={[
              styles.satellite,
              {
                width: satellite,
                height: satellite,
                left: position.left * size,
                top: position.top * size,
              },
            ]}>
            <Icon name={name} size={Math.round(satellite * 0.48)} color={color} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow,
  },
  satellite: {
    position: 'absolute',
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow,
  },
});
