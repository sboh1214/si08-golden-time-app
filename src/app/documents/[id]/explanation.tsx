import { Stack, useLocalSearchParams } from 'expo-router';

import { DocumentGate } from '@/components/domain/document-gate';
import { ExplanationView } from '@/components/explanation/explanation-view';
import { ExplanationHeaderActions } from '@/components/explanation/header-actions';
import { Screen } from '@/components/ui/screen';

type ExplanationParams = {
  id: string;
  /** 선택: 진입 후 스크롤해 강조할 원문 문장 id (ExplainedSentence.id) */
  sentenceId?: string;
};

/** 같은 키가 여러 번 오면 배열이 될 수 있어 첫 값만 쓴다 */
function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** 헤더 오른쪽: 나란히/위아래 보기 전환 · 글자 크게 (렌더마다 새 객체가 생기지 않게 모듈 상수로 둔다) */
const SCREEN_OPTIONS = {
  headerRight: () => <ExplanationHeaderActions />,
};

/**
 * ③ 원문 대조 해설 — 진료기록 원문 문장과 환자 눈높이 해설을 나란히 보여준다.
 *
 * 이동 예) router.push({ pathname: '/documents/[id]/explanation', params: { id, sentenceId } })
 * 문서 조회·AI 처리 중·실패·해설 조회 상태는 DocumentGate 가 처리한다.
 */
export default function ExplanationScreen() {
  const params = useLocalSearchParams<ExplanationParams>();
  const documentId = firstParam(params.id);
  const sentenceId = firstParam(params.sentenceId);

  return (
    <Screen scroll={false} padded={false} wide testID="explanation-screen">
      <Stack.Screen options={SCREEN_OPTIONS} />
      <DocumentGate documentId={documentId}>
        {(document, analysis) => (
          <ExplanationView
            key={document.id}
            document={document}
            analysis={analysis}
            targetSentenceId={sentenceId}
          />
        )}
      </DocumentGate>
    </Screen>
  );
}
