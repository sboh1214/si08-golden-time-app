/**
 * 질문 노트·AI 추천 질문·타임라인 통합 테스트.
 * 내장 데모 서버(mock, 지연 0) + 메모리 라우터로 실제 화면 흐름을 검증한다.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, Tabs, useLocalSearchParams } from 'expo-router';
import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
  within,
  type RenderRouterResult,
} from 'expo-router/testing-library';

import { api } from '@/api';
import QuestionsScreen from '@/app/(tabs)/questions';
import TimelineScreen from '@/app/(tabs)/timeline';
import QuestionEditScreen from '@/app/questions/edit';
import { DEFAULT_DISCLAIMER } from '@/components/domain/ai-disclaimer';
import { LAB_FLAG_LABEL } from '@/lib/labels';
import { useSettings } from '@/store/settings';

import { SuggestedQuestionsCard } from '../suggested-questions-card';

/** 문서 화면 대신 추천 질문 카드만 띄우는 테스트용 라우트 */
function DocumentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SuggestedQuestionsCard documentId={id} />;
}

/** anchor: 앱 루트 레이아웃처럼 (tabs) 를 맨 아래에 깔아 문서 화면을 탭 위에 쌓는다 */
function createRoutes({ anchor = false }: { anchor?: boolean } = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: 0 } },
  });
  return {
    _layout: {
      default: () => (
        <QueryClientProvider client={client}>
          <Stack />
        </QueryClientProvider>
      ),
      ...(anchor ? { unstable_settings: { anchor: '(tabs)' } } : {}),
    },
    '(tabs)/_layout': () => (
      <Tabs>
        <Tabs.Screen name="questions" options={{ title: '질문 노트' }} />
        <Tabs.Screen name="timeline" options={{ title: '타임라인' }} />
      </Tabs>
    ),
    '(tabs)/questions': QuestionsScreen,
    '(tabs)/timeline': TimelineScreen,
    'questions/edit': QuestionEditScreen,
    'documents/[id]': DocumentRoute,
  };
}

/** 루트 스택에 쌓인 화면 이름 */
function rootStackRouteNames(result: RenderRouterResult): string[] {
  const root = result.getRouterState();
  const stack = root?.routes[root.index ?? 0]?.state;
  return (stack?.routes ?? []).map((route) => route.name);
}

async function firstCompletedDocument() {
  const [document] = (await api.listDocuments()).filter((d) => d.status === 'completed');
  return document;
}

async function clearQuestions() {
  const questions = await api.listQuestions();
  await Promise.all(questions.map((q) => api.deleteQuestion(q.id)));
}

beforeAll(() => {
  useSettings.getState().setMockOptions({ latencyMs: 0, failureRate: 0, forceAnalysisFailure: false });
});

beforeEach(async () => {
  // renderRouter 가 켜 둔 가짜 타이머를 되돌려 테스트 준비용 API 호출이 멈추지 않게 한다
  jest.useRealTimers();
  await clearQuestions();
});

describe('질문 노트', () => {
  it('질문이 없으면 첫 질문 쓰기 안내를 보여 준다', async () => {
    await renderRouter(createRoutes(), { initialUrl: '/questions' });
    expect(await screen.findByText('아직 저장한 질문이 없어요')).toBeTruthy();
    expect(screen.getByText('첫 질문 쓰기')).toBeTruthy();
  });

  it('체크하면 물어본 질문으로 옮겨진다', async () => {
    await api.createQuestion({ text: '혈압약은 아침에 먹어야 하나요?' });
    await renderRouter(createRoutes(), { initialUrl: '/questions' });

    expect(await screen.findByText('혈압약은 아침에 먹어야 하나요?')).toBeTruthy();
    expect(screen.getByText('직접 작성')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('진료 때 물어봤어요: 혈압약은 아침에 먹어야 하나요?'));
    // '물어볼 질문' 필터에서는 사라지고
    await waitFor(() => expect(screen.queryByText('혈압약은 아침에 먹어야 하나요?')).toBeNull());
    expect(screen.getByText('물어볼 질문을 모두 확인했어요')).toBeTruthy();

    // '물어본 질문' 필터에 나타난다
    await fireEvent.press(screen.getByTestId('question-filter-asked'));
    expect(await screen.findByText('혈압약은 아침에 먹어야 하나요?')).toBeTruthy();
    expect(screen.getByText('물어봤어요')).toBeTruthy();
  });

  it('관련 진료기록을 불러오지 못하면 공통 오류 안내를 보여 주고 다시 시도할 수 있다', async () => {
    useSettings.getState().setMockOptions({ failureRate: 1 });
    try {
      await renderRouter(createRoutes(), { initialUrl: '/questions/edit' });
      expect(await screen.findByText('진료기록을 불러오지 못했어요')).toBeTruthy();
      expect(screen.getByTestId('error-state')).toBeTruthy();

      useSettings.getState().setMockOptions({ failureRate: 0 });
      await fireEvent.press(screen.getByTestId('error-retry'));
      expect(await screen.findByText('선택 안 함')).toBeTruthy();
    } finally {
      useSettings.getState().setMockOptions({ failureRate: 0 });
    }
  });

  it('빈 질문은 저장하지 않고, 예시 문장으로 작성해 저장할 수 있다', async () => {
    await renderRouter(createRoutes(), { initialUrl: '/questions/edit' });

    await fireEvent.press(await screen.findByTestId('question-save'));
    expect(screen.getByText('질문 내용을 입력해 주세요.')).toBeTruthy();

    await fireEvent.press(screen.getByText('다음 검사는 언제 하나요?'));
    await fireEvent.press(screen.getByTestId('question-save'));

    // 저장 후 (돌아갈 화면이 없으므로) 질문 노트로 이동해 새 질문이 보인다
    await waitFor(() => expect(screen).toHavePathname('/questions'));
    expect(await screen.findByText('다음 검사는 언제 하나요?')).toBeTruthy();
    expect((await api.listQuestions()).map((q) => q.text)).toEqual(['다음 검사는 언제 하나요?']);
  });

  it('수정 화면에서 물어봤어요·답변 메모를 저장한다', async () => {
    const question = await api.createQuestion({ text: '운동은 얼마나 해야 하나요?' });
    await renderRouter(createRoutes(), {
      initialUrl: `/questions/edit?id=${question.id}`,
    });

    // 스위치 행 전체를 눌러 켠다 (작은 스위치만이 아니라 행이 스위치 역할)
    const askedSwitch = await screen.findByRole('switch', { name: '진료 때 물어봤어요' });
    expect(askedSwitch).not.toBeChecked();
    await fireEvent.press(askedSwitch);
    expect(askedSwitch).toBeChecked();
    await fireEvent.changeText(screen.getByTestId('question-answer-note'), '하루 30분 걷기');
    await fireEvent.press(screen.getByTestId('question-save'));

    // 저장이 끝나면 화면이 닫혀 질문 노트로 이동한다 (이동이 끝난 뒤 다음 테스트로 넘어가야 서로 섞이지 않음)
    await waitFor(() => expect(screen).toHavePathname('/questions'));
    const [saved] = await api.listQuestions();
    expect(saved).toMatchObject({ isAsked: true, answerNote: '하루 30분 걷기' });
  });
});

describe('AI 추천 질문 카드', () => {
  it('버튼을 누르면 추천을 받아 담을 수 있다', async () => {
    const document = await firstCompletedDocument();
    const expected = await api.suggestQuestions(document.id);

    await renderRouter(createRoutes(), { initialUrl: `/documents/${document.id}` });
    await fireEvent.press(await screen.findByTestId('suggestions-request'));

    if (expected.length === 0) {
      expect(await screen.findByText('추천할 새 질문이 없어요')).toBeTruthy();
      return;
    }
    await fireEvent.press(await screen.findByTestId('suggestions-add-all'));
    expect(await screen.findByText('추천 질문을 모두 질문 노트에 담았어요')).toBeTruthy();
    const saved = await api.listQuestions({ documentId: document.id });
    expect(saved.filter((q) => q.source === 'ai').map((q) => q.text).sort()).toEqual([...expected].sort());
  });

  it('질문 노트 보기는 탭을 새로 쌓지 않고 아래에 있는 탭의 질문 노트로 돌아간다', async () => {
    const document = await firstCompletedDocument();
    const result = await renderRouter(createRoutes({ anchor: true }), {
      initialUrl: `/documents/${document.id}`,
    });
    expect(rootStackRouteNames(result)).toEqual(['(tabs)', 'documents/[id]']);

    await fireEvent.press(await screen.findByTestId('suggestions-request'));
    await fireEvent.press(await screen.findByText('질문 노트 보기'));

    await waitFor(() => expect(screen).toHavePathname('/questions'));
    expect(rootStackRouteNames(result)).toEqual(['(tabs)']);
  });

  it('담은 추천 질문은 기록을 다시 열어도 또 담기로 보이지 않는다', async () => {
    const document = await firstCompletedDocument();
    const expected = await api.suggestQuestions(document.id);
    expect(expected.length).toBeGreaterThan(1);
    const [first, ...rest] = expected;

    await renderRouter(createRoutes({ anchor: true }), { initialUrl: `/documents/${document.id}` });
    await fireEvent.press(await screen.findByTestId('suggestions-request'));
    await screen.findByText(first);
    await fireEvent.press(screen.getAllByText('담기')[0]);
    expect(await screen.findByText('담았어요')).toBeTruthy();

    // 질문 노트로 갔다가 담은 질문의 관련 기록을 눌러 같은 기록을 다시 연다 (추천 캐시는 아직 신선함)
    await fireEvent.press(screen.getByText('질문 노트 보기'));
    await waitFor(() => expect(screen).toHavePathname('/questions'));
    await fireEvent.press(await screen.findByLabelText(/^관련 기록:/));
    await waitFor(() => expect(screen).toHavePathname(`/documents/${document.id}`));

    await fireEvent.press(await screen.findByTestId('suggestions-request'));
    const card = await screen.findByTestId('suggested-questions-card');
    await waitFor(() => expect(within(card).getAllByText('담기')).toHaveLength(rest.length));
    expect(within(card).queryByText(first)).toBeNull();
    expect((await api.listQuestions()).filter((q) => q.text === first)).toHaveLength(1);
  });
});

describe('타임라인', () => {
  it('요약과 분류 필터 또는 빈 상태를 보여 준다', async () => {
    const events = await api.getTimeline();
    await renderRouter(createRoutes(), { initialUrl: '/timeline' });
    if (events.length === 0) {
      expect(await screen.findByText('아직 타임라인에 쌓인 기록이 없어요')).toBeTruthy();
      return;
    }
    expect(await screen.findByTestId('timeline-filter-all')).toBeTruthy();
    expect(screen.getByText(events[0].title)).toBeTruthy();
  });

  it('AI 해설 고지를 보여 주고, 검사 판정을 스크린리더 라벨에도 담는다', async () => {
    const flagged = (await api.getTimeline()).find((e) => e.type === 'lab' && e.flag);
    if (!flagged?.flag) throw new Error('판정이 있는 검사 이벤트가 데모 데이터에 있어야 해요');
    await renderRouter(createRoutes(), { initialUrl: '/timeline' });

    expect(await screen.findByText(DEFAULT_DISCLAIMER)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('timeline-filter-lab'));
    expect(await screen.findByTestId(`timeline-event-${flagged.id}`)).toHaveProp(
      'accessibilityLabel',
      expect.stringContaining(`, ${LAB_FLAG_LABEL[flagged.flag]}.`),
    );
  });
});
