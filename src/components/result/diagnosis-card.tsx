import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { IconName } from '@/components/ui/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { DIAGNOSIS_STATUS_LABEL } from '@/lib/labels';
import type { Diagnosis, DiagnosisStatus } from '@/types/domain';

import { OriginalText } from './original-text';
import { SourceLink } from './source-link';

const STATUS_TONE: Record<DiagnosisStatus, BadgeTone> = {
  confirmed: 'primary',
  suspected: 'caution',
  ruled_out: 'neutral',
  history: 'neutral',
};

const STATUS_ICON: Record<DiagnosisStatus, IconName> = {
  confirmed: 'checkmark-circle',
  suspected: 'help-circle',
  ruled_out: 'close-circle',
  history: 'time',
};

/** 진단 상태 용어를 환자 눈높이로 풀어 쓴 설명 */
const STATUS_HINT: Record<DiagnosisStatus, string> = {
  confirmed: '의료진이 진단한 질환이에요.',
  suspected: '가능성이 있어 추가 검사나 경과 확인이 필요한 상태예요.',
  ruled_out: '검사 결과 해당하지 않는 것으로 판단됐어요.',
  history: '예전에 진단받았던 질환이에요.',
};

/** 화면 표시 순서: 확진 → 의심 → 과거력 → 배제 */
const STATUS_ORDER: Record<DiagnosisStatus, number> = {
  confirmed: 0,
  suspected: 1,
  history: 2,
  ruled_out: 3,
};

/** 중요한 진단이 먼저 보이도록 상태 순으로 정렬 (같은 상태는 원래 순서 유지) */
export function sortDiagnoses(diagnoses: readonly Diagnosis[]): Diagnosis[] {
  return [...diagnoses].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}

export interface DiagnosisCardProps {
  diagnosis: Diagnosis;
  /** 근거 원문 문장으로 이동 (원문 문장이 없으면 생략) */
  onViewSource?: () => void;
}

/** 진단명 카드 — 쉬운 진단명 · 상태 · 질병코드 · 쉬운 설명 · 원문 표기 */
export function DiagnosisCard({ diagnosis, onViewSource }: DiagnosisCardProps) {
  const { name, status, code, originalTerm, plainExplanation } = diagnosis;
  const statusLabel = DIAGNOSIS_STATUS_LABEL[status];

  return (
    <Card style={styles.card} testID={`diagnosis-${diagnosis.id}`}>
      <View style={styles.head}>
        <AppText variant="heading" color={status === 'ruled_out' ? 'textSecondary' : 'text'} scalable>
          {name}
        </AppText>
        <View style={styles.tags}>
          <Badge label={statusLabel} tone={STATUS_TONE[status]} icon={STATUS_ICON[status]} size="md" />
          {code ? (
            <View style={styles.code} accessible accessibilityLabel={`질병 분류 코드 ${code}`}>
              <AppText variant="captionStrong" color="textSecondary">
                {`KCD ${code}`}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="caption" color="textTertiary">
          {`${statusLabel}: ${STATUS_HINT[status]}`}
        </AppText>
      </View>

      <AppText variant="body" scalable>
        {plainExplanation}
      </AppText>

      <OriginalText label="원문 표기" text={originalTerm} />

      {onViewSource ? <SourceLink onPress={onViewSource} subject={name} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  head: { gap: Spacing.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  code: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
