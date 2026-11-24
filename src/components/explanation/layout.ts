/**
 * 원문 대조 해설 화면 배치 상수.
 * 문장 카드와 상단 고정 열 머리글("진료기록 원문 | 쉬운 해설")이 같은 값을 써야 두 단이 정확히 맞는다.
 */
import { Platform, useWindowDimensions } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useSettings, type SettingsState } from '@/store/settings';

export type ExplanationLayout = SettingsState['explanationLayout'];

/** 나란히 보기 열 비율 — 해설 쪽을 조금 넓게 (원문 1 : 해설 1.15) */
export const ORIGINAL_FLEX = 1;
export const PLAIN_FLEX = 1.15;

/** 두 열 사이 간격 */
export const COLUMN_GAP = Spacing.sm;

/** 문장 카드 테두리 두께 (강조 표시 시 색만 바뀌어 레이아웃이 흔들리지 않음) */
export const CARD_BORDER_WIDTH = 2;

/** 문장 카드 안쪽 여백 */
export const CARD_PADDING = Spacing.sm;

/** 이 폭보다 좁은 화면은 좌우 여백을 줄여 글자 크기를 유지한다 */
export const COMPACT_WIDTH = 380;

/** 이 폭보다 좁으면 두 단이 너무 좁아(한 줄 6~7자) 나란히 보기 대신 위아래로 보여 준다 (분할 화면 등) */
export const MIN_SIDE_BY_SIDE_WIDTH = 340;

export interface ResolvedExplanationLayout {
  /** 실제로 그릴 배치 */
  layout: ExplanationLayout;
  /** 저장된 설정 (자동 전환과 관계없이 그대로 유지된다) */
  preferred: ExplanationLayout;
  /** 나란히 보기를 골랐지만 화면이 좁아 위아래로 바꿔 보여 주는 중 */
  autoStacked: boolean;
}

/**
 * 저장된 배치 설정과 화면 폭·글자 크기로 실제 배치를 정한다.
 * 나란히 보기는 과업 ③ 의 기본 배치라 설정 기본값은 그대로 두고, 두 단이 읽기 어려울 만큼 좁을 때만
 * (아주 좁은 화면, 또는 글자 크게 보기를 켠 작은 화면) 위아래 배치로 보여 준다.
 */
export function resolveExplanationLayout(
  preferred: ExplanationLayout,
  width: number,
  largeText: boolean,
): ResolvedExplanationLayout {
  const tooNarrow = width < MIN_SIDE_BY_SIDE_WIDTH || (largeText && width < COMPACT_WIDTH);
  const autoStacked = preferred === 'side' && tooNarrow;
  return { layout: autoStacked ? 'stack' : preferred, preferred, autoStacked };
}

export function useExplanationLayout(): ResolvedExplanationLayout {
  const { width } = useWindowDimensions();
  const preferred = useSettings((s) => s.explanationLayout);
  const largeText = useSettings((s) => s.largeText);
  return resolveExplanationLayout(preferred, width, largeText);
}

/** 원문은 진료기록 인쇄물 느낌의 고정폭 글꼴 (한글은 시스템 글꼴로 대체 표시) */
export const ORIGINAL_FONT_FAMILY = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
});
