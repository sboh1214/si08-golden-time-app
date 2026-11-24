import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, HitSize, Radius, Spacing } from '@/constants/theme';
import { ITEM_ICON, outlineIcon } from '@/lib/icons';
import { DOCUMENT_SECTION_LABEL, LAB_FLAG_LABEL, SUMMARY_ITEM_LABEL } from '@/lib/labels';
import { flagColor } from '@/lib/labs';
import type { GlossaryTerm } from '@/types/domain';

import type { RelatedItem, RelatedItemKind } from './derive';

/**
 * 칩 높이 — 보이는 크기는 작게, 터치 영역은 위아래 hitSlop 으로 44pt 확보.
 * (가로는 아이콘+글자+여백으로 이미 44pt 이상이고, 옆 칩과 터치 영역이 겹치지 않게 세로만 넓힌다)
 */
const CHIP_HEIGHT = 32;
const CHIP_HIT_SLOP = { top: (HitSize - CHIP_HEIGHT) / 2, bottom: (HitSize - CHIP_HEIGHT) / 2 };

/* ------------------------------------------------------------------ */
/* 용어 칩                                                              */
/* ------------------------------------------------------------------ */

export interface TermChipProps {
  term: GlossaryTerm;
  onPress: (term: GlossaryTerm) => void;
}

/** 문장 아래 의학 용어 버튼 — 누르면 용어 풀이 시트를 연다 */
export function TermChip({ term, onPress }: TermChipProps) {
  return (
    <Pressable
      onPress={() => onPress(term)}
      accessibilityRole="button"
      accessibilityLabel={`${term.term} 뜻 보기`}
      hitSlop={CHIP_HIT_SLOP}
      style={({ pressed }) => [styles.chip, styles.termChip, pressed && styles.pressed]}>
      <Icon name="book-outline" size={14} color="caution" />
      <AppText variant="captionStrong" color="text">
        {term.term}
      </AppText>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* 관련 항목 칩                                                          */
/* ------------------------------------------------------------------ */

/** 아이콘·이름은 정리 결과 화면(개수 타일·진단/약 카드)과 같게 (`@/lib/icons`, `SUMMARY_ITEM_LABEL`) */
const RESULT_HINT = `${DOCUMENT_SECTION_LABEL.result} 화면에서 자세히 보여드려요`;
const KIND_META: Record<RelatedItemKind, { icon: IconName; label: string; hint: string }> = {
  diagnosis: { icon: outlineIcon(ITEM_ICON.diagnosis), label: SUMMARY_ITEM_LABEL.diagnosis, hint: RESULT_HINT },
  lab: { icon: outlineIcon(ITEM_ICON.lab), label: SUMMARY_ITEM_LABEL.lab, hint: '이 검사의 수치 변화를 보여드려요' },
  medication: { icon: outlineIcon(ITEM_ICON.medication), label: SUMMARY_ITEM_LABEL.medication, hint: RESULT_HINT },
};

export interface RelatedItemChipProps {
  item: RelatedItem;
  onPress: (item: RelatedItem) => void;
}

/** 문장과 관련된 진단·검사·약 바로가기 */
export function RelatedItemChip({ item, onPress }: RelatedItemChipProps) {
  const meta = KIND_META[item.kind];
  const flagLabel = item.kind === 'lab' ? LAB_FLAG_LABEL[item.flag] : undefined;
  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="link"
      accessibilityLabel={`관련 ${meta.label}: ${item.label}${flagLabel ? `, ${flagLabel}` : ''}`}
      accessibilityHint={meta.hint}
      hitSlop={CHIP_HIT_SLOP}
      style={({ pressed }) => [styles.chip, styles.relatedChip, pressed && styles.pressed]}>
      <Icon name={meta.icon} size={14} color="primary" />
      <AppText variant="captionStrong" color="text" numberOfLines={1} style={styles.relatedLabel}>
        {item.label}
      </AppText>
      {item.kind === 'lab' ? (
        <AppText variant="captionStrong" color={flagColor(item.flag).fg}>
          {`· ${flagLabel}`}
        </AppText>
      ) : null}
      <Icon name="chevron-forward" size={14} color="textTertiary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: CHIP_HEIGHT,
    minWidth: HitSize,
    paddingHorizontal: Spacing.sm + Spacing.xxs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    maxWidth: '100%',
  },
  termChip: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accentSoft,
  },
  relatedChip: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  relatedLabel: { flexShrink: 1 },
  pressed: { opacity: 0.7 },
});
