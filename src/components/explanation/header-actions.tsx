import { StyleSheet, View } from 'react-native';

import { HeaderButton } from '@/components/ui/header-button';
import { haptics } from '@/lib/haptics';
import { useSettings } from '@/store/settings';

import { useExplanationLayout } from './layout';

/**
 * 원문 대조 해설 화면 헤더 오른쪽 버튼.
 * - 나란히 보기 ↔ 위아래로 보기 전환 (화면이 좁아 자동으로 위아래 배치 중이면 숨김)
 * - 글자 크게 보기 켜기/끄기
 * 두 설정 모두 기기에 저장되어 다음에 열 때도 유지된다.
 */
export function ExplanationHeaderActions() {
  const { layout, preferred, autoStacked } = useExplanationLayout();
  const setLayout = useSettings((s) => s.setExplanationLayout);
  const largeText = useSettings((s) => s.largeText);
  const setLargeText = useSettings((s) => s.setLargeText);

  const isSide = layout === 'side';

  return (
    <View style={styles.row}>
      {autoStacked ? null : (
        <HeaderButton
          // 지금 배치가 아니라 '바꿀 배치'를 보여준다
          icon={isSide ? 'reorder-two-outline' : 'swap-horizontal'}
          accessibilityLabel={isSide ? '위아래로 보기' : '나란히 보기'}
          color="text"
          onPress={() => {
            haptics.selection();
            setLayout(preferred === 'side' ? 'stack' : 'side');
          }}
        />
      )}
      <HeaderButton
        icon="text"
        accessibilityLabel="글자 크게"
        active={largeText}
        onPress={() => {
          haptics.selection();
          setLargeText(!largeText);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
