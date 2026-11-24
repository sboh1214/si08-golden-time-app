import { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Colors } from '@/constants/theme';
import type { GlossaryTerm } from '@/types/domain';

import { splitByTerms } from './highlight';
import { ORIGINAL_FONT_FAMILY } from './layout';

export interface HighlightedTextProps {
  /** 진료기록 원문 문장 */
  text: string;
  /** 문장 안의 의학 용어 */
  terms: readonly GlossaryTerm[];
  /** 강조된 용어를 눌렀을 때 */
  onTermPress?: (term: GlossaryTerm) => void;
}

/**
 * 원문 문장 표시. 의학 용어는 밑줄 + 옅은 배경 + 굵은 글씨로 강조하고 누르면 뜻을 연다.
 * 스크린리더 사용자는 문장 아래 용어 버튼(TermChip)으로 같은 기능을 쓸 수 있다.
 */
export const HighlightedText = memo(function HighlightedText({ text, terms, onTermPress }: HighlightedTextProps) {
  const segments = useMemo(() => splitByTerms(text, terms.map((t) => t.term)), [text, terms]);

  return (
    <AppText variant="callout" color="textSecondary" scalable style={styles.original}>
      {segments.map((segment) => {
        if (segment.termIndex === null) return segment.text;
        const term = terms[segment.termIndex];
        return (
          <AppText
            key={segment.start}
            variant="calloutStrong"
            color="text"
            scalable
            style={styles.term}
            onPress={onTermPress ? () => onTermPress(term) : undefined}>
            {segment.text}
          </AppText>
        );
      })}
    </AppText>
  );
});

const styles = StyleSheet.create({
  original: {
    fontFamily: ORIGINAL_FONT_FAMILY,
    letterSpacing: 0,
  },
  term: {
    backgroundColor: Colors.accentSoft,
    textDecorationLine: 'underline',
    textDecorationColor: Colors.accent,
  },
});
