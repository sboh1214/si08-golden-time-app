/**
 * 문서 등록 임시 상태(useUploadDraft) 단위 테스트.
 */
import type { DocumentFile } from '@/types/domain';

import { MAX_FILE_BYTES, MAX_PAGES, useUploadDraft } from '../upload-draft';

function page(n: number): DocumentFile {
  return { uri: `file:///cache/page-${n}.jpg`, name: `page-${n}.jpg`, mimeType: 'image/jpeg', size: 1_000 + n };
}

function pages(from: number, to: number): DocumentFile[] {
  return Array.from({ length: to - from + 1 }, (_, i) => page(from + i));
}

const draft = () => useUploadDraft.getState();
const uris = () => draft().files.map((f) => f.uri);

beforeEach(() => {
  draft().reset();
});

describe('useUploadDraft', () => {
  it('제한값: 최대 10페이지, 파일당 20MB', () => {
    expect(MAX_PAGES).toBe(10);
    expect(MAX_FILE_BYTES).toBe(20 * 1024 * 1024);
  });

  it('초기 상태는 비어 있다', () => {
    expect(draft().source).toBeNull();
    expect(draft().files).toEqual([]);
  });

  it('start 는 등록 방법과 파일을 설정하고 이전 선택을 대체한다', () => {
    draft().start('gallery', pages(1, 3));
    expect(draft().source).toBe('gallery');
    expect(uris()).toEqual(pages(1, 3).map((f) => f.uri));

    draft().start('pdf', [page(9)]);
    expect(draft().source).toBe('pdf');
    expect(uris()).toEqual([page(9).uri]);
  });

  it(`start 는 최대 ${MAX_PAGES}페이지까지만 받는다`, () => {
    draft().start('gallery', pages(1, MAX_PAGES + 3));
    expect(draft().files).toHaveLength(MAX_PAGES);
    expect(draft().files[MAX_PAGES - 1]).toEqual(page(MAX_PAGES));
  });

  it('addFiles 는 뒤에 이어 붙이고 이미 있는 파일(uri)은 건너뛴다', () => {
    draft().start('camera', [page(1), page(2)]);
    draft().addFiles([page(2), page(3)]);
    expect(uris()).toEqual([page(1).uri, page(2).uri, page(3).uri]);
    expect(draft().source).toBe('camera');
  });

  it(`addFiles 는 합쳐서 ${MAX_PAGES}페이지를 넘기지 않고 앞쪽 파일을 유지한다`, () => {
    draft().start('camera', pages(1, 8));
    draft().addFiles(pages(9, 13));
    expect(uris()).toEqual(pages(1, MAX_PAGES).map((f) => f.uri));

    // 이미 가득 찼으면 더 추가되지 않는다
    draft().addFiles([page(20)]);
    expect(draft().files).toHaveLength(MAX_PAGES);
    expect(uris()).not.toContain(page(20).uri);
  });

  it('removeFile 은 해당 uri 만 지우고, 없는 uri 는 무시한다', () => {
    draft().start('gallery', pages(1, 3));
    draft().removeFile(page(2).uri);
    expect(uris()).toEqual([page(1).uri, page(3).uri]);

    draft().removeFile('file:///none.jpg');
    expect(uris()).toEqual([page(1).uri, page(3).uri]);
  });

  it('moveFile 은 페이지 순서를 바꾼다', () => {
    draft().start('gallery', pages(1, 4));
    draft().moveFile(0, 2);
    expect(uris()).toEqual([page(2), page(3), page(1), page(4)].map((f) => f.uri));

    draft().moveFile(3, 0);
    expect(uris()).toEqual([page(4), page(2), page(3), page(1)].map((f) => f.uri));
  });

  it.each([
    [1, 1],
    [-1, 0],
    [0, -1],
    [3, 0],
    [0, 3],
  ])('moveFile(%i, %i) 처럼 같거나 범위를 벗어난 위치는 무시한다', (from, to) => {
    draft().start('gallery', pages(1, 3));
    const before = draft().files;
    draft().moveFile(from, to);
    expect(draft().files).toBe(before);
  });

  it('reset 은 모든 선택을 지운다', () => {
    draft().start('pdf', [page(1)]);
    draft().reset();
    expect(draft().source).toBeNull();
    expect(draft().files).toEqual([]);
  });
});
