import { Badge, type BadgeTone } from '@/components/ui/badge';
import type { IconName } from '@/components/ui/icon';
import { LAB_FLAG_LABEL } from '@/lib/labels';
import type { LabFlag } from '@/types/domain';

/**
 * 검사 판정 → 배지 색. 타임라인 등 판정 색을 쓰는 다른 화면도 이 표를 쓴다.
 * '매우 낮음'·'매우 높음'은 방향과 관계없이 같은 위험 톤 + 원 아이콘으로 '낮음'·'높음'과 구분한다.
 */
export const LAB_FLAG_TONE: Record<LabFlag, BadgeTone> = {
  critical_low: 'danger',
  low: 'low',
  normal: 'normal',
  high: 'high',
  critical_high: 'danger',
};

const ICON: Record<LabFlag, IconName> = {
  critical_low: 'arrow-down-circle',
  low: 'arrow-down',
  normal: 'checkmark',
  high: 'arrow-up',
  critical_high: 'arrow-up-circle',
};

/** 검사 판정 배지 (정상/높음/낮음…) — 색 + 아이콘 + 글자로 색각 이상 사용자도 구분 가능 */
export function LabFlagBadge({ flag, size = 'sm' }: { flag: LabFlag; size?: 'sm' | 'md' }) {
  // 계약에 없는 판정 값이 와도 화면이 깨지지 않도록 중립 배지로 표시
  const label = LAB_FLAG_LABEL[flag] ?? '판정 확인 필요';
  return <Badge label={label} tone={LAB_FLAG_TONE[flag] ?? 'neutral'} icon={ICON[flag] ?? 'help-circle-outline'} size={size} />;
}
