import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Medication } from '@/types/domain';

import { OriginalText } from './original-text';
import { SourceLink } from './source-link';

export interface MedicationCardProps {
  medication: Medication;
  /** 근거 원문 문장으로 이동 (원문 문장이 없으면 생략) */
  onViewSource?: () => void;
}

/** 처방 약 카드 — 약 이름 · 성분 · 먹는 이유 · 복용법 · 주의사항 · 처방 원문 */
export function MedicationCard({ medication, onViewSource }: MedicationCardProps) {
  const { name, ingredient, purpose, dose, frequency, durationDays, cautions, originalText } = medication;

  return (
    <Card style={styles.card} testID={`medication-${medication.id}`}>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <Icon name="medkit-outline" size={20} color="accent" />
        </View>
        <View style={styles.headTexts}>
          <AppText variant="heading" scalable>
            {name}
          </AppText>
          {ingredient ? (
            <AppText variant="callout" color="textSecondary">
              {`성분 ${ingredient}`}
            </AppText>
          ) : null}
        </View>
      </View>

      {purpose ? (
        <View style={styles.purpose} accessible accessibilityLabel={`먹는 이유: ${purpose}`}>
          <Icon name="bulb-outline" size={16} color="primary" />
          <AppText variant="calloutStrong" color="primary" style={styles.shrinkText} scalable>
            {purpose}
          </AppText>
        </View>
      ) : null}

      <View style={styles.dosage}>
        <DosageRow icon="medical-outline" label="한 번에" value={dose} />
        <DosageRow icon="time-outline" label="먹는 방법" value={frequency} />
        {durationDays !== undefined ? (
          <DosageRow icon="calendar-outline" label="처방 기간" value={`${durationDays}일분`} />
        ) : null}
      </View>

      {cautions.length > 0 ? <CautionList cautions={cautions} /> : null}

      <OriginalText label="처방 원문" text={originalText} />

      {onViewSource ? <SourceLink onPress={onViewSource} subject={name} /> : null}
    </Card>
  );
}

function DosageRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.dosageRow} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.dosageLabel}>
        <Icon name={icon} size={16} color="textTertiary" />
        <AppText variant="callout" color="textTertiary">
          {label}
        </AppText>
      </View>
      <AppText variant="bodyStrong" style={styles.flexText} scalable>
        {value}
      </AppText>
    </View>
  );
}

function CautionList({ cautions }: { cautions: string[] }) {
  return (
    <View style={styles.caution}>
      <View style={styles.cautionTitle}>
        <Icon name="warning" size={18} color="caution" />
        <AppText variant="calloutStrong" color="caution" accessibilityRole="header">
          복용할 때 주의하세요
        </AppText>
      </View>
      {cautions.map((text, index) => (
        // 서버가 주는 주의사항 문장은 고유 id 가 없어 순서+문장으로 키를 만든다
        <View key={`${index}-${text}`} style={styles.bullet}>
          <AppText variant="body" color="caution" importantForAccessibility="no" accessibilityElementsHidden>
            •
          </AppText>
          <AppText variant="body" style={styles.flexText} scalable>
            {text}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headTexts: { flex: 1, gap: Spacing.xxs },
  flexText: { flex: 1 },
  // 내용 폭에 맞춰지는 컨테이너 안에서는 flex:1 대신 shrink 만 허용해야 글자가 사라지지 않는다
  shrinkText: { flexShrink: 1 },
  purpose: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    maxWidth: '100%',
  },
  dosage: {
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  dosageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  dosageLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, width: 104, minHeight: 26 },
  caution: {
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.cautionSoft,
  },
  cautionTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xxs },
  bullet: { flexDirection: 'row', gap: Spacing.sm },
});
