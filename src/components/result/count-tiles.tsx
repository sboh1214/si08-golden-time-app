import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, Radius, Spacing, type ColorToken } from '@/constants/theme';
import { ITEM_ICON, outlineIcon } from '@/lib/icons';
import { SUMMARY_ITEM_LABEL, abnormalCountText } from '@/lib/labels';

export interface CountTilesProps {
  diagnosisCount: number;
  labCount: number;
  /** 참고치를 벗어난 검사 개수 */
  abnormalLabCount: number;
  medicationCount: number;
}

/** 진단 · 검사 · 처방 약 개수를 나란히 보여주는 요약 타일 */
export function CountTiles({ diagnosisCount, labCount, abnormalLabCount, medicationCount }: CountTilesProps) {
  const lab = describeLabs(labCount, abnormalLabCount);

  return (
    <View style={styles.row}>
      <Tile
        icon={outlineIcon(ITEM_ICON.diagnosis)}
        tint="primary"
        background="primarySoft"
        label={SUMMARY_ITEM_LABEL.diagnosis}
        count={diagnosisCount}
        accessibilityLabel={`${SUMMARY_ITEM_LABEL.diagnosis} ${diagnosisCount}개`}
      />
      <Tile
        icon={outlineIcon(ITEM_ICON.lab)}
        tint="info"
        background="infoSoft"
        label={SUMMARY_ITEM_LABEL.lab}
        count={labCount}
        note={lab.note}
        accessibilityLabel={lab.accessibilityLabel}
      />
      <Tile
        icon={outlineIcon(ITEM_ICON.medication)}
        tint="caution"
        background="cautionSoft"
        label={SUMMARY_ITEM_LABEL.medication}
        count={medicationCount}
        accessibilityLabel={`${SUMMARY_ITEM_LABEL.medication} ${medicationCount}개`}
      />
    </View>
  );
}

/** 검사 타일 하단 상태 배지와 스크린리더 문구 */
function describeLabs(labCount: number, abnormalLabCount: number): { note: ReactNode; accessibilityLabel: string } {
  if (labCount === 0) return { note: null, accessibilityLabel: '검사 0개' };
  if (abnormalLabCount > 0) {
    return {
      note: <TileNote icon="alert-circle" color="caution" text={abnormalCountText(abnormalLabCount)} />,
      accessibilityLabel: `검사 ${labCount}개, 확인이 필요한 항목 ${abnormalLabCount}개`,
    };
  }
  return {
    note: <TileNote icon="checkmark-circle" color="normal" text="모두 정상" />,
    accessibilityLabel: `검사 ${labCount}개, 모두 정상 범위`,
  };
}

/** 타일 하단 상태 문구 — 좁은 화면에서도 줄바꿈되도록 Badge 대신 사용 (아이콘 + 글자로 색에만 의존하지 않음) */
function TileNote({ icon, color, text }: { icon: IconName; color: ColorToken; text: string }) {
  return (
    <View style={styles.note}>
      <Icon name={icon} size={14} color={color} />
      <AppText variant="captionStrong" color={color} style={styles.noteText}>
        {text}
      </AppText>
    </View>
  );
}

interface TileProps {
  icon: IconName;
  tint: ColorToken;
  background: ColorToken;
  label: string;
  count: number;
  note?: ReactNode;
  accessibilityLabel: string;
}

function Tile({ icon, tint, background, label, count, note, accessibilityLabel }: TileProps) {
  return (
    <Card padding="md" style={styles.tile}>
      {/* 타일 전체를 하나의 문장으로 읽어 주도록 묶는다 */}
      <View style={styles.tileInner} accessible accessibilityRole="text" accessibilityLabel={accessibilityLabel}>
        <View style={[styles.iconWrap, { backgroundColor: Colors[background] }]}>
          <Icon name={icon} size={18} color={tint} />
        </View>
        <AppText variant="calloutStrong" color="textSecondary">
          {label}
        </AppText>
        <AppText variant="number">
          {count}
          <AppText variant="callout" color="textSecondary">
            개
          </AppText>
        </AppText>
        {note}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm },
  tile: { flex: 1 },
  tileInner: { gap: Spacing.xs },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxs,
  },
  note: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  noteText: { flexShrink: 1 },
});
