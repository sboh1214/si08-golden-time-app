import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { apiConfig } from '@/api';
import { toApiError } from '@/api/errors';
import { ErrorState } from '@/components/states/error-state';
import { RouteErrorBoundary } from '@/components/states/route-error-boundary';
import { Colors } from '@/constants/theme';
import { DOCUMENT_SECTION_LABEL } from '@/lib/labels';
import { useSettings, useSettingsHydrated } from '@/store/settings';

void SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  /** 딥링크·웹 새로고침으로 모달(/upload 등)에 바로 진입해도 탭 화면을 아래에 깔아 모달로 표시 */
  anchor: '(tabs)',
  /** 화면 렌더링 중 예외(계약과 다른 응답 등)는 그 화면만 오류 안내로 바꾸고 헤더·탭은 유지 */
  screenErrorBoundary: RouteErrorBoundary,
};

/** 루트 레이아웃 자체에서 난 예외의 마지막 안전망 */
export { RouteErrorBoundary as ErrorBoundary };

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 네트워크·서버 오류만 최대 2회 자동 재시도 (404·검증 오류는 즉시 오류 화면)
      retry: (failureCount, error) => toApiError(error).retryable && failureCount < 2,
      staleTime: 30_000,
    },
    mutations: { retry: 0 },
  },
});

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.text,
    border: Colors.border,
    notification: Colors.accent,
  },
};

function onAppStateChange(status: AppStateStatus) {
  // 앱이 다시 활성화되면 오래된 데이터를 갱신
  if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
}

export default function RootLayout() {
  const hydrated = useSettingsHydrated();
  const hasOnboarded = useSettings((s) => s.hasOnboarded);

  useEffect(() => {
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync();
  }, [hydrated]);

  // 저장된 설정(온보딩 여부)을 읽기 전에는 스플래시 유지 (읽기에 실패하면 기본값으로 진행)
  if (!hydrated) return null;

  // 배포용 빌드의 서버 설정이 잘못되면 데모 서버·예시 주소로 조용히 동작하지 않고 멈춘다
  if (apiConfig.misconfiguration) {
    if (__DEV__) console.error('[apiConfig]', apiConfig.misconfiguration);
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <ErrorState
          title="서비스 연결 설정이 필요해요"
          message="이 설치본은 서버 주소가 올바르게 설정되지 않았어요. 앱을 받은 곳(담당자)에 문의해 새 버전을 설치해 주세요."
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              // 배경색을 지정해 iOS 26+ 에서도 불투명 헤더를 사용 (콘텐츠가 헤더 아래에서 시작)
              headerStyle: { backgroundColor: Colors.surface },
              headerTintColor: Colors.text,
              headerTitleStyle: { fontWeight: '700' },
              headerShadowVisible: false,
              headerBackButtonDisplayMode: 'minimal',
              contentStyle: { backgroundColor: Colors.background },
            }}>
            {/*
              온보딩(AI 해설 고지·민감정보 처리 동의) 전에는 어떤 화면도 열 수 없다.
              딥링크(healthnote://upload)·웹 주소로 바로 들어와도 동의 화면으로 보낸다.
            */}
            <Stack.Protected guard={hasOnboarded} redirectTo="/onboarding">
              <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '홈' }} />
              <Stack.Screen name="upload" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="documents/[id]/index" options={{ title: DOCUMENT_SECTION_LABEL.result }} />
              <Stack.Screen
                name="documents/[id]/explanation"
                options={{ title: DOCUMENT_SECTION_LABEL.explanation }}
              />
              <Stack.Screen name="documents/[id]/labs" options={{ title: DOCUMENT_SECTION_LABEL.labs }} />
              <Stack.Screen name="labs/index" options={{ title: '내 검사 수치' }} />
              <Stack.Screen name="labs/[code]" options={{ title: '수치 변화' }} />
              <Stack.Screen name="questions/edit" options={{ presentation: 'modal', title: '질문 작성' }} />
            </Stack.Protected>
            <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="+not-found" options={{ title: '페이지 없음' }} />
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
