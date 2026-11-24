import * as Linking from 'expo-linking';
import { useRef, useState } from 'react';
import { Platform } from 'react-native';

import { confirm, notify } from '@/lib/dialog';
import { getPendingImagePick, pickBySource, type PickResult } from '@/lib/file-pickers';
import type { DocumentFile, DocumentSource } from '@/types/domain';

/**
 * 웹은 일부 브라우저에서 파일 선택 창을 닫아도 취소 이벤트가 오지 않아
 * 선택 Promise 가 끝나지 않을 수 있다. 버튼이 영영 잠기지 않도록 네이티브에서만 잠근다.
 */
const LOCK_WHILE_PICKING = Platform.OS !== 'web';

export interface FilePicker {
  /** 선택 창이 열려 있는 등록 경로 (네이티브에서만 표시) */
  picking: DocumentSource | null;
  /**
   * 선택 창을 열고, 성공하면 파일 목록을 돌려준다.
   * 취소·오류(권한 거부 등)면 필요한 안내를 마친 뒤 null.
   */
  pick: (source: DocumentSource, remaining?: number) => Promise<DocumentFile[] | null>;
}

/** 문서 등록 화면 공통: 파일 선택 + 권한 거부·용량 초과 안내 */
export function useFilePicker(): FilePicker {
  const [picking, setPicking] = useState<DocumentSource | null>(null);
  const lockRef = useRef(false);

  const pick = async (source: DocumentSource, remaining?: number) => {
    if (lockRef.current) return null;
    if (LOCK_WHILE_PICKING) {
      lockRef.current = true;
      setPicking(source);
    }
    try {
      const result = await pickBySource(source, remaining);
      return await handleResult(result);
    } finally {
      lockRef.current = false;
      setPicking(null);
    }
  };

  return { picking, pick };
}

/**
 * Android: 촬영·사진 선택 중 시스템이 앱 화면을 종료해 전달되지 못한 사진을 되찾는다.
 * 되찾은 사진이 있으면 (필요한 안내를 마친 뒤) 등록 경로와 파일을, 없으면 null 을 돌려준다.
 */
export async function recoverPendingPick(): Promise<{ source: DocumentSource; files: DocumentFile[] } | null> {
  const pending = await getPendingImagePick();
  if (!pending) return null;
  const files = await handleResult(pending.result);
  return files ? { source: pending.source, files } : null;
}

async function handleResult(result: PickResult): Promise<DocumentFile[] | null> {
  switch (result.type) {
    case 'canceled':
      return null;
    case 'error':
      await explainError(result);
      return null;
    case 'success':
      if (result.notice) notify('일부 파일은 담지 않았어요', result.notice);
      return result.files;
  }
}

async function explainError(error: Extract<PickResult, { type: 'error' }>): Promise<void> {
  // 설정 앱으로 이동은 네이티브에서만 가능하다
  if (!error.canOpenSettings || Platform.OS === 'web') {
    notify(error.title, error.message);
    return;
  }
  const openSettings = await confirm({
    title: error.title,
    message: error.message,
    confirmLabel: '설정 열기',
    cancelLabel: '닫기',
  });
  if (!openSettings) return;
  try {
    await Linking.openSettings();
  } catch {
    notify('설정을 열 수 없어요', '휴대폰의 설정 앱에서 직접 권한을 허용해 주세요.');
  }
}
