/**
 * 건강수첩 디자인 토큰.
 *
 * - 고령 환자도 읽기 쉽도록 기본 본문 17pt, 충분한 대비(WCAG AA 이상)를 기준으로 한다.
 *   글자색 토큰은 surface·surfaceMuted·background·각 *Soft 배경 위에서 4.5:1 이상이어야 한다
 *   (`src/constants/__tests__/theme.test.ts` 가 검사).
 * - 앱은 라이트 테마 단일 모드로 운영한다(app.json `userInterfaceStyle: "light"`).
 * - 화면 코드에서는 색상·간격 값을 직접 쓰지 말고 이 파일의 토큰만 사용한다.
 */
import { Platform } from 'react-native';

export const Colors = {
  /** 브랜드 주색 (딥 틸) */
  primary: '#0E7C6B',
  primaryPressed: '#0A6556',
  primarySoft: '#E7F4F1',
  onPrimary: '#FFFFFF',

  /** 골든타임 포인트 색 (앰버) */
  accent: '#E8A317',
  accentSoft: '#FDF4E1',
  /** accentSoft 위 글자·아이콘용 진한 앰버 */
  accentStrong: '#8A5A00',

  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceMuted: '#F0F2F5',
  border: '#E3E6EB',
  borderStrong: '#C9CED6',

  text: '#16191D',
  textSecondary: '#4D5562',
  textTertiary: '#5F6670',
  textInverse: '#FFFFFF',

  /** 검사 수치·상태 표현 */
  normal: '#16703D',
  normalSoft: '#E6F5EC',
  high: '#B42F2F',
  highSoft: '#FCEBEB',
  low: '#2560C0',
  lowSoft: '#E8F0FC',
  caution: '#8F5600',
  cautionSoft: '#FFF3DF',
  critical: '#A11D1D',

  danger: '#B42F2F',
  dangerSoft: '#FCEBEB',
  info: '#2560C0',
  infoSoft: '#E8F0FC',

  overlay: 'rgba(16, 20, 24, 0.45)',
} as const;

export type ColorToken = keyof typeof Colors;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

/** 화면 좌우 기본 여백 */
export const ScreenPadding = Spacing.xl;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * 타이포그래피 스케일. `AppText`의 `variant` 와 1:1 대응한다.
 */
export const Typography = {
  display: { fontSize: 28, lineHeight: 36, fontWeight: FontWeight.bold },
  title: { fontSize: 22, lineHeight: 30, fontWeight: FontWeight.bold },
  heading: { fontSize: 19, lineHeight: 26, fontWeight: FontWeight.semibold },
  body: { fontSize: 17, lineHeight: 26, fontWeight: FontWeight.regular },
  bodyStrong: { fontSize: 17, lineHeight: 26, fontWeight: FontWeight.semibold },
  callout: { fontSize: 15, lineHeight: 22, fontWeight: FontWeight.regular },
  calloutStrong: { fontSize: 15, lineHeight: 22, fontWeight: FontWeight.semibold },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: FontWeight.regular },
  captionStrong: { fontSize: 13, lineHeight: 18, fontWeight: FontWeight.semibold },
  number: { fontSize: 24, lineHeight: 30, fontWeight: FontWeight.bold },
} as const;

export type TypographyVariant = keyof typeof Typography;

export const Shadow = Platform.select({
  ios: {
    shadowColor: '#0B1A2A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  android: { elevation: 2 },
  default: {
    boxShadow: '0 3px 10px rgba(11, 26, 42, 0.06)',
  },
});

/** 최소 터치 영역 (접근성 가이드 44pt) */
export const HitSize = 44;

export const MaxContentWidth = 640;
/** 원문 대조 해설처럼 2단 배치가 필요한 화면의 최대 폭 (태블릿·웹) */
export const MaxContentWidthWide = 960;
