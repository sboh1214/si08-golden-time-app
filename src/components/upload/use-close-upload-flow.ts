import { useRouter } from 'expo-router';

/**
 * 문서 등록 모달 닫기.
 *
 * 등록 스택(upload/_layout)의 첫 화면에서 뒤로 가기를 하면 스택이 처리하지 못한 동작이
 * 상위(루트) 스택으로 전달되어 모달 자체가 닫힌다. 그래서 '닫기'를 제공하는 화면
 * (등록 방법 선택, 분석 진행)은 항상 등록 스택의 첫 화면이 되도록 이동한다.
 * 링크로 바로 들어와 돌아갈 화면이 없으면 홈으로 교체한다.
 */
export function useCloseUploadFlow(): () => void {
  const router = useRouter();
  return () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
}
