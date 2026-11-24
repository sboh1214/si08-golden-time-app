import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Icon } from '@/components/ui/icon';
import { Colors, HitSize, Spacing } from '@/constants/theme';

/** 서비스 시작 전 필수 동의 항목 */
export type ConsentKey = 'aiNotice' | 'dataProcessing';

export type ConsentState = Record<ConsentKey, boolean>;

export const INITIAL_CONSENT: ConsentState = { aiNotice: false, dataProcessing: false };

/** 동의 항목 — AI 해설 고지 원문은 동의 화면 위쪽 고지 상자에 함께 표시한다 */
const ITEMS: { key: ConsentKey; label: string; detail?: string }[] = [
  {
    key: 'aiNotice',
    label: 'AI 해설은 참고용이며 의료진의 진단·처방을 대신하지 않음을 이해했어요',
  },
  {
    key: 'dataProcessing',
    label: '진료기록(민감정보)이 해설 생성 목적으로 처리됨에 동의해요',
    detail:
      '등록한 진료기록은 글자 인식과 쉬운 해설을 만드는 데에만 쓰여요. 자세한 내용은 설정 > 개인정보 처리 안내에서 볼 수 있어요.',
  },
];

export function isConsentComplete(consent: ConsentState): boolean {
  return ITEMS.every((item) => consent[item.key]);
}

export interface ConsentChecklistProps {
  consent: ConsentState;
  onChange: (consent: ConsentState) => void;
}

/** 필수 동의 체크리스트 (전체 동의 + 항목별 동의) */
export function ConsentChecklist({ consent, onChange }: ConsentChecklistProps) {
  const allChecked = isConsentComplete(consent);
  return (
    <Card padding={0} clip testID="onboarding-consent">
      <CheckRow
        checked={allChecked}
        label="모두 동의해요"
        strong
        onPress={() => onChange({ aiNotice: !allChecked, dataProcessing: !allChecked })}
        testID="consent-all"
      />
      <Divider inset={Spacing.lg} />
      {ITEMS.map((item) => (
        <CheckRow
          key={item.key}
          checked={consent[item.key]}
          label={item.label}
          detail={item.detail}
          required
          onPress={() => onChange({ ...consent, [item.key]: !consent[item.key] })}
          testID={`consent-${item.key}`}
        />
      ))}
    </Card>
  );
}

interface CheckRowProps {
  checked: boolean;
  label: string;
  detail?: string;
  required?: boolean;
  strong?: boolean;
  onPress: () => void;
  testID?: string;
}

function CheckRow({
  checked,
  label,
  detail,
  required = false,
  strong = false,
  onPress,
  testID,
}: CheckRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={required ? `필수, ${label}` : label}
      accessibilityHint={detail}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={testID}>
      <Icon
        name={checked ? 'checkbox' : 'square-outline'}
        size={26}
        color={checked ? 'primary' : 'textTertiary'}
      />
      <View style={styles.texts}>
        {required ? <Badge label="필수" tone="primary" /> : null}
        <AppText variant={strong ? 'bodyStrong' : 'callout'} color="text">
          {label}
        </AppText>
        {detail ? (
          <AppText variant="caption" color="textTertiary">
            {detail}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    minHeight: HitSize + Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  pressed: { backgroundColor: Colors.surfaceMuted },
  texts: { flex: 1, gap: Spacing.xs },
});
