import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Icon } from '@/components/ui/icon';
import { Colors, HitSize, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

import type { GlossaryEntry } from './derive';

export interface GlossaryListProps {
  /** 가나다순 정렬된 용어 */
  entries: readonly GlossaryEntry[];
  /** "문장 보기" — 용어가 처음 나온 문장으로 이동 */
  onShowSentence: (sentenceId: string) => void;
}

/** 화면 하단 "용어 사전" — 문서에 나온 의학 용어 전체를 펼쳐 볼 수 있다 */
export function GlossaryList({ entries, onShowSentence }: GlossaryListProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    haptics.selection();
    setExpanded((v) => !v);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`용어 사전, ${entries.length}개`}
        accessibilityHint={expanded ? '용어 목록을 접어요' : '용어 목록을 펼쳐요'}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}>
        <View style={styles.headerIcon}>
          <Icon name="library-outline" size={20} color="primary" />
        </View>
        <View style={styles.headerTexts}>
          <AppText variant="heading">
            용어 사전
            <AppText variant="heading" color="primary">{` ${entries.length}`}</AppText>
          </AppText>
          <AppText variant="caption" color="textTertiary">
            이 문서에 나온 어려운 용어를 가나다순으로 모았어요
          </AppText>
        </View>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color="textSecondary" />
      </Pressable>

      {expanded ? (
        <Card variant="outlined" padding={0}>
          {entries.map((entry, index) => (
            <Fragment key={entry.key}>
              {index > 0 ? <Divider inset={Spacing.lg} /> : null}
              <View style={styles.entry}>
                <View style={styles.entryTexts}>
                  <AppText variant="bodyStrong" selectable>
                    {entry.term}
                  </AppText>
                  <AppText variant="callout" color="textSecondary" scalable selectable>
                    {entry.meaning || '풀이가 아직 없어요. 진료 때 의료진에게 물어보세요.'}
                  </AppText>
                </View>
                {entry.sentenceIds.length > 0 ? (
                  <Pressable
                    onPress={() => onShowSentence(entry.sentenceIds[0])}
                    accessibilityRole="button"
                    accessibilityLabel={`${entry.term} 용어가 나온 문장 보기`}
                    style={({ pressed }) => [styles.showButton, pressed && styles.pressed]}>
                    <Icon name="locate-outline" size={16} color="primary" />
                    <AppText variant="captionStrong" color="primary">
                      문장 보기
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
            </Fragment>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: HitSize + Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderStrong,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: { flex: 1, gap: Spacing.xxs },
  entry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  entryTexts: { flex: 1, gap: Spacing.xxs },
  showButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    minHeight: HitSize,
    minWidth: HitSize,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
  },
  pressed: { opacity: 0.7 },
});
