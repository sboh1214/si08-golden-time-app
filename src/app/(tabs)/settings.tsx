import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';

import { apiConfig } from '@/api';
import type { AppEnv } from '@/api/config';
import { DEFAULT_DISCLAIMER } from '@/components/domain/ai-disclaimer';
import { ConnectionStatusRow } from '@/components/settings/connection-status-row';
import { DeveloperToolsGroup } from '@/components/settings/developer-tools';
import { readAppVersion } from '@/components/settings/app-version';
import { AI_NOTICE_ITEMS, privacyNoticeItems } from '@/components/settings/notices';
import { SettingsGroup } from '@/components/settings/settings-group';
import { ActionRow, ChoiceRow, ExpandableRow, NoticeList, SwitchRow } from '@/components/settings/settings-row';
import { buildSupportMailto, readSupportEmail } from '@/components/settings/support-contact';
import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import type { ChoiceOption } from '@/components/ui/choice-chips';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { confirm, notify } from '@/lib/dialog';
import { DOCUMENT_SECTION_LABEL } from '@/lib/labels';
import { useSettings, type SettingsState } from '@/store/settings';

const LAYOUT_OPTIONS: readonly ChoiceOption<SettingsState['explanationLayout']>[] = [
  { value: 'side', label: '나란히' },
  { value: 'stack', label: '위아래' },
];

const APP_ENV_LABEL: Record<AppEnv, string> = {
  development: '개발',
  beta: '베타테스트',
  production: '정식',
};

const SUPPORT_EMAIL = readSupportEmail();
/** 예: '1.0.0 (7)' — 빌드 번호로 베타테스트 빌드를 구분한다 */
const APP_VERSION = readAppVersion();

/**
 * 설정 — 보기 설정 · 서비스 연결 · 개발자 도구(데모 서버 전용) · 정보
 *
 * 연결 방식(API 모드)·서버 주소·서버/AI 모델 버전은 개발·베타 빌드의 오류 확인용이라
 * 정식(production) 빌드에서는 숨기고 연결 상태(정상·연결 안 됨·점검 중)만 보여 준다.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const largeText = useSettings((s) => s.largeText);
  const setLargeText = useSettings((s) => s.setLargeText);
  const explanationLayout = useSettings((s) => s.explanationLayout);
  const setExplanationLayout = useSettings((s) => s.setExplanationLayout);
  const resetOnboarding = useSettings((s) => s.resetOnboarding);

  const isMock = apiConfig.mode === 'mock';
  const showDiagnostics = isMock || apiConfig.appEnv !== 'production';
  const appVersion = APP_VERSION;
  const appEnvLabel = APP_ENV_LABEL[apiConfig.appEnv];

  const replayOnboarding = async () => {
    const ok = await confirm({
      title: '처음 안내를 다시 볼까요?',
      message:
        '안내를 마치려면 AI 해설 고지와 진료기록 처리에 다시 동의해야 해요. 등록한 기록은 그대로 남아요.',
      confirmLabel: '다시 보기',
    });
    if (!ok) return;
    router.replace('/onboarding');
    resetOnboarding();
  };

  const contactSupport = async (email: string) => {
    const url = buildSupportMailto(email, {
      appVersion: `${appVersion} · ${appEnvLabel}`,
      // 웹에는 OS 버전이 없다
      device: [Platform.OS, Platform.Version].filter(Boolean).join(' '),
    });
    try {
      await Linking.openURL(url);
    } catch {
      notify(
        '메일 앱을 열지 못했어요',
        `${email} 로 메일을 보내 주세요. 앱 버전(${appVersion})을 함께 적어 주시면 더 빨리 도와드릴 수 있어요.`,
      );
    }
  };

  return (
    <Screen testID="settings-screen">
      <SettingsGroup title="보기 설정">
        <SwitchRow
          icon="text"
          title="글자 크게 보기"
          subtitle="해설 본문 글자를 더 크게 보여 줘요"
          value={largeText}
          onValueChange={setLargeText}
          testID="settings-large-text"
        />
        <View style={styles.preview} accessibilityLabel="글자 크기 미리보기">
          <AppText variant="caption" color="textTertiary">
            미리보기
          </AppText>
          <AppText variant="body" scalable>
            당화혈색소는 최근 2~3개월 동안의 평균 혈당을 보여 주는 검사예요.
          </AppText>
        </View>
        <ChoiceRow
          icon="swap-horizontal"
          title={`${DOCUMENT_SECTION_LABEL.explanation} 배치`}
          subtitle="처음 열 때 원문과 해설을 놓는 방식이에요. 화면이 좁으면 위아래로 보여 줘요"
          options={LAYOUT_OPTIONS}
          value={explanationLayout}
          onChange={setExplanationLayout}
        />
      </SettingsGroup>

      <SettingsGroup title="서비스 연결">
        {showDiagnostics ? (
          <ListRow
            icon="server-outline"
            title="API 모드"
            subtitle={
              isMock ? '내장 데모 서버 · 백엔드 없이 시연용 데이터로 동작해요' : `실서버 · ${apiConfig.baseUrl}`
            }
            right={<Badge label={isMock ? '데모' : '실서버'} tone={isMock ? 'accent' : 'primary'} />}
            testID="settings-api-mode"
          />
        ) : null}
        <ConnectionStatusRow showVersions={showDiagnostics} />
      </SettingsGroup>

      {isMock ? <DeveloperToolsGroup /> : null}

      <SettingsGroup title="정보">
        <ListRow
          icon="information-circle-outline"
          title="앱 버전"
          subtitle={`빌드 환경: ${appEnvLabel}`}
          right={
            <AppText variant="calloutStrong" color="textSecondary">
              {appVersion}
            </AppText>
          }
          testID="settings-app-version"
        />
        <ExpandableRow
          icon="sparkles-outline"
          title="AI 해설 고지"
          subtitle="AI 해설을 볼 때 꼭 알아 두세요"
          testID="settings-ai-notice">
          <AppText variant="callout" color="text">
            {DEFAULT_DISCLAIMER}
          </AppText>
          <NoticeList items={AI_NOTICE_ITEMS} />
        </ExpandableRow>
        <ExpandableRow
          icon="shield-checkmark-outline"
          title="개인정보 처리 안내"
          subtitle="어떤 정보를 어디에 저장하는지 알려 드려요"
          testID="settings-privacy">
          <NoticeList items={privacyNoticeItems(apiConfig.mode)} />
        </ExpandableRow>
        <ActionRow
          icon="refresh-circle-outline"
          title="처음 안내 다시 보기"
          subtitle="앱 사용법 안내와 동의 화면을 다시 봐요"
          onPress={() => void replayOnboarding()}
          testID="settings-replay-onboarding"
        />
        {SUPPORT_EMAIL ? (
          <ActionRow
            icon="mail-outline"
            title="메일로 문의하기"
            subtitle={`불편한 점이나 오류를 ${SUPPORT_EMAIL} 로 알려 주세요`}
            accessibilityHint="메일 앱을 열어요. 앱 버전이 미리 적혀 있어요"
            onPress={() => void contactSupport(SUPPORT_EMAIL)}
            testID="settings-contact"
          />
        ) : null}
      </SettingsGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    gap: Spacing.xs,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
});
