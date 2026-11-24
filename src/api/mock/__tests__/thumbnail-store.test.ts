import { createDeviceThumbnailStore, passthroughThumbnailStore } from '../thumbnail-store';

const mockCopies: { from: string; to: string }[] = [];
const mockDeleted: string[] = [];

jest.mock('expo-file-system', () => {
  const join = (parts: unknown[]) =>
    parts.map((part) => (typeof part === 'string' ? part : (part as { uri: string }).uri)).join('/');
  class Directory {
    readonly uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    create() {}
  }
  class File {
    readonly uri: string;
    readonly exists = true;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    async copy(target: File) {
      mockCopies.push({ from: this.uri, to: target.uri });
    }
    delete() {
      mockDeleted.push(this.uri);
    }
  }
  return { Directory, File, Paths: { document: new Directory('file:///app-v2/Documents') } };
});

const photo = { uri: 'file:///cache/ImagePicker/page-1.jpeg', name: 'page-1.jpeg', mimeType: 'image/jpeg' };

describe('thumbnail-store', () => {
  it('기기에서는 앱 문서 폴더에 복사하고 전체 경로 대신 이름만 저장한다', async () => {
    const store = createDeviceThumbnailStore();
    const stored = await store.save('doc_1', photo);

    expect(stored).toBe('mock-thumbnail:doc_1.jpeg');
    expect(mockCopies).toEqual([
      { from: photo.uri, to: 'file:///app-v2/Documents/mock-thumbnails/doc_1.jpeg' },
    ]);
    // 화면에 보낼 때 지금의 앱 폴더 경로로 바꾼다 (앱 업데이트로 경로가 바뀌어도 다시 찾는다)
    expect(store.resolve('mock-thumbnail:doc_1.jpeg')).toBe('file:///app-v2/Documents/mock-thumbnails/doc_1.jpeg');
    // 예전에 저장한 전체 주소는 그대로 둔다 (불러오지 못하면 화면이 아이콘으로 대신 보여 준다)
    expect(store.resolve('file:///cache/old.jpg')).toBe('file:///cache/old.jpg');

    store.remove('mock-thumbnail:doc_1.jpeg');
    store.remove('file:///cache/old.jpg');
    expect(mockDeleted).toEqual(['file:///app-v2/Documents/mock-thumbnails/doc_1.jpeg']);
  });

  it('테스트·메모리 전용 보관소는 받은 주소를 그대로 쓴다', async () => {
    await expect(passthroughThumbnailStore.save('doc_1', photo)).resolves.toBe(photo.uri);
    expect(passthroughThumbnailStore.resolve(photo.uri)).toBe(photo.uri);
  });
});
