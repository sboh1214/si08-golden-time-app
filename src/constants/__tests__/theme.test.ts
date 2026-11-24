/**
 * 디자인 토큰 대비 검사 — 실제로 함께 쓰는 글자색·배경색 조합이 WCAG AA(작은 글자 4.5:1) 이상인지.
 * 토큰 값을 바꿀 때 고령 사용자 가독성이 떨어지지 않도록 지킨다.
 */
import { BADGE_TONE_COLORS } from '@/components/ui/badge';
import { flagColor } from '@/lib/labs';
import type { LabFlag } from '@/types/domain';

import { Colors, type ColorToken } from '../theme';

const AA_SMALL_TEXT = 4.5;

function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(value.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: string, bg: string): number {
  const [hi, lo] = [relativeLuminance(fg), relativeLuminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

const PAGE_BACKGROUNDS: ColorToken[] = ['surface', 'surfaceMuted', 'background'];
const SOFT_BACKGROUNDS = (Object.keys(Colors) as ColorToken[]).filter((k) => k.endsWith('Soft'));

describe('대비 계산', () => {
  it('검정/흰색은 21:1, 같은 색은 1:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#7A828E', '#7A828E')).toBeCloseTo(1, 5);
  });
});

describe('글자색 토큰', () => {
  const textTokens: ColorToken[] = [
    'text',
    'textSecondary',
    'textTertiary',
    'normal',
    'high',
    'low',
    'caution',
    'critical',
    'danger',
    'info',
    'accentStrong',
  ];

  it.each(textTokens.flatMap((fg) => [...PAGE_BACKGROUNDS, ...SOFT_BACKGROUNDS].map((bg) => [fg, bg])))(
    '%s 글자는 %s 배경에서 4.5:1 이상',
    (fg, bg) => {
      expect(contrastRatio(Colors[fg as ColorToken], Colors[bg as ColorToken])).toBeGreaterThanOrEqual(
        AA_SMALL_TEXT,
      );
    },
  );

  it.each([...PAGE_BACKGROUNDS, 'primarySoft'])('주색(primary) 글자는 %s 배경에서 4.5:1 이상', (bg) => {
    expect(contrastRatio(Colors.primary, Colors[bg as ColorToken])).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
  });

  it('주색 버튼의 흰 글자도 4.5:1 이상', () => {
    expect(contrastRatio(Colors.onPrimary, Colors.primary)).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
  });
});

describe('실제 사용 조합', () => {
  it.each(Object.entries(BADGE_TONE_COLORS))('배지 %s 톤', (_tone, { fg, bg }) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
  });

  const flags: LabFlag[] = ['critical_low', 'low', 'normal', 'high', 'critical_high'];
  it.each(flags)('검사 판정 %s 색 (자기 배경·흰 카드)', (flag) => {
    const { fg, bg } = flagColor(flag);
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
    expect(contrastRatio(fg, Colors.surface)).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
  });
});
