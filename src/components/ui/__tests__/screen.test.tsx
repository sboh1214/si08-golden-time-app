import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

import { Screen, type ScreenProps } from '../screen';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** 텍스트를 감싼 가장 가까운 콘텐츠 컨테이너(ScrollView 는 contentContainerStyle)의 위쪽 여백 */
function containerPaddingTop(text: string): number | undefined {
  let node = screen.getByText(text).parent;
  while (node) {
    const padding = StyleSheet.flatten(node.props.contentContainerStyle ?? node.props.style)?.paddingTop;
    if (typeof padding === 'number') return padding;
    node = node.parent;
  }
  return undefined;
}

async function renderScreen(props: Omit<ScreenProps, 'children'>) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <Screen {...props}>
        <Text>내용</Text>
      </Screen>
    </SafeAreaProvider>,
  );
}

describe('Screen 상단 안전 영역', () => {
  it('스크롤 화면에서 safeTop 여백이 기본 스크롤 여백에 덮어써지지 않는다 (상태 표시줄 겹침 방지)', async () => {
    await renderScreen({ safeTop: true });
    expect(containerPaddingTop('내용')).toBe(METRICS.insets.top + Spacing.lg);
  });

  it('safeTop 이 없으면 기본 스크롤 여백만 둔다', async () => {
    await renderScreen({});
    expect(containerPaddingTop('내용')).toBe(Spacing.lg);
  });

  it('스크롤하지 않는 화면에도 safeTop 여백을 적용한다', async () => {
    await renderScreen({ safeTop: true, scroll: false });
    expect(containerPaddingTop('내용')).toBe(METRICS.insets.top + Spacing.lg);
  });
});
