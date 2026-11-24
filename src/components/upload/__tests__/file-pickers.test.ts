/**
 * 파일 선택 결과 → DocumentFile 변환, 권한·용량·페이지 수 제한 검증.
 * (시스템 선택 창은 mock 으로 대체)
 */
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { getPendingImagePick, pickBySource, pickFromCamera, pickFromLibrary, pickPdf } from '@/lib/file-pickers';
import { MAX_FILE_BYTES, MAX_PAGES } from '@/store/upload-draft';

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  getPendingResultAsync: jest.fn(),
}));
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

const launchLibrary = jest.mocked(ImagePicker.launchImageLibraryAsync);
const launchCamera = jest.mocked(ImagePicker.launchCameraAsync);
const requestCamera = jest.mocked(ImagePicker.requestCameraPermissionsAsync);
const getPendingResult = jest.mocked(ImagePicker.getPendingResultAsync);
const getDocument = jest.mocked(DocumentPicker.getDocumentAsync);

function asset(overrides: Partial<ImagePicker.ImagePickerAsset> = {}): ImagePicker.ImagePickerAsset {
  return {
    uri: 'file:///cache/ImagePicker/IMG_0001.jpg',
    width: 3024,
    height: 4032,
    type: 'image',
    fileName: 'IMG_0001.jpg',
    fileSize: 2_000_000,
    mimeType: 'image/jpeg',
    ...overrides,
  };
}

function granted(canAskAgain = true) {
  return { granted: true, canAskAgain, expires: 'never' as const, status: 'granted' as ImagePicker.PermissionStatus };
}

function denied(canAskAgain: boolean) {
  return { granted: false, canAskAgain, expires: 'never' as const, status: 'denied' as ImagePicker.PermissionStatus };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('pickFromLibrary', () => {
  it('선택한 사진을 DocumentFile 로 변환한다', async () => {
    launchLibrary.mockResolvedValue({ canceled: false, assets: [asset()] });
    const result = await pickFromLibrary(3);
    expect(result).toEqual({
      type: 'success',
      files: [
        {
          uri: 'file:///cache/ImagePicker/IMG_0001.jpg',
          name: 'IMG_0001.jpg',
          mimeType: 'image/jpeg',
          size: 2_000_000,
          width: 3024,
          height: 4032,
        },
      ],
      notice: undefined,
    });
    expect(launchLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ allowsMultipleSelection: true, selectionLimit: 3, allowsEditing: false, quality: 0.8 }),
    );
  });

  it('파일명·형식·크기 정보가 없으면 기본값을 채운다', async () => {
    launchLibrary.mockResolvedValue({
      canceled: false,
      assets: [asset({ uri: 'content://media/123', fileName: null, mimeType: undefined, width: 0, height: 0 })],
    });
    const result = await pickFromLibrary();
    if (result.type !== 'success') throw new Error('expected success');
    const [file] = result.files;
    expect(file.name).toMatch(/^page-[a-z0-9]+-1\.jpg$/);
    expect(file.mimeType).toBe('image/jpeg');
    expect(file.width).toBeUndefined();
    expect(file.height).toBeUndefined();
  });

  it('URI 의 파일명에서 형식을 추정한다', async () => {
    launchLibrary.mockResolvedValue({
      canceled: false,
      assets: [asset({ uri: 'file:///cache/scan.png', fileName: null, mimeType: undefined })],
    });
    const result = await pickFromLibrary();
    if (result.type !== 'success') throw new Error('expected success');
    expect(result.files[0]).toMatchObject({ name: 'scan.png', mimeType: 'image/png' });
  });

  it('용량을 넘는 사진은 빼고 안내한다', async () => {
    launchLibrary.mockResolvedValue({
      canceled: false,
      assets: [asset(), asset({ uri: 'file:///big.jpg', fileSize: MAX_FILE_BYTES + 1 })],
    });
    const result = await pickFromLibrary();
    if (result.type !== 'success') throw new Error('expected success');
    expect(result.files).toHaveLength(1);
    expect(result.notice).toContain('20MB를 넘는 사진 1장은 제외했어요.');
  });

  it('모든 사진이 용량을 넘으면 오류', async () => {
    launchLibrary.mockResolvedValue({
      canceled: false,
      assets: [asset({ fileSize: MAX_FILE_BYTES + 1 })],
    });
    const result = await pickFromLibrary();
    expect(result).toMatchObject({ type: 'error', title: '파일 용량이 너무 커요' });
  });

  it('남은 페이지 수만큼만 담고 나머지는 안내한다', async () => {
    launchLibrary.mockResolvedValue({
      canceled: false,
      assets: [asset({ uri: 'file:///1.jpg' }), asset({ uri: 'file:///2.jpg' }), asset({ uri: 'file:///3.jpg' })],
    });
    const result = await pickFromLibrary(2);
    if (result.type !== 'success') throw new Error('expected success');
    expect(result.files.map((f) => f.uri)).toEqual(['file:///1.jpg', 'file:///2.jpg']);
    expect(result.notice).toContain(`최대 ${MAX_PAGES}장`);
  });

  it('더 담을 수 없으면 선택 창을 열지 않는다', async () => {
    const result = await pickFromLibrary(0);
    expect(result).toMatchObject({ type: 'error', title: '더 담을 수 없어요' });
    expect(launchLibrary).not.toHaveBeenCalled();
  });

  it('취소하면 canceled', async () => {
    launchLibrary.mockResolvedValue({ canceled: true, assets: null });
    expect(await pickFromLibrary()).toEqual({ type: 'canceled' });
  });

  it('선택 창 오류는 사용자용 문구로 바꾼다', async () => {
    launchLibrary.mockRejectedValue(new Error('Unsupported file type'));
    expect(await pickFromLibrary()).toMatchObject({ type: 'error', title: '사진을 불러오지 못했어요' });
  });
});

describe('pickFromCamera', () => {
  it('권한을 받은 뒤 한 장 촬영한다', async () => {
    requestCamera.mockResolvedValue(granted());
    launchCamera.mockResolvedValue({ canceled: false, assets: [asset()] });
    const result = await pickFromCamera();
    expect(result).toMatchObject({ type: 'success', files: [{ name: 'IMG_0001.jpg' }] });
    expect(launchCamera).toHaveBeenCalledWith(expect.objectContaining({ allowsEditing: false, quality: 0.8 }));
  });

  it('권한을 다시 물을 수 없으면 설정 열기를 제안한다', async () => {
    requestCamera.mockResolvedValue(denied(false));
    const result = await pickFromCamera();
    expect(result).toMatchObject({ type: 'error', title: '카메라 권한이 필요해요', canOpenSettings: true });
    expect(launchCamera).not.toHaveBeenCalled();
  });

  it('권한을 다시 물을 수 있으면 설정 열기 없이 안내만 한다', async () => {
    requestCamera.mockResolvedValue(denied(true));
    expect(await pickFromCamera()).toMatchObject({ type: 'error', canOpenSettings: false });
  });

  it('카메라를 열 수 없는 기기면 다른 방법을 안내한다', async () => {
    requestCamera.mockResolvedValue(granted());
    launchCamera.mockRejectedValue(new Error('Camera not available on simulator'));
    expect(await pickFromCamera()).toMatchObject({ type: 'error', title: '카메라를 열 수 없어요' });
  });
});

describe('pickPdf', () => {
  it('PDF 1개를 DocumentFile 로 변환한다', async () => {
    getDocument.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cache/result.pdf', name: 'result.pdf', mimeType: 'application/pdf', size: 1024, lastModified: 0 }],
    });
    expect(await pickPdf()).toEqual({
      type: 'success',
      files: [{ uri: 'file:///cache/result.pdf', name: 'result.pdf', mimeType: 'application/pdf', size: 1024 }],
    });
    expect(getDocument).toHaveBeenCalledWith(expect.objectContaining({ type: 'application/pdf', multiple: false }));
  });

  it('형식 정보가 없으면 확장자로 PDF 인지 확인한다', async () => {
    getDocument.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'content://doc/1', name: '검사결과.PDF', size: 10, lastModified: 0 }],
    });
    expect(await pickPdf()).toMatchObject({ type: 'success', files: [{ mimeType: 'application/pdf' }] });
  });

  it('PDF 가 아니면 오류', async () => {
    getDocument.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.docx', name: 'a.docx', mimeType: 'application/msword', lastModified: 0 }],
    });
    expect(await pickPdf()).toMatchObject({ type: 'error', title: 'PDF 파일만 등록할 수 있어요' });
  });

  it('용량을 넘으면 오류', async () => {
    getDocument.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.pdf', name: 'a.pdf', mimeType: 'application/pdf', size: MAX_FILE_BYTES + 1, lastModified: 0 }],
    });
    expect(await pickPdf()).toMatchObject({ type: 'error', title: '파일 용량이 너무 커요' });
  });
});

describe('pickBySource', () => {
  it('등록 경로에 맞는 선택 창을 연다', async () => {
    getDocument.mockResolvedValue({ canceled: true, assets: null });
    await pickBySource('pdf');
    expect(getDocument).toHaveBeenCalledTimes(1);

    launchLibrary.mockResolvedValue({ canceled: true, assets: null });
    await pickBySource('gallery', 4);
    expect(launchLibrary).toHaveBeenCalledWith(expect.objectContaining({ selectionLimit: 4 }));
  });
});

describe('getPendingImagePick (Android 화면 종료 후 복구)', () => {
  /** 촬영 창을 연 뒤 앱 화면이 종료돼 결과가 전달되지 않은 상황 */
  async function openCameraWithoutResult() {
    requestCamera.mockResolvedValue(granted());
    launchCamera.mockReturnValue(new Promise(() => {}));
    void pickFromCamera();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(launchCamera).toHaveBeenCalled();
  }

  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Android 가 아니면 시스템에 묻지 않는다', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(await getPendingImagePick()).toBeNull();
    expect(getPendingResult).not.toHaveBeenCalled();
  });

  it('보관된 결과가 없거나 취소였으면 null', async () => {
    getPendingResult.mockResolvedValueOnce(null);
    expect(await getPendingImagePick()).toBeNull();
    getPendingResult.mockResolvedValueOnce({ canceled: true, assets: null });
    expect(await getPendingImagePick()).toBeNull();
  });

  it('촬영 중 화면이 종료됐으면 찍은 사진을 카메라 등록으로 되찾는다', async () => {
    await openCameraWithoutResult();

    getPendingResult.mockResolvedValue({ canceled: false, assets: [asset()] });
    expect(await getPendingImagePick()).toEqual({
      source: 'camera',
      result: expect.objectContaining({ type: 'success', files: [expect.objectContaining({ name: 'IMG_0001.jpg' })] }),
    });
  });

  it('사진 선택 중이었으면 사진 선택 등록으로 되찾는다', async () => {
    launchLibrary.mockReturnValue(new Promise(() => {}));
    void pickFromLibrary();

    getPendingResult.mockResolvedValue({ canceled: false, assets: [asset()] });
    expect(await getPendingImagePick()).toMatchObject({ source: 'gallery', result: { type: 'success' } });
  });

  it('여러 장이면 사진 선택으로 본다 (앱이 다시 시작돼 마지막 경로를 모를 때)', async () => {
    await openCameraWithoutResult();

    getPendingResult.mockResolvedValue({
      canceled: false,
      assets: [asset({ uri: 'file:///1.jpg' }), asset({ uri: 'file:///2.jpg' })],
    });
    const pending = await getPendingImagePick();
    expect(pending?.source).toBe('gallery');
    expect(pending?.result).toMatchObject({ type: 'success', files: [{ uri: 'file:///1.jpg' }, { uri: 'file:///2.jpg' }] });
  });

  it('보관된 사진을 읽지 못하면 사용자용 오류로 알린다', async () => {
    getPendingResult.mockResolvedValueOnce({ code: 'ERR_FAILED_TO_READ', message: 'Failed to read picked image' });
    expect(await getPendingImagePick()).toMatchObject({ result: { type: 'error', title: '사진을 불러오지 못했어요' } });

    getPendingResult.mockRejectedValueOnce(new Error('File not found'));
    expect(await getPendingImagePick()).toMatchObject({ result: { type: 'error', title: '사진을 불러오지 못했어요' } });
  });
});
