import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, Typography } from '@/constants/theme';

function tabIcon(name: IconName, focusedName: IconName) {
  // eslint-disable-next-line react/display-name
  return ({ focused, color }: { focused: boolean; color: ColorValue }) => (
    <Icon
      name={focused ? focusedName : name}
      size={24}
      color={typeof color === 'string' ? color : focused ? Colors.primary : Colors.textTertiary}
    />
  );
}

/** 탭 항목 높이 (아이콘 24 + 라벨 줄 높이 18 + 항목 안쪽 여백) */
const TAB_BAR_CONTENT_HEIGHT = 58;
const TAB_BAR_TOP_PADDING = 4;
/** 홈 인디케이터가 없는 기기·웹에서도 라벨 아래 최소 여백 */
const TAB_BAR_MIN_BOTTOM_PADDING = 8;

/** 하단 탭. 온보딩(동의) 전 접근 차단은 루트 레이아웃의 `Stack.Protected` 가 모든 화면에 일괄 적용한다. */
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // 기본 탭바(49pt)는 13pt 라벨 + 24pt 아이콘에 비해 낮아 라벨 아랫부분이 잘린다 → 높이를 넉넉히
  const bottomPadding = Math.max(insets.bottom, TAB_BAR_MIN_BOTTOM_PADDING);
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + TAB_BAR_TOP_PADDING + bottomPadding;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        // 앱 글자 크기 체계의 가장 작은 크기(caption 13)에 맞춘다
        tabBarLabelStyle: {
          fontSize: Typography.captionStrong.fontSize,
          lineHeight: Typography.captionStrong.lineHeight,
          fontWeight: Typography.captionStrong.fontWeight,
        },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: tabBarHeight,
          paddingTop: TAB_BAR_TOP_PADDING,
          paddingBottom: bottomPadding,
        },
        // 탭 항목 기본 높이(49)에서는 라벨 줄 높이(18)가 11pt 로 눌려 잘리므로 항목 높이도 함께 키운다
        tabBarItemStyle: { height: TAB_BAR_CONTENT_HEIGHT },
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: Colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: '홈', headerShown: false, tabBarIcon: tabIcon('home-outline', 'home') }}
      />
      <Tabs.Screen
        name="records"
        options={{ title: '내 기록', tabBarIcon: tabIcon('folder-open-outline', 'folder-open') }}
      />
      <Tabs.Screen
        name="timeline"
        options={{ title: '타임라인', tabBarIcon: tabIcon('git-commit-outline', 'git-commit') }}
      />
      <Tabs.Screen
        name="questions"
        options={{ title: '질문 노트', tabBarIcon: tabIcon('chatbubbles-outline', 'chatbubbles') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: '설정', tabBarIcon: tabIcon('settings-outline', 'settings') }}
      />
    </Tabs>
  );
}
