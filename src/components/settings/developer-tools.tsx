import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { getMockClient } from '@/api';
import { getErrorMessage } from '@/api/errors';
import type { ChoiceOption } from '@/components/ui/choice-chips';
import { confirm, notify } from '@/lib/dialog';
import { haptics } from '@/lib/haptics';
import { useSettings } from '@/store/settings';

import { SettingsGroup } from './settings-group';
import { ActionRow, ChoiceRow, SwitchRow } from './settings-row';

const LATENCY_OPTIONS: readonly ChoiceOption<number>[] = [
  { value: 0, label: '없음' },
  { value: 500, label: '0.5초' },
  { value: 1500, label: '1.5초' },
  { value: 3000, label: '3초' },
];

const FAILURE_RATE_OPTIONS: readonly ChoiceOption<number>[] = [
  { value: 0, label: '0%' },
  { value: 0.2, label: '20%' },
  { value: 0.5, label: '50%' },
];

const PIPELINE_OPTIONS: readonly ChoiceOption<number>[] = [
  { value: 4_000, label: '빠르게 4초' },
  { value: 9_000, label: '보통 9초' },
  { value: 20_000, label: '느리게 20초' },
];

/**
 * 개발자 도구 — 내장 데모 서버(mock 모드)에서만 표시.
 * 베타테스트·시연 때 로딩·오류·분석 실패 화면을 직접 재현해 볼 수 있다.
 */
export function DeveloperToolsGroup() {
  const mock = useSettings((s) => s.mock);
  const setMockOptions = useSettings((s) => s.setMockOptions);
  const queryClient = useQueryClient();
  const [resetting, setResetting] = useState(false);

  const resetDemoData = async () => {
    const ok = await confirm({
      title: '데모 데이터를 초기화할까요?',
      message: '직접 등록한 기록과 질문이 모두 지워지고 처음 샘플 데이터로 돌아가요. 되돌릴 수 없어요.',
      confirmLabel: '초기화',
      destructive: true,
    });
    if (!ok) return;
    setResetting(true);
    try {
      await getMockClient()?.resetDemoData();
      // 캐시를 비우고 화면에 보이는 데이터를 새로 불러온다
      await queryClient.resetQueries();
      haptics.success();
      notify('데모 데이터를 초기화했어요');
    } catch (error) {
      haptics.error();
      notify('초기화하지 못했어요', getErrorMessage(error));
    } finally {
      setResetting(false);
    }
  };

  return (
    <SettingsGroup
      title="개발자 도구"
      badge={{ label: '베타테스트·시연용', tone: 'accent', icon: 'construct-outline' }}
      description="내장 데모 서버의 동작을 바꿔 로딩·오류·분석 실패 화면을 확인할 수 있어요. 실서버에 연결된 앱에서는 보이지 않아요."
      testID="settings-developer-tools">
      <ChoiceRow
        icon="timer-outline"
        iconColor="caution"
        iconBackground="cautionSoft"
        title="응답 지연"
        subtitle="모든 요청에 평균 이만큼 기다렸다 응답해요"
        options={LATENCY_OPTIONS}
        value={mock.latencyMs}
        onChange={(latencyMs) => setMockOptions({ latencyMs })}
      />
      <ChoiceRow
        icon="warning-outline"
        iconColor="caution"
        iconBackground="cautionSoft"
        title="오류 발생률"
        subtitle="요청이 네트워크·서버 오류로 실패할 확률이에요"
        options={FAILURE_RATE_OPTIONS}
        value={mock.failureRate}
        onChange={(failureRate) => setMockOptions({ failureRate })}
      />
      <SwitchRow
        icon="close-circle-outline"
        iconColor="caution"
        iconBackground="cautionSoft"
        title="다음 업로드 분석 실패시키기"
        subtitle="다음에 등록하는 기록 1건의 AI 분석이 실패해요 (적용 후 자동으로 꺼져요)"
        value={mock.forceAnalysisFailure}
        onValueChange={(forceAnalysisFailure) => setMockOptions({ forceAnalysisFailure })}
        testID="settings-force-failure"
      />
      <ChoiceRow
        icon="hourglass-outline"
        iconColor="caution"
        iconBackground="cautionSoft"
        title="AI 처리 시간"
        subtitle="업로드 후 해설이 완성될 때까지 걸리는 시간이에요"
        options={PIPELINE_OPTIONS}
        value={mock.pipelineDurationMs}
        onChange={(pipelineDurationMs) => setMockOptions({ pipelineDurationMs })}
      />
      <ActionRow
        icon="trash-outline"
        iconColor="danger"
        iconBackground="dangerSoft"
        title="데모 데이터 초기화"
        subtitle="처음 샘플 데이터 상태로 되돌려요"
        accessibilityHint="등록한 기록과 질문을 지우고 처음 샘플 데이터로 되돌려요"
        destructive
        busy={resetting}
        onPress={() => void resetDemoData()}
        testID="settings-reset-demo"
      />
    </SettingsGroup>
  );
}
