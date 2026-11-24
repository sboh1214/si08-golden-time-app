import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/states/empty-state';
import { Screen } from '@/components/ui/screen';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen scroll={false}>
      <EmptyState
        fill
        icon="help-circle-outline"
        title="페이지를 찾을 수 없어요"
        description="주소가 바뀌었거나 삭제된 화면이에요."
        actionLabel="홈으로 가기"
        onAction={() => router.replace('/')}
      />
    </Screen>
  );
}
