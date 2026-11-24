import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { ChoiceChips, type ChoiceOption } from '@/components/ui/choice-chips';
import { Icon, type IconName } from '@/components/ui/icon';
import { ListRow, type ListRowProps } from '@/components/ui/list-row';
import { Colors, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

/* ------------------------------------------------------------------ */
/* 공통                                                                */
/* ------------------------------------------------------------------ */

/**
 * 설정 행 공통 속성. 모양은 `ListRow`(누르지 않는 모드)를 그대로 쓰고,
 * 누르는 동작·접근성은 아래 각 행이 `Pressable` 로 감싸서 정한다.
 */
export type SettingsRowContentProps = Omit<ListRowProps, 'icon' | 'onPress' | 'testID'> & {
  icon: IconName;
};

/* ------------------------------------------------------------------ */
/* 동작                                                                */
/* ------------------------------------------------------------------ */

export interface ActionRowProps extends SettingsRowContentProps {
  onPress: () => void;
  accessibilityHint?: string;
  /** 처리 중이면 누를 수 없고 오른쪽에 로딩 표시 */
  busy?: boolean;
  testID?: string;
}

/** 눌러서 동작을 실행하는 행 (기본 오른쪽: 화살표) */
export function ActionRow({
  onPress,
  accessibilityHint,
  busy = false,
  testID,
  right,
  ...content
}: ActionRowProps) {
  const trailing = busy ? (
    <ActivityIndicator color={content.destructive ? Colors.danger : Colors.primary} />
  ) : (
    (right ?? <Icon name="chevron-forward" size={18} color="textTertiary" />)
  );
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={content.title}
      accessibilityHint={accessibilityHint ?? content.subtitle}
      accessibilityState={{ disabled: busy, busy }}
      style={({ pressed }) => pressed && styles.pressed}
      testID={testID}>
      <ListRow {...content} right={trailing} />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* 스위치                                                              */
/* ------------------------------------------------------------------ */

export interface SwitchRowProps extends Omit<SettingsRowContentProps, 'right'> {
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID?: string;
}

/**
 * 켜기/끄기 행. 작은 스위치 대신 행 전체를 눌러 바꿀 수 있게 해 터치 영역을 넓혔다.
 * (스위치 자체는 표시용 — 웹에서 클릭이 두 번 처리되지 않도록 포인터 이벤트를 막는다)
 */
export function SwitchRow({ value, onValueChange, testID, ...content }: SwitchRowProps) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onValueChange(!value);
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={content.title}
      accessibilityHint={content.subtitle}
      style={({ pressed }) => pressed && styles.pressed}
      testID={testID}>
      <ListRow
        {...content}
        right={
          <View
            style={styles.switchWrap}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            <Switch
              value={value}
              trackColor={{ false: Colors.borderStrong, true: Colors.primary }}
              thumbColor={Colors.surface}
              ios_backgroundColor={Colors.borderStrong}
            />
          </View>
        }
      />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* 선택지                                                              */
/* ------------------------------------------------------------------ */

export interface ChoiceRowProps<T extends string | number> extends Omit<SettingsRowContentProps, 'right'> {
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** 여러 값 중 하나를 고르는 행 (칩) */
export function ChoiceRow<T extends string | number>({
  options,
  value,
  onChange,
  ...content
}: ChoiceRowProps<T>) {
  return (
    <View>
      <ListRow {...content} />
      <ChoiceChips
        options={options}
        selected={value}
        onSelect={(next) => {
          if (next !== value) onChange(next);
        }}
        accessibilityLabel={content.title}
        style={styles.choices}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 펼쳐 보기                                                           */
/* ------------------------------------------------------------------ */

export interface ExpandableRowProps extends Omit<SettingsRowContentProps, 'right'> {
  children: ReactNode;
  testID?: string;
}

/** 눌러서 긴 안내문을 펼치고 접는 행 */
export function ExpandableRow({ children, testID, ...content }: ExpandableRowProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View>
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={content.title}
        accessibilityHint={expanded ? '눌러서 내용을 접어요' : '눌러서 내용을 펼쳐요'}
        style={({ pressed }) => pressed && styles.pressed}
        testID={testID}>
        <ListRow
          {...content}
          right={<Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="textTertiary" />}
        />
      </Pressable>
      {expanded ? <View style={styles.expanded}>{children}</View> : null}
    </View>
  );
}

/** 안내문 글머리표 목록 */
export function NoticeList({ items }: { items: readonly string[] }) {
  return (
    <View style={styles.notice}>
      {items.map((item) => (
        <View key={item} style={styles.noticeItem}>
          <AppText variant="callout" color="textTertiary">
            •
          </AppText>
          <AppText variant="callout" color="textSecondary" style={styles.noticeText}>
            {item}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/** `ListRow` 아이콘 타일(36) + 간격 + 좌우 여백 — 펼친 내용·선택지를 행 제목과 같은 위치에 맞춘다 */
export const CONTENT_INSET = 36 + Spacing.md + Spacing.lg;

const styles = StyleSheet.create({
  pressed: { backgroundColor: Colors.surfaceMuted },
  switchWrap: { pointerEvents: 'none' },
  choices: {
    paddingLeft: CONTENT_INSET,
    paddingRight: Spacing.lg,
    paddingBottom: Spacing.lg,
    marginTop: -Spacing.xs,
  },
  expanded: {
    paddingLeft: CONTENT_INSET,
    paddingRight: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  notice: { gap: Spacing.sm },
  noticeItem: { flexDirection: 'row', gap: Spacing.sm },
  noticeText: { flex: 1 },
});
