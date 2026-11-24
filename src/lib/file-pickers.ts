/**
 * 진료기록 파일 선택 (카메라 촬영 · 사진 보관함 · PDF).
 *
 * - 플랫폼별 권한 요청, 선택 결과 → `DocumentFile` 변환, 용량·페이지 수 제한을 한곳에서 처리한다.
 * - 화면은 `PickResult.type` 만 보고 분기하면 된다 (오류 문구는 그대로 사용자에게 보여줘도 되는 한국어).
 * - 시스템 선택 창은 사용자 동작(버튼 누름) 직후에 호출해야 웹 브라우저가 막지 않는다.
 */
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { MAX_FILE_BYTES, MAX_PAGES } from '@/store/upload-draft';
import type { DocumentFile, DocumentSource } from '@/types/domain';

export type PickResult =
  /** 선택 완료. `notice` 는 일부 파일을 제외했을 때 안내 문구 */
  | { type: 'success'; files: DocumentFile[]; notice?: string }
  /** 사용자가 선택 창을 닫음 (안내 불필요) */
  | { type: 'canceled' }
  /** 권한 거부·용량 초과 등. `canOpenSettings` 면 '설정 열기'를 제안한다 */
  | { type: 'error'; title: string; message: string; canOpenSettings?: boolean };

/** 이미지 선택 창을 쓰는 등록 경로 */
type ImageSource = Extract<DocumentSource, 'camera' | 'gallery'>;

/** Android 에서 앱 화면이 종료되는 바람에 전달되지 못했던 촬영·사진 선택 결과 */
export interface PendingImagePick {
  source: ImageSource;
  result: PickResult;
}

const PDF_MIME = 'application/pdf';
const DEFAULT_IMAGE_MIME = 'image/jpeg';
/** 진료기록 글자를 읽을 수 있을 만큼 선명하면서 용량을 줄이는 압축 품질 */
const IMAGE_QUALITY = 0.8;

const IS_WEB = Platform.OS === 'web';

/** 안내 문구용 최대 용량 표기 (예: 20MB) */
const MAX_FILE_LABEL = `${Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB`;

const EXTENSION_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  heif: 'image/heif',
  webp: 'image/webp',
  pdf: PDF_MIME,
};

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
  [PDF_MIME]: 'pdf',
};

/**
 * 마지막으로 연 이미지 선택 창의 등록 경로.
 * Android 가 앱 화면만 종료하고 앱(JS)은 살아 있을 때, 되찾은 결과의 등록 경로를 알아내는 데 쓴다.
 */
let lastImageSource: ImageSource = 'camera';

/* ------------------------------------------------------------------ */
/* 공개 API                                                            */
/* ------------------------------------------------------------------ */

/**
 * 카메라로 한 장 촬영.
 * 웹은 브라우저마다 카메라 직접 실행 지원이 달라 사진 파일 선택으로 대신한다
 * (모바일 브라우저의 파일 선택 창에는 '사진 찍기' 항목이 함께 표시된다).
 */
export async function pickFromCamera(remaining: number = MAX_PAGES): Promise<PickResult> {
  if (remaining <= 0) return pageLimitError();
  if (IS_WEB) return pickImages({ remaining: 1, multiple: false });

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return {
      type: 'error',
      title: '카메라 권한이 필요해요',
      message: permission.canAskAgain
        ? '진료기록을 촬영하려면 카메라 접근을 허용해 주세요.'
        : '휴대폰 설정에서 건강수첩의 카메라 접근을 허용해 주세요.',
      canOpenSettings: !permission.canAskAgain,
    };
  }

  try {
    lastImageSource = 'camera';
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: IMAGE_QUALITY,
      exif: false,
    });
    if (result.canceled) return { type: 'canceled' };
    return toImageResult(result.assets, 1);
  } catch {
    // 카메라가 없는 기기(시뮬레이터 등)이거나 다른 앱이 카메라를 쓰는 중
    return {
      type: 'error',
      title: '카메라를 열 수 없어요',
      message: '사진에서 선택하거나 PDF 파일로 등록해 주세요.',
    };
  }
}

/**
 * 사진 보관함에서 여러 장 선택 (최대 `remaining` 장).
 *
 * 시스템 사진 선택기(iOS PHPicker, Android Photo Picker)는 선택한 사진만 앱에 전달하므로
 * 사진 보관함 전체 접근 권한이 필요 없다(SDK 58 문서). 민감한 의료 앱인 만큼 불필요한
 * 권한 요청은 하지 않는다.
 */
export async function pickFromLibrary(remaining: number = MAX_PAGES): Promise<PickResult> {
  if (remaining <= 0) return pageLimitError();
  lastImageSource = 'gallery';
  return pickImages({ remaining, multiple: remaining > 1 });
}

/** PDF 파일 1개 선택 */
export async function pickPdf(): Promise<PickResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: PDF_MIME,
      multiple: false,
      // 네이티브: 다른 Expo API·업로드에서 바로 읽을 수 있도록 앱 캐시로 복사
      copyToCacheDirectory: true,
      // 웹: 큰 파일을 문자열(base64)로 읽지 않고 blob URL 로 받는다
      base64: false,
    });
    if (result.canceled) return { type: 'canceled' };

    const asset = result.assets[0];
    if (!asset) return { type: 'canceled' };

    const name = asset.name?.trim() || `document-${Date.now()}.pdf`;
    const mimeType = asset.mimeType || mimeFromName(name);
    if (mimeType !== PDF_MIME) {
      return {
        type: 'error',
        title: 'PDF 파일만 등록할 수 있어요',
        message: '사진은 "사진에서 선택"으로 등록해 주세요.',
      };
    }
    if (isTooLarge(asset.size)) return tooLargeError(1);

    return {
      type: 'success',
      files: [{ uri: asset.uri, name, mimeType: PDF_MIME, size: asset.size }],
    };
  } catch {
    return {
      type: 'error',
      title: '파일을 열 수 없어요',
      message: '파일이 손상되었거나 접근할 수 없어요. 다른 파일을 선택해 주세요.',
    };
  }
}

/**
 * Android 는 카메라·사진 선택 창이 열려 있는 동안 메모리가 부족하면 앱 화면(MainActivity)을 종료할 수 있다.
 * 그러면 고른 사진이 앱에 전달되지 않고 시스템에 보관되므로, 등록 화면에 다시 들어올 때 한 번 꺼내 온다
 * (SDK 58 `ImagePicker.getPendingResultAsync`, 한 번 꺼내면 비워진다).
 * 보관된 결과가 없거나 Android 가 아니면 null.
 */
export async function getPendingImagePick(): Promise<PendingImagePick | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const pending = await ImagePicker.getPendingResultAsync();
    if (!pending) return null;
    if ('code' in pending) return { source: lastImageSource, result: pendingPickError() };
    if (pending.canceled) return null;
    // 앱 전체가 다시 시작됐으면 마지막 경로를 모르므로, 여러 장이면 사진 선택으로 본다 (카메라는 한 장씩 촬영)
    const source = pending.assets.length > 1 ? 'gallery' : lastImageSource;
    return { source, result: toImageResult(pending.assets, MAX_PAGES) };
  } catch {
    // 보관된 사진 파일을 읽지 못함 (캐시가 지워진 경우 등)
    return { source: lastImageSource, result: pendingPickError() };
  }
}

/**
 * 등록 경로에 맞는 선택 창을 연다.
 * @param remaining 더 담을 수 있는 페이지 수 (PDF 는 항상 1개)
 */
export function pickBySource(source: DocumentSource, remaining: number = MAX_PAGES): Promise<PickResult> {
  switch (source) {
    case 'camera':
      return pickFromCamera(remaining);
    case 'gallery':
      return pickFromLibrary(remaining);
    case 'pdf':
      return pickPdf();
  }
}

/* ------------------------------------------------------------------ */
/* 내부 구현                                                            */
/* ------------------------------------------------------------------ */

async function pickImages({ remaining, multiple }: { remaining: number; multiple: boolean }): Promise<PickResult> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: multiple,
      selectionLimit: multiple ? remaining : 1,
      // iOS 15+: 선택한 순서대로 번호를 보여주고 그 순서로 돌려준다 (페이지 순서 유지)
      orderedSelection: multiple,
      quality: IMAGE_QUALITY,
      exif: false,
    });
    if (result.canceled) return { type: 'canceled' };
    return toImageResult(result.assets, remaining);
  } catch {
    // 웹에서 이미지가 아닌 파일을 고른 경우 등
    return {
      type: 'error',
      title: '사진을 불러오지 못했어요',
      message: 'JPG·PNG 형식의 사진을 선택해 주세요.',
    };
  }
}

/** 선택된 이미지 → DocumentFile (용량 초과 제외, 남은 페이지 수만큼만) */
function toImageResult(assets: ImagePicker.ImagePickerAsset[], remaining: number): PickResult {
  const images = assets.filter((asset) => asset.type !== 'video');
  const batchId = Date.now().toString(36);
  const files = images.map((asset, index) => toImageFile(asset, `${batchId}-${index + 1}`));

  const accepted = files.filter((file) => !isTooLarge(file.size));
  const oversized = files.length - accepted.length;
  if (accepted.length === 0) {
    return files.length > 0 ? tooLargeError(oversized) : { type: 'canceled' };
  }

  const kept = accepted.slice(0, remaining);
  const overflow = accepted.length - kept.length;

  const notices: string[] = [];
  if (oversized > 0) {
    notices.push(`${MAX_FILE_LABEL}를 넘는 사진 ${oversized}장은 제외했어요.`);
  }
  if (overflow > 0) {
    notices.push(`진료기록 1건에는 최대 ${MAX_PAGES}장까지 담을 수 있어 ${overflow}장은 제외했어요.`);
  }
  return { type: 'success', files: kept, notice: notices.length > 0 ? notices.join('\n') : undefined };
}

function toImageFile(asset: ImagePicker.ImagePickerAsset, suffix: string): DocumentFile {
  const providedName = asset.fileName?.trim() || nameFromUri(asset.uri);
  const mimeType = asset.mimeType || (providedName ? mimeFromName(providedName) : undefined) || DEFAULT_IMAGE_MIME;
  const name = providedName || `page-${suffix}.${MIME_EXTENSION[mimeType] ?? 'jpg'}`;
  return {
    uri: asset.uri,
    name,
    mimeType,
    size: asset.fileSize,
    // 시스템이 크기를 알려주지 않으면 0 이 오므로 값이 있을 때만 담는다
    width: asset.width > 0 ? asset.width : undefined,
    height: asset.height > 0 ? asset.height : undefined,
  };
}

/** 로컬 파일 URI 의 마지막 경로에서 확장자가 있는 파일명을 얻는다 (blob/data URI 는 제외) */
function nameFromUri(uri: string): string | undefined {
  if (!/^(file|content):/i.test(uri)) return undefined;
  const last = uri.split('?')[0]?.split('/').pop() ?? '';
  return /\.[a-z0-9]{2,5}$/i.test(last) ? last : undefined;
}

function mimeFromName(name: string): string | undefined {
  const extension = name.split('.').pop()?.toLowerCase();
  return extension ? EXTENSION_MIME[extension] : undefined;
}

function isTooLarge(size: number | undefined): boolean {
  return typeof size === 'number' && size > MAX_FILE_BYTES;
}

function tooLargeError(count: number): PickResult {
  return {
    type: 'error',
    title: '파일 용량이 너무 커요',
    message: `파일 1개는 최대 ${MAX_FILE_LABEL}까지 올릴 수 있어요.${
      count > 1 ? ` 선택한 ${count}개 모두 용량을 넘었어요.` : ''
    } 화질을 낮추거나 다른 파일을 선택해 주세요.`,
  };
}

function pendingPickError(): PickResult {
  return {
    type: 'error',
    title: '사진을 불러오지 못했어요',
    message: '앱이 잠시 닫히는 동안 고른 사진을 가져오지 못했어요. 다시 촬영하거나 사진을 골라 주세요.',
  };
}

function pageLimitError(): PickResult {
  return {
    type: 'error',
    title: '더 담을 수 없어요',
    message: `진료기록 1건에는 최대 ${MAX_PAGES}장까지 등록할 수 있어요. 나머지는 새 기록으로 등록해 주세요.`,
  };
}
