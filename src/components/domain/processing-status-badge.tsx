import { Badge, type BadgeTone } from '@/components/ui/badge';
import type { IconName } from '@/components/ui/icon';
import { PROCESSING_STATUS_LABEL } from '@/lib/labels';
import type { ProcessingStatus } from '@/types/domain';

const TONE: Record<ProcessingStatus, BadgeTone> = {
  uploaded: 'info',
  ocr: 'info',
  structuring: 'info',
  explaining: 'info',
  completed: 'normal',
  failed: 'danger',
};

const ICON: Record<ProcessingStatus, IconName> = {
  uploaded: 'cloud-upload-outline',
  ocr: 'scan-outline',
  structuring: 'list-outline',
  explaining: 'chatbubble-ellipses-outline',
  completed: 'checkmark-circle',
  failed: 'alert-circle',
};

/** 문서 처리 상태 배지 */
export function ProcessingStatusBadge({ status }: { status: ProcessingStatus }) {
  return <Badge label={PROCESSING_STATUS_LABEL[status]} tone={TONE[status]} icon={ICON[status]} />;
}
