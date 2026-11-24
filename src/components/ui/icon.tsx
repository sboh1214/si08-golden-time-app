import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { Colors, type ColorToken } from '@/constants/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface IconProps {
  name: IconName;
  size?: number;
  /** 테마 색상 토큰 또는 임의 색상 문자열 */
  color?: ColorToken | (string & {});
  accessibilityLabel?: string;
}

/** Ionicons 래퍼. 아이콘 이름은 https://icons.expo.fyi (Ionicons) 참고 */
export function Icon({ name, size = 22, color = 'text', accessibilityLabel }: IconProps) {
  const resolved = color in Colors ? Colors[color as ColorToken] : color;
  return (
    <Ionicons
      name={name}
      size={size}
      color={resolved}
      accessibilityLabel={accessibilityLabel}
      accessible={Boolean(accessibilityLabel)}
    />
  );
}
