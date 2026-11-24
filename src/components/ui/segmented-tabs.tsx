import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, HitSize, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

export interface SegmentedTabItem<K extends string> {
  key: K;
  label: string;
  /** 스크린 리더용 전체 이름 (화면에는 짧은 label 을 보일 때) */
  accessibilityLabel?: string;
  icon?: IconName;
  /** 개수 표시 (스크린리더는 '라벨 n개'로 읽는다) */
  count?: number;
  disabled?: boolean;
  testID?: string;
}

export interface SegmentedTabsProps<K extends string> {
  items: readonly SegmentedTabItem<K>[];
  value: K;
  /** 이미 선택된 탭을 다시 누르면 부르지 않는다 */
  onChange: (key: K) => void;
}

/** 회색 바탕 위 흰 선택 칸 세그먼트 (최소 44pt) — 질문 노트 필터 · 진료기록 상세 3개 화면 전환 */
export function SegmentedTabs<K extends string>({ items, value, onChange }: SegmentedTabsProps<K>) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      {items.map((item) => {
        const selected = item.key === value;
        const disabled = item.disabled ?? false;
        return (
          <Pressable
            key={item.key}
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onChange(item.key);
            }}
            disabled={disabled}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={
              item.count !== undefined
                ? `${item.accessibilityLabel ?? item.label} ${item.count}개`
                : (item.accessibilityLabel ?? item.label)
            }
            testID={item.testID}
            style={({ pressed }) => [
              styles.item,
              selected && styles.selected,
              pressed && !selected && styles.pressed,
              disabled && styles.disabled,
            ]}>
            {item.icon ? <Icon name={item.icon} size={16} color={selected ? 'primary' : 'textTertiary'} /> : null}
            {/* 좁은 화면(360pt)에서도 한 줄에 들어가도록 필요하면 글자를 조금 줄인다 */}
            <AppText
              variant="calloutStrong"
              color={selected ? 'primary' : 'textSecondary'}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={styles.label}>
              {item.label}
            </AppText>
            {item.count !== undefined ? (
              <View style={[styles.count, selected && styles.countSelected]}>
                <AppText variant="captionStrong" color={selected ? 'onPrimary' : 'textSecondary'}>
                  {item.count}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: Spacing.xs,
    gap: Spacing.xs,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: HitSize,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.sm,
  },
  label: { flexShrink: 1 },
  selected: { backgroundColor: Colors.surface },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  count: {
    minWidth: 22,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.pill,
    alignItems: 'center',
    backgroundColor: Colors.border,
  },
  countSelected: { backgroundColor: Colors.primary },
});
