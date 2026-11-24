/**
 * 도메인 아이콘 사전 — 같은 대상은 어느 화면에서나 같은 모양으로 보여 준다.
 * (정리 결과·원문 대조 해설·타임라인·등록 화면·내 기록 공통)
 *
 * 채움 모양을 기준으로 두고, 외곽선이 필요한 곳은 `outlineIcon()` 으로 바꿔 쓴다.
 */
import type { IconName } from '@/components/ui/icon';
import type { DocumentSource, DocumentType, TimelineEventType } from '@/types/domain';

/** `-outline` 변형이 있는 Ionicons 이름 */
export type OutlinableIconName = {
  [K in IconName]: `${K}-outline` extends IconName ? K : never;
}[IconName];

export function outlineIcon(name: OutlinableIconName): IconName {
  return `${name}-outline`;
}

/** 정리 결과 항목 (진단 · 검사 · 처방 약) */
export const ITEM_ICON = {
  diagnosis: 'medical',
  lab: 'flask',
  medication: 'medkit',
} as const satisfies Record<string, OutlinableIconName>;

/** 문서 종류 — 처방전·검사 결과지는 항목 아이콘과 같은 모양 */
export const DOCUMENT_TYPE_ICON: Record<DocumentType, OutlinableIconName> = {
  medical_record: 'document-text',
  lab_result: ITEM_ICON.lab,
  prescription: ITEM_ICON.medication,
  opinion: 'ribbon',
  discharge_summary: 'bed',
  other: 'document',
};

/** 등록 방법 (촬영 · 사진 · PDF) */
export const DOCUMENT_SOURCE_ICON: Record<DocumentSource, OutlinableIconName> = {
  camera: 'camera',
  gallery: 'images',
  pdf: 'document-attach',
};

/** 타임라인 이벤트 분류 — 진료는 병원(문서 헤더의 병원 표시와 같은 모양) */
export const TIMELINE_EVENT_ICON: Record<TimelineEventType, OutlinableIconName> = {
  visit: 'business',
  diagnosis: ITEM_ICON.diagnosis,
  lab: ITEM_ICON.lab,
  prescription: ITEM_ICON.medication,
};
