/**
 * 내장 데모 서버의 문서 미리보기(첫 페이지) 보관소.
 *
 * 사진 선택 창이 돌려주는 주소는 오래 쓸 수 없다 — 기기에서는 시스템이 언제든 지우는 임시(cache) 파일이고,
 * 웹에서는 페이지를 새로 열면 사라지는 `blob:` 주소다. 그래서 등록할 때 미리보기를 따로 보관한다.
 *
 * - 기기(iOS·Android): 첫 페이지 이미지를 앱 문서 폴더(`Paths.document/mock-thumbnails`)에 복사하고
 *   `mock-thumbnail:<파일 이름>` 형태의 이름만 저장한다. iOS 는 앱을 업데이트하면 앱 폴더 경로가 바뀌므로
 *   전체 경로 대신 이름을 저장하고, 화면에 보낼 때 그때의 경로로 바꾼다(`resolve`).
 * - 웹: 작은 JPEG data URL(긴 변 240px)로 줄여 저장한다 (브라우저 저장 공간 한도 안에서).
 *
 * 보관에 실패하면 미리보기 없이 등록되고 화면은 문서 종류 아이콘을 보여 준다.
 */
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { DocumentFile } from '@/types/domain';

export interface ThumbnailStore {
  /** 첫 페이지 이미지를 보관하고 저장할 값(이름 또는 주소)을 돌려준다. 실패하면 undefined */
  save(documentId: string, file: DocumentFile): Promise<string | undefined>;
  /** 저장된 값 → 화면에 쓸 주소 */
  resolve(stored: string): string | undefined;
  /** 문서를 지울 때 보관한 미리보기도 지운다 */
  remove(stored: string): void;
}

/** 받은 주소를 그대로 쓰는 보관소 (테스트·메모리 전용 데모 서버) */
export const passthroughThumbnailStore: ThumbnailStore = {
  save: async (_documentId, file) => file.uri,
  resolve: (stored) => stored,
  remove: () => {},
};

const NATIVE_PREFIX = 'mock-thumbnail:';
const WEB_MAX_SIDE = 240;

function thumbnailsDirectory(): Directory {
  return new Directory(Paths.document, 'mock-thumbnails');
}

function extensionOf(file: DocumentFile): string {
  const fromName = /\.([a-z0-9]{2,5})$/i.exec(file.name)?.[1];
  if (fromName) return fromName.toLowerCase();
  return file.mimeType === 'image/png' ? 'png' : 'jpg';
}

const nativeThumbnailStore: ThumbnailStore = {
  async save(documentId, file) {
    try {
      const directory = thumbnailsDirectory();
      directory.create({ intermediates: true, idempotent: true });
      const name = `${documentId}.${extensionOf(file)}`;
      await new File(file.uri).copy(new File(directory, name), { overwrite: true });
      return `${NATIVE_PREFIX}${name}`;
    } catch {
      return undefined;
    }
  },
  resolve(stored) {
    if (!stored.startsWith(NATIVE_PREFIX)) return stored;
    return new File(thumbnailsDirectory(), stored.slice(NATIVE_PREFIX.length)).uri;
  },
  remove(stored) {
    if (!stored.startsWith(NATIVE_PREFIX)) return;
    try {
      const file = new File(thumbnailsDirectory(), stored.slice(NATIVE_PREFIX.length));
      if (file.exists) file.delete();
    } catch {
      // 미리보기 정리 실패는 문서 삭제에 영향을 주지 않는다
    }
  },
};

/** 웹: 이미지를 작은 JPEG data URL 로 줄인다 */
async function toSmallDataUrl(uri: string): Promise<string | undefined> {
  const image = new window.Image();
  image.src = uri;
  await image.decode();
  const scale = Math.min(1, WEB_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = window.document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.7);
}

const webThumbnailStore: ThumbnailStore = {
  async save(_documentId, file) {
    try {
      return await toSmallDataUrl(file.uri);
    } catch {
      return undefined;
    }
  },
  resolve: (stored) => stored,
  remove: () => {},
};

/** 앱에서 쓰는 보관소 (플랫폼별) */
export function createDeviceThumbnailStore(): ThumbnailStore {
  return Platform.OS === 'web' ? webThumbnailStore : nativeThumbnailStore;
}
