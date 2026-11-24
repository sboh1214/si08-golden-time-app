import { useRouter } from 'expo-router';

import type { IconName } from '@/components/ui/icon';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { DOCUMENT_SECTION_LABEL, DOCUMENT_SECTION_SHORT_LABEL } from '@/lib/labels';

export type DocumentSection = 'result' | 'explanation' | 'labs';

/**
 * 화면에는 잘리지 않는 짧은 이름, 스크린 리더에는 헤더 제목과 같은 `DOCUMENT_SECTION_LABEL` 을 쓴다.
 */
const ITEMS: { key: DocumentSection; label: string; accessibilityLabel: string; icon: IconName }[] = (
  [
    ['result', 'list'],
    ['explanation', 'swap-horizontal'],
    ['labs', 'stats-chart'],
  ] as const
).map(([key, icon]) => ({
  key,
  icon,
  label: DOCUMENT_SECTION_SHORT_LABEL[key],
  accessibilityLabel: DOCUMENT_SECTION_LABEL[key],
}));

export interface DocumentSectionNavProps {
  documentId: string;
  current: DocumentSection;
  /** 검사 결과가 없는 기록은 검사 수치 탭 비활성 */
  hasLabs?: boolean;
}

/**
 * 진료기록 상세 3개 화면(정리 결과 / 원문 대조 해설 / 검사 수치) 전환용 세그먼트.
 * 같은 기록 안에서 이동하므로 replace 로 스택이 깊어지지 않게 한다.
 */
export function DocumentSectionNav({ documentId, current, hasLabs = true }: DocumentSectionNavProps) {
  const router = useRouter();

  const go = (key: DocumentSection) => {
    const params = { id: documentId };
    if (key === 'result') router.replace({ pathname: '/documents/[id]', params });
    else if (key === 'explanation') router.replace({ pathname: '/documents/[id]/explanation', params });
    else router.replace({ pathname: '/documents/[id]/labs', params });
  };

  return (
    <SegmentedTabs
      items={ITEMS.map((item) => ({ ...item, disabled: item.key === 'labs' && !hasLabs }))}
      value={current}
      onChange={go}
    />
  );
}
