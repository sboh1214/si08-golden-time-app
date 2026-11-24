/**
 * 햅틱 피드백 (웹에서는 무시).
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

function run(fn: () => Promise<void>) {
  if (Platform.OS === 'web') return;
  fn().catch(() => undefined);
}

export const haptics = {
  /** 가벼운 선택 (체크, 칩 선택) */
  selection: () => run(() => Haptics.selectionAsync()),
  /** 완료 (업로드 성공, 질문 저장) */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** 경고·오류 */
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  /** 버튼 탭 */
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
};
