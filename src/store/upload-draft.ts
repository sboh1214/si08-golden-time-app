/**
 * 문서 등록 임시 상태 (메모리).
 * 등록 방법 선택(upload/index) → 미리보기·정보 입력(upload/review) 사이에 선택한 파일을 전달한다.
 */
import { create } from 'zustand';

import type { DocumentFile, DocumentSource } from '@/types/domain';

/** 한 문서당 최대 페이지(파일) 수 */
export const MAX_PAGES = 10;
/** 파일 1개 최대 용량 (20MB) */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export interface UploadDraftState {
  source: DocumentSource | null;
  files: DocumentFile[];
  /** 새 등록 시작 (기존 선택 초기화) */
  start: (source: DocumentSource, files: DocumentFile[]) => void;
  /** 같은 문서에 페이지 추가 (최대 MAX_PAGES) */
  addFiles: (files: DocumentFile[]) => void;
  removeFile: (uri: string) => void;
  /** 페이지 순서 변경 */
  moveFile: (from: number, to: number) => void;
  reset: () => void;
}

export const useUploadDraft = create<UploadDraftState>()((set) => ({
  source: null,
  files: [],
  start: (source, files) => set({ source, files: files.slice(0, MAX_PAGES) }),
  addFiles: (files) =>
    set((s) => {
      // 기존 파일 + 이번에 들어온 묶음 안의 중복까지 제거
      const known = new Set(s.files.map((f) => f.uri));
      const fresh = files.filter((f) => {
        if (known.has(f.uri)) return false;
        known.add(f.uri);
        return true;
      });
      const merged = [...s.files, ...fresh];
      return { files: merged.slice(0, MAX_PAGES) };
    }),
  removeFile: (uri) => set((s) => ({ files: s.files.filter((f) => f.uri !== uri) })),
  moveFile: (from, to) =>
    set((s) => {
      if (from === to || from < 0 || to < 0 || from >= s.files.length || to >= s.files.length) return s;
      const files = [...s.files];
      const [item] = files.splice(from, 1);
      files.splice(to, 0, item);
      return { files };
    }),
  reset: () => set({ source: null, files: [] }),
}));
