/**
 * 문서 등록 흐름 통합 테스트.
 * 내장 데모 서버(mock) + 메모리 라우터로 실제 화면 이동(모달 열기 → 정보 입력 → 업로드 → 진행 → 결과)을 검증한다.
 * 시스템 사진 선택 창만 mock 으로 대체한다.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { act, fireEvent, renderRouter, screen, testRouter, waitFor } from 'expo-router/testing-library';
import * as ImagePicker from 'expo-image-picker';
import { Platform, Text } from 'react-native';

import { api } from '@/api';
import { ApiError } from '@/api/errors';
import UploadSourceScreen from '@/app/upload/index';
import UploadLayout from '@/app/upload/_layout';
import UploadProgressScreen from '@/app/upload/progress';
import UploadReviewScreen from '@/app/upload/review';
import { ANALYSIS_FAILED_TITLE } from '@/lib/labels';
import { useSettings } from '@/store/settings';
import { useUploadDraft } from '@/store/upload-draft';

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  getPendingResultAsync: jest.fn(),
}));

const launchLibrary = jest.mocked(ImagePicker.launchImageLibraryAsync);
const launchCamera = jest.mocked(ImagePicker.launchCameraAsync);
const requestCamera = jest.mocked(ImagePicker.requestCameraPermissionsAsync);
const getPendingResult = jest.mocked(ImagePicker.getPendingResultAsync);

/** 처리 완료까지 기다리는 시간 (폴링 간격 1.5초 + 여유) */
const PIPELINE_TIMEOUT = { timeout: 6000 };

/**
 * 한 테스트에서 허용하는 문서 단건 조회 횟수.
 * 진행 화면은 1.5초 간격으로만 다시 조회해야 한다. 무한 재조회가 생기면 메모리 부족으로
 * 테스트 프로세스가 죽지 않도록 이 횟수를 넘는 순간 오류로 끊고 실패시킨다.
 */
const DOCUMENT_FETCH_BUDGET = 20;
let documentFetches = 0;

function HomeRoute() {
  return <Text>홈 화면</Text>;
}

function DocumentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Text>{`문서 상세 ${id}`}</Text>;
}

function createRoutes() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: 0 } },
  });
  return {
    _layout: () => (
      <QueryClientProvider client={client}>
        <Stack>
          <Stack.Screen name="upload" options={{ presentation: 'modal', headerShown: false }} />
        </Stack>
      </QueryClientProvider>
    ),
    index: HomeRoute,
    'upload/_layout': UploadLayout,
    'upload/index': UploadSourceScreen,
    'upload/review': UploadReviewScreen,
    'upload/progress': UploadProgressScreen,
    'documents/[id]': DocumentRoute,
  };
}

function imageAsset(n: number): ImagePicker.ImagePickerAsset {
  return {
    uri: `file:///cache/page-${n}.jpg`,
    fileName: `page-${n}.jpg`,
    mimeType: 'image/jpeg',
    fileSize: 500_000,
    width: 1200,
    height: 1600,
    type: 'image',
  };
}

/** 홈 위에 등록 모달을 띄운 상태로 시작 */
async function openUploadModal() {
  await renderRouter(createRoutes(), { initialUrl: '/' });
  await testRouter.push('/upload');
  expect(await screen.findByText('진료기록을 올려 주세요')).toBeTruthy();
}

/** 사진 2장을 골라 정보 입력 화면까지 */
async function pickTwoPhotos() {
  launchLibrary.mockResolvedValue({ canceled: false, assets: [imageAsset(1), imageAsset(2)] });
  await fireEvent.press(screen.getByTestId('upload-source-gallery'));
  expect(await screen.findByTestId('upload-review-screen')).toBeTruthy();
}

async function fillRequiredAndSubmit() {
  await fireEvent.changeText(screen.getByTestId('upload-hospital'), '서울내과의원');
  await fireEvent.press(screen.getByTestId('upload-visit-date-quick-today'));
  await fireEvent.press(screen.getByTestId('upload-submit'));
}

beforeEach(() => {
  jest.clearAllMocks();
  useUploadDraft.getState().reset();
  useSettings
    .getState()
    .setMockOptions({ latencyMs: 0, failureRate: 0, forceAnalysisFailure: false, pipelineDurationMs: 1 });

  documentFetches = 0;
  const getDocument = api.getDocument.bind(api);
  jest.spyOn(api, 'getDocument').mockImplementation((id) => {
    documentFetches += 1;
    if (documentFetches > DOCUMENT_FETCH_BUDGET) {
      return Promise.reject(new ApiError('SERVER', { message: 'document refetch loop detected' }));
    }
    return getDocument(id);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('문서 등록 흐름', () => {
  it('사진 선택 → 정보 입력 → 업로드 → 해설 완료 → 결과 화면으로 이동한다', async () => {
    await openUploadModal();
    await pickTwoPhotos();

    expect(launchLibrary).toHaveBeenCalledWith(expect.objectContaining({ selectionLimit: 10 }));
    expect(screen.getByLabelText('1쪽 미리보기')).toBeTruthy();
    expect(screen.getByLabelText('2쪽 미리보기')).toBeTruthy();

    // 필수 항목을 비운 채 제출하면 항목별 안내
    await fireEvent.press(screen.getByTestId('upload-submit'));
    expect(await screen.findByText('병원 이름을 입력해 주세요.')).toBeTruthy();
    expect(screen.getByText('진료일을 입력해 주세요.')).toBeTruthy();

    // 진료일은 숫자만 입력해도 형식이 맞춰진다
    await fireEvent.changeText(screen.getByTestId('upload-visit-date'), '20260312');
    expect(screen.getByDisplayValue('2026-03-12')).toBeTruthy();

    await fillRequiredAndSubmit();

    expect(await screen.findByTestId('upload-progress-screen', undefined, PIPELINE_TIMEOUT)).toBeTruthy();
    expect(screen).toHavePathname('/upload/progress');
    // 업로드가 끝나면 임시 선택(사진 경로)을 비운다
    expect(useUploadDraft.getState().files).toHaveLength(0);

    expect(await screen.findByText('해설이 완성됐어요', undefined, PIPELINE_TIMEOUT)).toBeTruthy();
    // 결과 화면과 같은 이름(진단 · 검사 · 처방 약)으로 개수를 보여준다
    expect(screen.getByTestId('analysis-summary')).toBeTruthy();
    expect(screen.getByText('처방 약')).toBeTruthy();
    expect(documentFetches).toBeLessThanOrEqual(DOCUMENT_FETCH_BUDGET);

    await fireEvent.press(screen.getByTestId('progress-open-result'));
    const detail = await screen.findByText(/^문서 상세 /);
    const documentId = String(detail.props.children).replace('문서 상세 ', '');
    expect(screen).toHavePathname(`/documents/${documentId}`);

    // 결과 화면에서 뒤로 가면 등록 모달이 아니라 원래 화면으로 돌아간다
    await act(() => testRouter.back());
    expect(await screen.findByText('홈 화면')).toBeTruthy();
  });

  it('진행 화면에서 닫으면 등록 모달 전체가 닫힌다', async () => {
    await openUploadModal();
    await pickTwoPhotos();
    await fillRequiredAndSubmit();

    expect(await screen.findByTestId('upload-progress-screen', undefined, PIPELINE_TIMEOUT)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('progress-close'));

    expect(await screen.findByText('홈 화면')).toBeTruthy();
    expect(screen).toHavePathname('/');
  });

  it('페이지 순서를 바꾸고 뺄 수 있다', async () => {
    await openUploadModal();
    await pickTwoPhotos();

    await fireEvent.press(screen.getByLabelText('1쪽을 뒤로 옮기기'));
    expect(useUploadDraft.getState().files.map((f) => f.name)).toEqual(['page-2.jpg', 'page-1.jpg']);
  });

  it('분석에 실패하면 이유를 보여주고 다시 분석할 수 있다', async () => {
    useSettings.getState().setMockOptions({ forceAnalysisFailure: true });
    await openUploadModal();
    await pickTwoPhotos();
    await fillRequiredAndSubmit();

    expect(await screen.findByText(ANALYSIS_FAILED_TITLE, undefined, PIPELINE_TIMEOUT)).toBeTruthy();
    // 사진 보관함에서 고른 문서이므로 '다시 촬영'이 아니라 다른 사진을 고르도록 안내
    expect(screen.getByText('다른 사진 고르기')).toBeTruthy();
    expect(screen.queryByText('다시 촬영하기')).toBeNull();

    await fireEvent.press(screen.getByTestId('progress-reanalyze'));
    expect(await screen.findByText('해설이 완성됐어요', undefined, PIPELINE_TIMEOUT)).toBeTruthy();
  });

  it('진행 중 재조회만 실패하면 진행 화면을 유지하고 다시 불러오기 안내를 띄운다', async () => {
    useSettings.getState().setMockOptions({ pipelineDurationMs: 60_000 });
    await openUploadModal();
    await pickTwoPhotos();
    await fillRequiredAndSubmit();
    expect(await screen.findByTestId('upload-progress-screen', undefined, PIPELINE_TIMEOUT)).toBeTruthy();

    jest.mocked(api.getDocument).mockRejectedValue(new ApiError('NETWORK', { message: 'offline' }));
    expect(await screen.findByTestId('refresh-error-banner', undefined, PIPELINE_TIMEOUT)).toBeTruthy();
    // 전체 오류 화면으로 바뀌지 않고 진행률·처리 단계를 계속 보여 준다
    expect(screen.getByTestId('upload-progress-screen')).toBeTruthy();
    expect(screen.queryByTestId('error-state')).toBeNull();
  });

  it('업로드에 실패하면 화면 안에서 이유를 알리고 다시 시도할 수 있다', async () => {
    await openUploadModal();
    await pickTwoPhotos();
    useSettings.getState().setMockOptions({ failureRate: 1 });
    await fillRequiredAndSubmit();

    expect(await screen.findByTestId('upload-error', undefined, PIPELINE_TIMEOUT)).toBeTruthy();
    expect(screen.getByText('다시 시도')).toBeTruthy();
    expect(screen).toHavePathname('/upload/review');

    useSettings.getState().setMockOptions({ failureRate: 0 });
    await fireEvent.press(screen.getByTestId('upload-submit'));
    expect(await screen.findByTestId('upload-progress-screen', undefined, PIPELINE_TIMEOUT)).toBeTruthy();
  });

  it('Android 에서 촬영 중 앱 화면이 종료됐으면 다시 들어올 때 찍은 사진으로 이어서 등록한다', async () => {
    // 촬영 창을 연 사이 시스템이 앱 화면을 종료해 촬영 결과가 전달되지 않는다
    requestCamera.mockResolvedValue({
      granted: true,
      canAskAgain: true,
      expires: 'never',
      status: 'granted' as ImagePicker.PermissionStatus,
    });
    launchCamera.mockReturnValue(new Promise(() => {}));
    await openUploadModal();
    await fireEvent.press(screen.getByTestId('upload-source-camera'));
    await waitFor(() => expect(launchCamera).toHaveBeenCalled());
    await screen.unmount();

    // 앱 화면이 다시 만들어진 뒤 등록 화면에 들어오면 시스템이 보관한 사진을 되찾는다
    jest.replaceProperty(Platform, 'OS', 'android');
    getPendingResult.mockResolvedValueOnce({ canceled: false, assets: [imageAsset(1)] });
    await renderRouter(createRoutes(), { initialUrl: '/upload' });

    expect(await screen.findByTestId('upload-review-screen')).toBeTruthy();
    expect(screen).toHavePathname('/upload/review');
    expect(screen.getByLabelText('1쪽 미리보기')).toBeTruthy();
    expect(useUploadDraft.getState()).toMatchObject({ source: 'camera', files: [{ name: 'page-1.jpg' }] });
  });

  it('선택한 파일 없이 정보 입력 화면에 오면 등록 방법 선택으로 안내한다', async () => {
    await renderRouter(createRoutes(), { initialUrl: '/upload/review' });
    expect(await screen.findByText('선택한 파일이 없어요')).toBeTruthy();

    await fireEvent.press(screen.getByText('등록 방법 고르기'));
    await waitFor(() => expect(screen).toHavePathname('/upload'));
  });

  it('잘못된 진행 화면 주소면 안내한다', async () => {
    await renderRouter(createRoutes(), { initialUrl: '/upload/progress' });
    expect(await screen.findByText('잘못된 접근이에요')).toBeTruthy();
  });
});
