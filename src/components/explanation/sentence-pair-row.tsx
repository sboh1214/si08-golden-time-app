import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import type { ExplainedSentence, GlossaryTerm } from '@/types/domain';

import { dedupeTerms, isLowConfidence, type RelatedItem } from './derive';
import { HighlightedText } from './highlighted-text';
import {
  CARD_BORDER_WIDTH,
  CARD_PADDING,
  COLUMN_GAP,
  ORIGINAL_FLEX,
  PLAIN_FLEX,
  type ExplanationLayout,
} from './layout';
import { RelatedItemChip, TermChip } from './row-chips';

export interface SentencePairRowProps {
  sentence: ExplainedSentence;
  layout: ExplanationLayout;
  /** 관련 구조화 항목 (부모에서 미리 계산해 참조가 유지되도록 전달) */
  relatedItems: readonly RelatedItem[];
  /** 다른 화면에서 이 문장으로 이동해 왔을 때 잠시 강조 */
  highlighted?: boolean;
  onTermPress: (term: GlossaryTerm) => void;
  onRelatedPress: (item: RelatedItem) => void;
}

/**
 * 원문 문장 1개 + 환자 눈높이 해설 1개를 한 카드에 짝지어 보여준다.
 * - side : 왼쪽 원문 | 오른쪽 쉬운 해설 (나란히)
 * - stack: 위 원문 → 아래 쉬운 해설 (연결 화살표)
 */
export const SentencePairRow = memo(function SentencePairRow({
  sentence,
  layout,
  relatedItems,
  highlighted = false,
  onTermPress,
  onRelatedPress,
}: SentencePairRowProps) {
  const lowConfidence = isLowConfidence(sentence.confidence);
  const chipTerms = useMemo(() => dedupeTerms(sentence.terms), [sentence.terms]);
  const original = (
    <HighlightedText text={sentence.original} terms={sentence.terms} onTermPress={onTermPress} />
  );
  const plain = (
    <AppText variant="body" scalable>
      {sentence.plain}
    </AppText>
  );

  return (
    <View style={[styles.card, highlighted && styles.cardHighlighted]} testID={`sentence-${sentence.id}`}>
      {lowConfidence ? (
        <View style={styles.caution}>
          <Badge label="의료진 확인 권장" tone="caution" icon="alert-circle" />
          <AppText variant="caption" color="textSecondary">
            AI가 이 문장을 풀이할 때 확신이 낮았어요. 정확한 뜻은 진료 때 의료진에게 꼭 확인하세요.
          </AppText>
        </View>
      ) : null}

      {layout === 'side' ? (
        <View style={styles.sideRow}>
          <View
            style={[styles.originalBox, styles.originalColumn]}
            accessible
            accessibilityLabel={`진료기록 원문: ${sentence.original}`}>
            {original}
          </View>
          <View
            style={[styles.plainBox, styles.plainColumn]}
            accessible
            accessibilityLabel={`쉬운 해설: ${sentence.plain}`}>
            {plain}
          </View>
        </View>
      ) : (
        <View>
          <View style={styles.originalBox} accessible accessibilityLabel={`진료기록 원문: ${sentence.original}`}>
            <BoxLabel kind="original" />
            {original}
          </View>
          <View style={styles.connector} aria-hidden>
            <Icon name="arrow-down" size={16} color="primary" />
            <AppText variant="captionStrong" color="primary">
              쉽게 말하면
            </AppText>
          </View>
          <View style={styles.plainBox} accessible accessibilityLabel={`쉬운 해설: ${sentence.plain}`}>
            <BoxLabel kind="plain" />
            {plain}
          </View>
        </View>
      )}

      {chipTerms.length > 0 ? (
        <View style={styles.chipRow}>
          <AppText variant="caption" color="textTertiary" style={styles.chipRowLabel}>
            용어 풀이
          </AppText>
          {chipTerms.map((term) => (
            <TermChip key={term.term} term={term} onPress={onTermPress} />
          ))}
        </View>
      ) : null}

      {relatedItems.length > 0 ? (
        <View style={styles.chipRow}>
          <AppText variant="caption" color="textTertiary" style={styles.chipRowLabel}>
            관련 항목
          </AppText>
          {relatedItems.map((item) => (
            <RelatedItemChip key={item.id} item={item} onPress={onRelatedPress} />
          ))}
        </View>
      ) : null}
    </View>
  );
});

/** 위아래 보기에서 각 상자의 작은 제목 */
function BoxLabel({ kind }: { kind: 'original' | 'plain' }) {
  const isOriginal = kind === 'original';
  return (
    <View style={styles.boxLabel}>
      <Icon
        name={isOriginal ? 'document-text-outline' : 'chatbubble-ellipses-outline'}
        size={14}
        color={isOriginal ? 'textTertiary' : 'primary'}
      />
      <AppText variant="captionStrong" color={isOriginal ? 'textTertiary' : 'primary'}>
        {isOriginal ? '진료기록 원문' : '쉬운 해설'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: CARD_BORDER_WIDTH,
    borderColor: Colors.surface,
    padding: CARD_PADDING,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    ...Shadow,
  },
  cardHighlighted: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  caution: {
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.cautionSoft,
  },
  sideRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: COLUMN_GAP,
  },
  originalColumn: { flex: ORIGINAL_FLEX, flexBasis: 0 },
  plainColumn: { flex: PLAIN_FLEX, flexBasis: 0 },
  originalBox: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  plainBox: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  boxLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  connector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  chipRowLabel: { marginRight: Spacing.xxs },
});
