/**
 * ② 구조화 결과 화면 — 등록한 문서에서 추출한 진단명·검사 항목·처방 약물을 항목별로 보여준다.
 *
 * - 로딩·AI 처리 중·분석 실패·오류 상태는 DocumentGate 가 일괄 처리한다.
 * - 헤더 오른쪽 휴지통 버튼으로 문서를 삭제할 수 있다 (처리 중·실패 문서 포함).
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { getErrorMessage } from '@/api/errors';
import { DocumentGate } from '@/components/domain/document-gate';
import { DocumentResultContent } from '@/components/result/document-result-content';
import { HeaderButton } from '@/components/ui/header-button';
import { Colors } from '@/constants/theme';
import { useDeleteDocument, useDocument } from '@/hooks/api';
import { confirm, notify } from '@/lib/dialog';
import { haptics } from '@/lib/haptics';

/** 헤더 제목 최대 글자 수 (뒤로가기·삭제 버튼과 겹치지 않도록) */
const HEADER_TITLE_MAX = 14;

function shortTitle(title: string): string {
  return title.length > HEADER_TITLE_MAX ? `${title.slice(0, HEADER_TITLE_MAX).trimEnd()}…` : title;
}

export default function DocumentResultScreen() {
  // 생성 파일(.expo/types)이 없는 새 클론에서도 타입 검사가 통과하도록 라우트 문자열 대신 파라미터 타입을 직접 쓴다
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const deleteDocument = useDeleteDocument();
  const deleted = deleteDocument.isSuccess;

  // 헤더 제목·삭제 버튼용. DocumentGate 와 같은 쿼리 키를 쓰므로 요청은 한 번만 나간다.
  // 삭제가 끝나면 조회를 멈춰, 화면을 떠나는 동안 404 재요청·오류 화면이 깜빡이지 않게 한다.
  const { data: document } = useDocument(deleted ? undefined : id);

  const handleDelete = async () => {
    if (!document) return;
    const ok = await confirm({
      title: '이 진료기록을 삭제할까요?',
      message: '정리 결과와 해설, 검사 수치 기록이 함께 삭제되고 되돌릴 수 없어요.\n질문 노트에 적어 둔 질문은 그대로 남아요.',
      confirmLabel: '삭제',
      destructive: true,
    });
    if (!ok) return;
    deleteDocument.mutate(document.id, {
      onSuccess: () => {
        haptics.success();
        if (router.canGoBack()) router.back();
        else router.replace('/records');
      },
      onError: (error) => {
        haptics.error();
        notify('진료기록을 삭제하지 못했어요', getErrorMessage(error));
      },
    });
  };

  return (
    <>
      <Stack.Screen
        options={
          document
            ? {
                title: shortTitle(document.title),
                headerRight: () => (
                  <HeaderButton
                    icon="trash-outline"
                    accessibilityLabel="기록 삭제"
                    accessibilityHint="이 진료기록과 정리 결과를 삭제해요"
                    color="danger"
                    loading={deleteDocument.isPending}
                    onPress={() => void handleDelete()}
                    testID="document-delete"
                  />
                ),
              }
            : {}
        }
      />
      {deleted ? (
        <View style={styles.placeholder} />
      ) : (
        <DocumentGate documentId={id}>
          {(doc, analysis) => <DocumentResultContent document={doc} analysis={analysis} />}
        </DocumentGate>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  placeholder: { flex: 1, backgroundColor: Colors.background },
});
