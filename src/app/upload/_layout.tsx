import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

/** 문서 등록 플로우 (모달): 등록 방법 선택 → 미리보기·정보 입력 → 업로드·분석 진행 */
export default function UploadLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: Colors.background },
      }}>
      <Stack.Screen name="index" options={{ title: '진료기록 등록' }} />
      <Stack.Screen name="review" options={{ title: '등록 정보 확인' }} />
      <Stack.Screen name="progress" options={{ title: '해설 만드는 중', gestureEnabled: false, headerBackVisible: false }} />
    </Stack>
  );
}
