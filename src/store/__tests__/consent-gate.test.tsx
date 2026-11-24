/**
 * 온보딩(AI 해설 고지·민감정보 처리 동의) 게이트 통합 테스트.
 * 실제 루트 레이아웃(`src/app/_layout.tsx`)을 메모리 라우터에 올려,
 * 동의 전에는 딥링크·웹 주소로 어떤 화면에 바로 들어와도 동의 화면으로 가는지 확인한다.
 */
import { Stack, Tabs } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import * as RootLayoutModule from '@/app/_layout';

import { useSettings } from '../settings';

function page(label: string) {
  const Page = () => <Text>{label}</Text>;
  Page.displayName = `Page(${label})`;
  return Page;
}

function routes() {
  return {
    _layout: RootLayoutModule,
    '(tabs)/_layout': () => <Tabs />,
    '(tabs)/index': page('홈 화면'),
    onboarding: page('동의 화면'),
    'upload/_layout': () => <Stack />,
    'upload/index': page('등록 화면'),
    'upload/review': page('등록 정보 확인 화면'),
    'documents/[id]/index': page('정리 결과 화면'),
    'documents/[id]/explanation': page('원문 대조 해설 화면'),
    'documents/[id]/labs': page('문서 검사 수치 화면'),
    'labs/index': page('내 검사 수치 화면'),
    'labs/[code]': page('검사 추이 화면'),
    'questions/edit': page('질문 작성 화면'),
    '+not-found': page('페이지 없음 화면'),
  };
}

const initialState = useSettings.getState();

afterEach(() => {
  useSettings.setState(initialState, true);
});

describe('온보딩 동의 게이트', () => {
  it.each([
    ['/', '홈 화면'],
    ['/upload', '등록 화면'],
    ['/upload/review', '등록 정보 확인 화면'],
    ['/documents/doc_1', '정리 결과 화면'],
    ['/documents/doc_1/explanation', '원문 대조 해설 화면'],
    ['/labs', '내 검사 수치 화면'],
    ['/labs/hba1c', '검사 추이 화면'],
    ['/questions/edit', '질문 작성 화면'],
  ])('동의 전에 %s 로 바로 들어오면 동의 화면으로 보낸다', async (url, protectedLabel) => {
    useSettings.setState({ hasOnboarded: false });
    await renderRouter(routes(), { initialUrl: url });

    expect(await screen.findByText('동의 화면')).toBeTruthy();
    expect(screen).toHavePathname('/onboarding');
    expect(screen.queryByText(protectedLabel)).toBeNull();
  });

  it('동의를 마친 뒤에는 딥링크 화면이 그대로 열린다', async () => {
    useSettings.setState({ hasOnboarded: true });
    await renderRouter(routes(), { initialUrl: '/upload' });

    expect(await screen.findByText('등록 화면')).toBeTruthy();
    expect(screen).toHavePathname('/upload');
  });
});
