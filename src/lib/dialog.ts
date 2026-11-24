/**
 * 확인/알림 대화상자 — 네이티브는 Alert, 웹은 window.confirm/alert.
 * (react-native-web 의 Alert.alert 는 동작하지 않으므로 반드시 이 헬퍼를 사용한다)
 */
import { Alert, Platform } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 삭제 등 되돌릴 수 없는 동작이면 true (빨간 버튼) */
  destructive?: boolean;
}

/** 사용자가 확인을 누르면 true */
export function confirm({
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(text) : false);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/** 단순 알림 */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
