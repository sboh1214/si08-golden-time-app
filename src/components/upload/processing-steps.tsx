import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { PROCESSING_STEPS } from '@/lib/labels';
import type { ProcessingStatus } from '@/types/domain';

type StepState = 'done' | 'active' | 'pending';

const STATE_LABEL: Record<StepState, string> = {
  done: '완료',
  active: '진행 중',
  pending: '대기',
};

const INDICATOR_SIZE = 28;

/**
 * 현재 처리 상태에서 몇 번째 단계가 진행 중인지.
 * 문서가 서버에 등록된 뒤에만 이 화면에 오므로 '문서 업로드' 단계는 항상 완료로 본다
 * (`uploaded` = 전송 완료 후 글자 인식 대기).
 */
function activeStepIndex(status: Exclude<ProcessingStatus, 'failed'>): number {
  if (status === 'completed') return PROCESSING_STEPS.length;
  const index = PROCESSING_STEPS.findIndex((step) => step.status === status);
  return Math.max(index, 1);
}

/** AI 해설 처리 단계 (세로 스텝퍼: 완료 ✓ / 진행 중 / 대기) */
export function ProcessingSteps({ status }: { status: Exclude<ProcessingStatus, 'failed'> }) {
  const active = activeStepIndex(status);
  return (
    <View testID="processing-steps">
      {PROCESSING_STEPS.map((step, index) => {
        const state: StepState = index < active ? 'done' : index === active ? 'active' : 'pending';
        const isLast = index === PROCESSING_STEPS.length - 1;
        return (
          <View
            key={step.status}
            style={styles.row}
            accessible
            accessibilityLabel={`${index + 1}단계 ${step.title}, ${STATE_LABEL[state]}. ${step.description}`}>
            <View style={styles.rail}>
              <StepIndicator state={state} number={index + 1} />
              {!isLast ? <View style={[styles.line, state === 'done' && styles.lineDone]} /> : null}
            </View>
            <View style={[styles.texts, !isLast && styles.textsSpaced]}>
              <View style={styles.titleRow}>
                <AppText variant="bodyStrong" color={state === 'pending' ? 'textTertiary' : 'text'}>
                  {step.title}
                </AppText>
                <AppText
                  variant="captionStrong"
                  color={state === 'done' ? 'normal' : state === 'active' ? 'primary' : 'textTertiary'}>
                  {STATE_LABEL[state]}
                </AppText>
              </View>
              <AppText variant="callout" color={state === 'pending' ? 'textTertiary' : 'textSecondary'}>
                {step.description}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function StepIndicator({ state, number }: { state: StepState; number: number }) {
  if (state === 'done') {
    return (
      <View style={[styles.indicator, styles.indicatorDone]}>
        <Icon name="checkmark" size={18} color="onPrimary" />
      </View>
    );
  }
  if (state === 'active') {
    return (
      <View style={[styles.indicator, styles.indicatorActive]}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }
  return (
    <View style={[styles.indicator, styles.indicatorPending]}>
      <AppText variant="captionStrong" color="textTertiary">
        {number}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.md },
  rail: { alignItems: 'center', width: INDICATOR_SIZE },
  indicator: {
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorDone: { backgroundColor: Colors.primary },
  indicatorActive: { borderWidth: 2, borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  indicatorPending: { borderWidth: 1.5, borderColor: Colors.borderStrong, backgroundColor: Colors.surface },
  line: { flex: 1, width: 2, minHeight: Spacing.lg, marginVertical: Spacing.xs, backgroundColor: Colors.border },
  lineDone: { backgroundColor: Colors.primary },
  texts: { flex: 1, gap: Spacing.xxs, paddingTop: 1 },
  textsSpaced: { paddingBottom: Spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
});
