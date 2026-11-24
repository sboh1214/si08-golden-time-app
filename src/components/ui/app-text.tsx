import { StyleSheet, Text, type TextProps } from 'react-native';

import { Colors, Typography, type ColorToken, type TypographyVariant } from '@/constants/theme';
import { useSettings } from '@/store/settings';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  /** 테마 색상 토큰 (기본 text) 또는 임의 색상 문자열 */
  color?: ColorToken | (string & {});
  align?: 'left' | 'center' | 'right';
  /** 설정의 '글자 크게 보기'를 따를지 (해설 본문 등) */
  scalable?: boolean;
}

const LARGE_SCALE = 1.18;

/** 앱 공통 텍스트. 폰트 크기·색상은 반드시 variant/color 토큰으로 지정한다. */
export function AppText({
  variant = 'body',
  color = 'text',
  align,
  scalable = false,
  style,
  ...rest
}: AppTextProps) {
  const largeText = useSettings((s) => s.largeText);
  const base = Typography[variant];
  const scale = scalable && largeText ? LARGE_SCALE : 1;
  const resolved = color in Colors ? Colors[color as ColorToken] : color;
  return (
    <Text
      style={[
        styles.base,
        {
          fontSize: Math.round(base.fontSize * scale),
          lineHeight: Math.round(base.lineHeight * scale),
          fontWeight: base.fontWeight,
          color: resolved,
        },
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: { letterSpacing: -0.2 },
});
