/**
 * 내장 데모 서버(MockApiClient) 단위 테스트.
 *
 * - 시간(now)·지연(sleep)·난수(random)를 주입해 AI 파이프라인 진행을 결정적으로 검증한다.
 * - 샘플 데이터(seed.ts)는 계속 보강되므로 실제 시드에 대해서는 "항상 성립해야 하는 규칙"만 확인하고,
 *   집계·정렬 결과는 저장소에 직접 넣은 고정 데이터(fixture)로 정확한 값을 검증한다.
 */
import { DOCUMENT_TYPE_LABEL } from '@/lib/labels';
import { flagSeverity } from '@/lib/labs';
import type {
  DocumentAnalysis,
  LabFlag,
  LabResult,
  MedicalDocument,
  ProcessingStatus,
  Question,
  UploadDocumentInput,
} from '@/types/domain';

import { ApiError } from '../../errors';
import {
  MOCK_STORAGE_KEY,
  MockApiClient,
  type MockRuntimeOptions,
  type StorageLike,
} from '../mock-client';
import { MOCK_MODEL_VERSION, SEED_VERSION } from '../seed';
import type { ThumbnailStore } from '../thumbnail-store';

/* ------------------------------------------------------------------ */
/* 테스트 도우미                                                        */
/* ------------------------------------------------------------------ */

/** 2026-11-24 10:00 (KST) */
const START = Date.UTC(2026, 10, 24, 1, 0, 0);
const PIPELINE_MS = 1_000;

let t = START;
let runtime: Partial<MockRuntimeOptions> = {};

function createClient(
  options: {
    storage?: StorageLike | null;
    random?: () => number;
    sleep?: (ms: number) => Promise<void>;
    thumbnails?: ThumbnailStore;
  } = {},
): MockApiClient {
  return new MockApiClient({
    storage: options.storage ?? null,
    thumbnails: options.thumbnails,
    now: () => t,
    sleep: options.sleep ?? (async () => undefined),
    random: options.random ?? (() => 0.5),
    getOptions: () => ({
      latencyMs: 0,
      failureRate: 0,
      pipelineDurationMs: PIPELINE_MS,
      ...runtime,
    }),
  });
}

/** 파이프라인 시작 후 경과 비율만큼 시간을 이동 */
function advance(ms: number): void {
  t += ms;
}

/** 메모리 저장소 (AsyncStorage 대역) */
class MemoryStorage implements StorageLike {
  readonly data = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.data.delete(key);
  }
}

async function captureError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw new Error(`ApiError 가 아닌 오류: ${String(error)}`);
  }
  throw new Error('Promise 가 성공했지만 실패를 기대했습니다.');
}

function uploadInput(overrides: Partial<UploadDocumentInput> = {}): UploadDocumentInput {
  return {
    files: [
      { uri: 'file:///cache/page-1.jpg', name: 'page-1.jpg', mimeType: 'image/jpeg', size: 1_200 },
      { uri: 'file:///cache/page-2.jpg', name: 'page-2.jpg', mimeType: 'image/jpeg', size: 1_300 },
    ],
    source: 'camera',
    documentType: 'lab_result',
    hospitalName: '  부산테스트병원  ',
    department: '내과',
    visitDate: '2026-11-20',
    ...overrides,
  };
}

/** 업로드 후 파이프라인이 끝날 때까지 시간을 보내고 완료된 문서를 반환 */
async function uploadAndComplete(client: MockApiClient): Promise<MedicalDocument> {
  const uploaded = await client.uploadDocument(uploadInput());
  advance(PIPELINE_MS);
  const doc = await client.getDocument(uploaded.id);
  expect(doc.status).toBe('completed');
  return doc;
}

function isSortedDesc(values: string[]): boolean {
  return values.every((v, i) => i === 0 || values[i - 1] >= v);
}

function isSortedAsc(values: string[]): boolean {
  return values.every((v, i) => i === 0 || values[i - 1] <= v);
}

beforeEach(() => {
  t = START;
  runtime = {};
});

/* ------------------------------------------------------------------ */
/* 고정 데이터 (저장소 주입용)                                           */
/* ------------------------------------------------------------------ */

/** MockApiClient 가 저장소에 보관하는 형식 (seedVersion 이 같으면 그대로 불러온다) */
interface PersistedMockDb {
  seedVersion: number;
  uploadCount: number;
  documents: { doc: MedicalDocument }[];
  analyses: Record<string, DocumentAnalysis>;
  questions: Question[];
}

const FIXTURE_ISO = '2026-04-02T00:00:00.000Z';

function fixtureDocument(overrides: Partial<MedicalDocument> & Pick<MedicalDocument, 'id' | 'visitDate'>): MedicalDocument {
  return {
    title: '가나병원 · 진료기록',
    documentType: 'medical_record',
    hospitalName: '가나병원',
    department: '내과',
    source: 'camera',
    pageCount: 1,
    status: 'completed',
    progress: 100,
    createdAt: `${overrides.visitDate}T09:00:00.000Z`,
    updatedAt: `${overrides.visitDate}T09:00:00.000Z`,
    ...overrides,
  };
}

function fixtureLab(
  id: string,
  code: string,
  name: string,
  value: number,
  flag: LabFlag,
  measuredAt: string,
  referenceRange: LabResult['referenceRange'],
  unit: string,
  category: string,
): LabResult {
  return {
    id,
    code,
    name,
    originalName: code,
    category,
    value,
    unit,
    referenceRange,
    flag,
    measuredAt,
    plainExplanation: `${name} 설명 (${measuredAt})`,
    sentenceIds: [],
  };
}

function fixtureAnalysis(
  documentId: string,
  parts: Pick<DocumentAnalysis, 'diagnoses' | 'labResults' | 'medications' | 'suggestedQuestions'>,
): DocumentAnalysis {
  return {
    documentId,
    generatedAt: FIXTURE_ISO,
    modelVersion: MOCK_MODEL_VERSION,
    overallSummary: `${documentId} 요약`,
    sentences: [],
    disclaimer: '참고용 해설입니다.',
    ...parts,
  };
}

const SUGGESTIONS_A = ['당화혈색소 목표는 얼마인가요?', '식단은 어떻게 조절하나요?', '약은 계속 먹어야 하나요?'];

/**
 * 문서 A(1월, 완료) · B(3월, 완료) · C(4월, 분석 실패).
 * 저장 순서를 날짜순과 다르게 두어 정렬이 서버에서 이뤄지는지 확인한다.
 */
function buildFixtureDb(): PersistedMockDb {
  const docA = fixtureDocument({ id: 'doc_a', visitDate: '2026-01-10', documentType: 'lab_result' });
  const docB = fixtureDocument({ id: 'doc_b', visitDate: '2026-03-05', department: undefined });
  const docC = fixtureDocument({
    id: 'doc_c',
    visitDate: '2026-04-01',
    status: 'failed',
    progress: 40,
    failureReason: '글자를 인식하지 못했어요.',
  });

  const analysisA = fixtureAnalysis('doc_a', {
    diagnoses: [
      {
        id: 'dx_a1',
        name: '제2형 당뇨병',
        originalTerm: 'Type 2 DM',
        code: 'E11.9',
        status: 'confirmed',
        plainExplanation: '혈당이 높은 상태가 계속되는 병이에요.',
        sentenceIds: [],
      },
      {
        id: 'dx_a2',
        name: '위염',
        originalTerm: 'Gastritis',
        code: 'K29.7',
        status: 'ruled_out',
        plainExplanation: '위염은 아닌 것으로 확인됐어요.',
        sentenceIds: [],
      },
    ],
    labResults: [
      fixtureLab('lab_a1', 'HBA1C', '당화혈색소', 7.4, 'high', '2026-01-10', { low: 4, high: 6, text: '4.0-6.0' }, '%', '당뇨'),
      fixtureLab('lab_a2', 'GLU', '공복 혈당', 95, 'normal', '2026-01-10', { low: 70, high: 99, text: '70-99' }, 'mg/dL', '당뇨'),
    ],
    medications: [
      {
        id: 'rx_a1',
        name: '다이아벡스정 500mg',
        ingredient: '메트포르민',
        originalText: 'Metformin 500mg 1T bid pc',
        dose: '1정',
        frequency: '하루 2번, 아침·저녁 식사 직후',
        purpose: '혈당 조절',
        cautions: [],
        sentenceIds: [],
      },
    ],
    suggestedQuestions: SUGGESTIONS_A,
  });

  const analysisB = fixtureAnalysis('doc_b', {
    diagnoses: [
      {
        // A 와 같은 진단(코드 동일) → 타임라인에서는 처음 진단된 날짜에만 표시
        id: 'dx_b1',
        name: '제2형 당뇨병',
        originalTerm: 'T2DM',
        code: 'E11.9',
        status: 'confirmed',
        plainExplanation: '혈당이 높은 상태가 계속되는 병이에요.',
        sentenceIds: [],
      },
      {
        id: 'dx_b2',
        name: '이상지질혈증',
        originalTerm: 'Dyslipidemia',
        code: 'E78.5',
        status: 'suspected',
        plainExplanation: '혈액 속 기름 성분이 많을 수 있어요.',
        sentenceIds: [],
      },
    ],
    labResults: [
      fixtureLab('lab_b1', 'HBA1C', '당화혈색소', 6.8, 'high', '2026-03-05', { low: 4, high: 5.6, text: '4.0-5.6' }, '%', '당뇨'),
      fixtureLab('lab_b2', 'LDL', 'LDL 콜레스테롤', 190, 'critical_high', '2026-03-05', { high: 130, text: '<130' }, 'mg/dL', '지질'),
    ],
    medications: [],
    suggestedQuestions: [],
  });

  return {
    seedVersion: SEED_VERSION,
    uploadCount: 0,
    documents: [{ doc: docB }, { doc: docC }, { doc: docA }],
    analyses: { doc_a: analysisA, doc_b: analysisB },
    questions: [
      {
        id: 'q_saved',
        text: SUGGESTIONS_A[1],
        source: 'ai',
        documentId: 'doc_a',
        isAsked: false,
        createdAt: '2026-01-11T00:00:00.000Z',
        updatedAt: '2026-01-11T00:00:00.000Z',
      },
    ],
  };
}

async function createFixtureClient(): Promise<MockApiClient> {
  const storage = new MemoryStorage();
  await storage.setItem(MOCK_STORAGE_KEY, JSON.stringify(buildFixtureDb()));
  return createClient({ storage });
}

/* ------------------------------------------------------------------ */
/* 샘플 데이터 (실제 시드에 대한 규칙)                                    */
/* ------------------------------------------------------------------ */

describe('샘플 데이터', () => {
  it('health 는 데모 서버 정보를 반환한다', async () => {
    await expect(createClient().health()).resolves.toEqual({
      ok: true,
      version: expect.stringMatching(/^mock-/),
      modelVersion: MOCK_MODEL_VERSION,
    });
  });

  it('문서 목록은 비어 있지 않고 진료일 최신순으로 정렬된다', async () => {
    const docs = await createClient().listDocuments();
    expect(docs.length).toBeGreaterThan(0);
    expect(isSortedDesc(docs.map((d) => d.visitDate))).toBe(true);
    expect(new Set(docs.map((d) => d.id)).size).toBe(docs.length);
  });

  it('완료된 문서는 해설을 갖고, 요약 개수가 해설 내용과 일치한다', async () => {
    const client = createClient();
    const completed = (await client.listDocuments()).filter((d) => d.status === 'completed');
    expect(completed.length).toBeGreaterThan(0);

    for (const doc of completed) {
      const analysis = await client.getAnalysis(doc.id);
      expect(analysis.documentId).toBe(doc.id);
      expect(doc.progress).toBe(100);
      expect(doc.summary).toEqual({
        diagnosisCount: analysis.diagnoses.length,
        labCount: analysis.labResults.length,
        abnormalLabCount: analysis.labResults.filter((l) => l.flag !== 'normal').length,
        medicationCount: analysis.medications.length,
      });
    }
  });

  it('반환값은 복사본이라 화면에서 수정해도 서버 데이터가 바뀌지 않는다', async () => {
    const client = createClient();
    const [first] = await client.listDocuments();
    first.title = '변경된 제목';
    const again = await client.getDocument(first.id);
    expect(again.title).not.toBe('변경된 제목');
  });

  it('검사 항목 목록은 완료된 문서의 검사 결과를 코드별로 집계한다', async () => {
    const client = createClient();
    const catalog = await client.listLabCatalog();
    const docs = (await client.listDocuments()).filter((d) => d.status === 'completed');
    const labs = (await Promise.all(docs.map((d) => client.getAnalysis(d.id)))).flatMap(
      (a) => a.labResults,
    );

    expect(new Set(catalog.map((c) => c.code)).size).toBe(catalog.length);
    expect(catalog.map((c) => c.code).sort()).toEqual([...new Set(labs.map((l) => l.code))].sort());
    for (const item of catalog) {
      const sameCode = labs.filter((l) => l.code === item.code);
      expect(item.count).toBe(sameCode.length);
      expect(item.latestMeasuredAt).toBe(sameCode.map((l) => l.measuredAt).sort().at(-1));
    }
    // 판정이 심각한 항목이 먼저
    const severities = catalog.map((c) => flagSeverity(c.latestFlag));
    expect(severities).toEqual([...severities].sort((a, b) => b - a));
  });

  it('모든 검사 항목의 추이는 측정일 오름차순이고 측정 횟수와 점 개수가 같다', async () => {
    const client = createClient();
    for (const item of await client.listLabCatalog()) {
      const trend = await client.getLabTrend(item.code);
      expect(trend.code).toBe(item.code);
      expect(trend.points).toHaveLength(item.count);
      expect(isSortedAsc(trend.points.map((p) => p.measuredAt))).toBe(true);
      expect(trend.points.at(-1)?.value).toBe(item.latestValue);
    }
  });

  it('타임라인은 날짜 내림차순이고 완료된 문서의 사건만 포함한다', async () => {
    const client = createClient();
    const events = await client.getTimeline();
    const completedIds = new Set(
      (await client.listDocuments()).filter((d) => d.status === 'completed').map((d) => d.id),
    );
    expect(isSortedDesc(events.map((e) => e.date))).toBe(true);
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
    for (const event of events) expect(completedIds.has(event.documentId)).toBe(true);
  });

  it('질문 목록은 안 물어본 질문이 먼저, 그 안에서는 최신순이다', async () => {
    const questions = await createClient().listQuestions();
    const firstAsked = questions.findIndex((q) => q.isAsked);
    if (firstAsked >= 0) expect(questions.slice(firstAsked).every((q) => q.isAsked)).toBe(true);
    const unasked = questions.filter((q) => !q.isAsked).map((q) => q.createdAt);
    const asked = questions.filter((q) => q.isAsked).map((q) => q.createdAt);
    expect(isSortedDesc(unasked)).toBe(true);
    expect(isSortedDesc(asked)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* 문서 등록 · AI 파이프라인                                             */
/* ------------------------------------------------------------------ */

describe('문서 등록', () => {
  it('파일이 없으면 VALIDATION 오류이고 문서가 만들어지지 않는다', async () => {
    const client = createClient();
    const before = await client.listDocuments();
    const onProgress = jest.fn<void, [number]>();

    const error = await captureError(client.uploadDocument(uploadInput({ files: [] }), onProgress));
    expect(error.code).toBe('VALIDATION');
    expect(error.userMessage).toBe('등록할 파일을 선택해 주세요.');
    expect(onProgress).not.toHaveBeenCalled();
    expect(await client.listDocuments()).toHaveLength(before.length);
  });

  it('병원 이름이 공백뿐이면 VALIDATION 오류', async () => {
    const error = await captureError(createClient().uploadDocument(uploadInput({ hospitalName: '   ' })));
    expect(error.code).toBe('VALIDATION');
    expect(error.userMessage).toBe('병원 이름을 입력해 주세요.');
  });

  it('업로드 진행률을 0~1 사이로 단조 증가하며 알린다', async () => {
    const onProgress = jest.fn<void, [number]>();
    await createClient().uploadDocument(uploadInput(), onProgress);
    const ratios = onProgress.mock.calls.map(([r]) => r);
    expect(ratios.length).toBeGreaterThan(1);
    expect(ratios.every((r, i) => r > 0 && r <= 1 && (i === 0 || r > ratios[i - 1]))).toBe(true);
    expect(ratios.at(-1)).toBe(1);
  });

  it('등록 직후 문서는 uploaded 상태이고 입력값이 정리돼 저장된다', async () => {
    const client = createClient();
    const doc = await client.uploadDocument(uploadInput({ department: '  ' }));

    expect(doc).toMatchObject({
      title: `부산테스트병원 · ${DOCUMENT_TYPE_LABEL.lab_result}`,
      hospitalName: '부산테스트병원',
      documentType: 'lab_result',
      visitDate: '2026-11-20',
      source: 'camera',
      pageCount: 2,
      thumbnailUri: 'file:///cache/page-1.jpg',
      status: 'uploaded',
      progress: 5,
      createdAt: new Date(START).toISOString(),
      updatedAt: new Date(START).toISOString(),
    });
    expect(doc.department).toBeUndefined();
    expect(doc.summary).toBeUndefined();
    expect((await client.listDocuments()).map((d) => d.id)).toContain(doc.id);
  });

  it('제목을 입력하면 그대로 사용하고, PDF 는 미리보기 이미지가 없다', async () => {
    const doc = await createClient().uploadDocument(
      uploadInput({
        title: '  11월 건강검진 결과  ',
        source: 'pdf',
        files: [{ uri: 'file:///cache/result.pdf', name: 'result.pdf', mimeType: 'application/pdf' }],
      }),
    );
    expect(doc.title).toBe('11월 건강검진 결과');
    expect(doc.pageCount).toBe(1);
    expect(doc.thumbnailUri).toBeUndefined();
  });

  it('미리보기는 보관소에 맡기고, 응답에는 지금 쓸 수 있는 주소로 바꿔 준다 (삭제하면 함께 지운다)', async () => {
    const removed: string[] = [];
    const thumbnails: ThumbnailStore = {
      save: async (documentId) => `stored:${documentId}`,
      resolve: (stored) => stored.replace('stored:', 'file:///documents/'),
      remove: (stored) => {
        removed.push(stored);
      },
    };
    const storage = new MemoryStorage();
    const client = createClient({ storage, thumbnails });
    const doc = await client.uploadDocument(uploadInput());

    expect(doc.thumbnailUri).toBe(`file:///documents/${doc.id}`);
    expect((await client.getDocument(doc.id)).thumbnailUri).toBe(`file:///documents/${doc.id}`);
    // 기기에는 이름만 저장한다 (앱 업데이트로 앱 폴더 경로가 바뀌어도 다시 찾을 수 있게)
    const saved = storage.data.get(MOCK_STORAGE_KEY) ?? '';
    expect(saved).toContain(`stored:${doc.id}`);
    expect(saved).not.toContain('file:///cache/page-1.jpg');

    await client.deleteDocument(doc.id);
    expect(removed).toEqual([`stored:${doc.id}`]);
  });

  it('여러 번 등록해도 문서 id 가 겹치지 않는다', async () => {
    const client = createClient();
    const a = await client.uploadDocument(uploadInput());
    const b = await client.uploadDocument(uploadInput());
    expect(a.id).not.toBe(b.id);
  });
});

describe('AI 파이프라인', () => {
  it('시간이 지나면 uploaded → ocr → structuring → explaining → completed 로 진행한다', async () => {
    const client = createClient();
    const { id } = await client.uploadDocument(uploadInput());

    const statuses: ProcessingStatus[] = [];
    const progresses: number[] = [];
    for (let elapsed = 0; elapsed <= PIPELINE_MS; elapsed += PIPELINE_MS / 20) {
      t = START + elapsed;
      const doc = await client.getDocument(id);
      if (statuses.at(-1) !== doc.status) statuses.push(doc.status);
      progresses.push(doc.progress);
    }

    expect(statuses).toEqual(['uploaded', 'ocr', 'structuring', 'explaining', 'completed']);
    expect(progresses.every((p, i) => i === 0 || p >= progresses[i - 1])).toBe(true);
    expect(progresses[0]).toBeGreaterThan(0);
    expect(progresses.at(-1)).toBe(100);
  });

  it('처리 중에는 해설이 없고(NOT_FOUND), 완료되면 요약 개수가 해설과 일치한다', async () => {
    const client = createClient();
    const { id } = await client.uploadDocument(uploadInput());

    advance(PIPELINE_MS / 2);
    const pending = await captureError(client.getAnalysis(id));
    expect(pending.code).toBe('NOT_FOUND');
    expect(pending.status).toBe(404);

    advance(PIPELINE_MS);
    const analysis = await client.getAnalysis(id);
    const doc = await client.getDocument(id);
    expect(analysis.documentId).toBe(id);
    expect(analysis.modelVersion).toBe(MOCK_MODEL_VERSION);
    expect(analysis.generatedAt).toBe(doc.updatedAt);
    expect(doc).toMatchObject({ status: 'completed', progress: 100 });
    expect(doc.failureReason).toBeUndefined();
    expect(doc.summary).toEqual({
      diagnosisCount: analysis.diagnoses.length,
      labCount: analysis.labResults.length,
      abnormalLabCount: analysis.labResults.filter((l) => l.flag !== 'normal').length,
      medicationCount: analysis.medications.length,
    });
  });

  it('처리 중인 문서는 타임라인에 나오지 않고, 완료되면 진료 사건이 추가된다', async () => {
    const client = createClient();
    const { id } = await client.uploadDocument(uploadInput());

    advance(PIPELINE_MS / 2);
    expect((await client.getTimeline()).some((e) => e.documentId === id)).toBe(false);

    advance(PIPELINE_MS);
    const events = (await client.getTimeline()).filter((e) => e.documentId === id);
    expect(events.map((e) => e.type)).toContain('visit');
    expect(events.every((e) => e.date === '2026-11-20' && e.hospitalName === '부산테스트병원')).toBe(true);
  });

  it('분석 실패 시뮬레이션: failed + 사유, 해설은 ANALYSIS_FAILED, 다시 분석하면 완료된다', async () => {
    runtime = { forceAnalysisFailure: true };
    const client = createClient();
    const { id } = await client.uploadDocument(uploadInput());

    // 실패 지점 전에는 정상 처리 중으로 보인다
    advance(PIPELINE_MS * 0.2);
    expect((await client.getDocument(id)).status).not.toBe('failed');

    advance(PIPELINE_MS * 0.3);
    const failed = await client.getDocument(id);
    expect(failed.status).toBe('failed');
    expect(failed.failureReason).toEqual(expect.any(String));
    expect(failed.failureReason?.length).toBeGreaterThan(0);

    // 시간이 더 지나도 실패 상태 유지
    advance(PIPELINE_MS * 2);
    expect((await client.getDocument(id)).status).toBe('failed');

    const analysisError = await captureError(client.getAnalysis(id));
    expect(analysisError.code).toBe('ANALYSIS_FAILED');
    expect(analysisError.status).toBe(409);

    // 실패 시뮬레이션이 켜져 있어도 재분석은 성공하도록 동작한다
    const restarted = await client.reanalyzeDocument(id);
    expect(restarted).toMatchObject({ id, status: 'uploaded', progress: 5 });
    expect(restarted.failureReason).toBeUndefined();

    advance(PIPELINE_MS);
    expect((await client.getDocument(id)).status).toBe('completed');
    await expect(client.getAnalysis(id)).resolves.toMatchObject({ documentId: id });
  });

  it('분석 실패 사유는 등록 방법에 맞춰 안내한다 (PDF 는 다시 촬영이 아니라 다른 파일)', async () => {
    runtime = { forceAnalysisFailure: true };
    const client = createClient();
    const { id } = await client.uploadDocument(
      uploadInput({
        source: 'pdf',
        files: [{ uri: 'file:///cache/result.pdf', name: 'result.pdf', mimeType: 'application/pdf', size: 5_000 }],
      }),
    );
    advance(PIPELINE_MS * 0.5);
    const failed = await client.getDocument(id);
    expect(failed.status).toBe('failed');
    expect(failed.failureReason).toMatch(/PDF/);
    expect(failed.failureReason).not.toMatch(/촬영|사진/);
  });

  it('실패하지 않은 문서를 다시 분석하려 하면 VALIDATION 오류', async () => {
    const client = createClient();
    const { id } = await client.uploadDocument(uploadInput());

    const processingError = await captureError(client.reanalyzeDocument(id));
    expect(processingError.code).toBe('VALIDATION');

    advance(PIPELINE_MS);
    const completedError = await captureError(client.reanalyzeDocument(id));
    expect(completedError.code).toBe('VALIDATION');
    expect(completedError.userMessage).toBe('분석에 실패한 진료기록만 다시 분석할 수 있어요.');
  });

  it('없는 문서는 NOT_FOUND', async () => {
    const client = createClient();
    for (const call of [
      client.getDocument('nope'),
      client.getAnalysis('nope'),
      client.reanalyzeDocument('nope'),
      client.deleteDocument('nope'),
      client.suggestQuestions('nope'),
    ]) {
      const error = await captureError(call);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.status).toBe(404);
    }
  });
});

describe('문서 삭제', () => {
  it('문서·해설을 지우고, 연결된 질문은 남기되 문서 연결만 끊는다', async () => {
    const client = createClient();
    const doc = await uploadAndComplete(client);
    const question = await client.createQuestion({ text: '재검사는 언제 하나요?', documentId: doc.id });

    await client.deleteDocument(doc.id);

    expect((await captureError(client.getDocument(doc.id))).code).toBe('NOT_FOUND');
    expect((await captureError(client.getAnalysis(doc.id))).code).toBe('NOT_FOUND');
    expect((await client.listDocuments()).some((d) => d.id === doc.id)).toBe(false);
    expect((await client.getTimeline()).some((e) => e.documentId === doc.id)).toBe(false);

    const kept = (await client.listQuestions()).find((q) => q.id === question.id);
    expect(kept).toBeDefined();
    expect(kept?.documentId).toBeUndefined();
    expect(await client.listQuestions({ documentId: doc.id })).toEqual([]);
  });

  it('처리 중인 문서도 삭제할 수 있다', async () => {
    const client = createClient();
    const { id } = await client.uploadDocument(uploadInput());
    await client.deleteDocument(id);
    advance(PIPELINE_MS);
    expect((await client.listDocuments()).some((d) => d.id === id)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* 질문 리스트                                                          */
/* ------------------------------------------------------------------ */

describe('질문 리스트', () => {
  it('질문을 만들면 앞뒤 공백을 정리하고 기본값을 채운다', async () => {
    const client = createClient();
    const q = await client.createQuestion({ text: '  운동은 얼마나 해야 하나요?  ' });
    expect(q).toMatchObject({
      text: '운동은 얼마나 해야 하나요?',
      source: 'user',
      isAsked: false,
      createdAt: new Date(START).toISOString(),
      updatedAt: new Date(START).toISOString(),
    });
    expect(q.documentId).toBeUndefined();
    expect((await client.listQuestions()).map((x) => x.id)).toContain(q.id);
  });

  it('AI 추천 질문은 출처·문서·관련 항목을 함께 저장한다', async () => {
    const q = await createClient().createQuestion({
      text: '당화혈색소 목표는 얼마인가요?',
      source: 'ai',
      documentId: 'doc_x',
      relatedLabel: '당화혈색소 7.4%',
    });
    expect(q).toMatchObject({ source: 'ai', documentId: 'doc_x', relatedLabel: '당화혈색소 7.4%' });
  });

  it('빈 질문·300자 초과 질문은 VALIDATION 오류 (300자는 허용)', async () => {
    const client = createClient();
    expect((await captureError(client.createQuestion({ text: '   ' }))).userMessage).toBe(
      '질문 내용을 입력해 주세요.',
    );
    expect((await captureError(client.createQuestion({ text: '가'.repeat(301) }))).code).toBe(
      'VALIDATION',
    );
    await expect(client.createQuestion({ text: '가'.repeat(300) })).resolves.toMatchObject({
      text: '가'.repeat(300),
    });
  });

  it('질문 수정: 내용·물어봄 여부·답변 메모를 바꾸고 수정 시각을 갱신한다', async () => {
    const client = createClient();
    const q = await client.createQuestion({ text: '처음 질문' });

    advance(5_000);
    const updated = await client.updateQuestion(q.id, {
      text: '  바뀐 질문  ',
      isAsked: true,
      answerNote: '  3개월 뒤 다시 검사  ',
    });
    expect(updated).toMatchObject({
      id: q.id,
      text: '바뀐 질문',
      isAsked: true,
      answerNote: '3개월 뒤 다시 검사',
      createdAt: q.createdAt,
      updatedAt: new Date(START + 5_000).toISOString(),
    });

    // 빈 답변 메모는 지운다, 지정하지 않은 필드는 유지한다
    const cleared = await client.updateQuestion(q.id, { answerNote: '   ' });
    expect(cleared.answerNote).toBeUndefined();
    expect(cleared.text).toBe('바뀐 질문');
    expect(cleared.isAsked).toBe(true);
  });

  it('질문 수정 오류: 빈 내용은 VALIDATION, 없는 질문은 NOT_FOUND', async () => {
    const client = createClient();
    const q = await client.createQuestion({ text: '질문' });
    expect((await captureError(client.updateQuestion(q.id, { text: ' ' }))).code).toBe('VALIDATION');
    // 작성과 같은 길이 제한(300자) · 답변 메모 500자
    expect((await captureError(client.updateQuestion(q.id, { text: '가'.repeat(301) }))).userMessage).toBe(
      '질문은 300자 이내로 입력해 주세요.',
    );
    expect((await captureError(client.updateQuestion(q.id, { answerNote: '나'.repeat(501) }))).code).toBe(
      'VALIDATION',
    );
    await expect(client.updateQuestion(q.id, { answerNote: '나'.repeat(500) })).resolves.toMatchObject({
      answerNote: '나'.repeat(500),
    });
    await client.updateQuestion(q.id, { answerNote: '' });
    expect((await client.listQuestions()).find((x) => x.id === q.id)?.text).toBe('질문');
    expect((await captureError(client.updateQuestion('nope', { isAsked: true }))).code).toBe(
      'NOT_FOUND',
    );
  });

  it('질문 삭제, 없는 질문 삭제는 NOT_FOUND', async () => {
    const client = createClient();
    const q = await client.createQuestion({ text: '지울 질문' });
    await client.deleteQuestion(q.id);
    expect((await client.listQuestions()).some((x) => x.id === q.id)).toBe(false);
    expect((await captureError(client.deleteQuestion(q.id))).code).toBe('NOT_FOUND');
  });

  it('목록은 안 물어본 질문 먼저, 같은 그룹 안에서는 최신순', async () => {
    const client = createClient();
    const q1 = await client.createQuestion({ text: '첫 번째' });
    advance(1_000);
    const q2 = await client.createQuestion({ text: '두 번째' });
    advance(1_000);
    const q3 = await client.createQuestion({ text: '세 번째' });
    await client.updateQuestion(q3.id, { isAsked: true });

    const mine = new Set([q1.id, q2.id, q3.id]);
    const ordered = (await client.listQuestions()).filter((q) => mine.has(q.id)).map((q) => q.id);
    expect(ordered).toEqual([q2.id, q1.id, q3.id]);
  });

  it('documentId 로 필터링한다', async () => {
    const client = createClient();
    const linked = await client.createQuestion({ text: '문서 질문', documentId: 'doc_filter' });
    await client.createQuestion({ text: '일반 질문' });
    expect(await client.listQuestions({ documentId: 'doc_filter' })).toEqual([linked]);
  });
});

/* ------------------------------------------------------------------ */
/* 집계 결과 (고정 데이터)                                               */
/* ------------------------------------------------------------------ */

describe('집계 결과 (고정 데이터)', () => {
  it('문서 목록은 저장 순서와 무관하게 진료일 최신순', async () => {
    const client = await createFixtureClient();
    expect((await client.listDocuments()).map((d) => d.id)).toEqual(['doc_c', 'doc_b', 'doc_a']);
  });

  it('검사 항목 목록: 코드별 집계, 최근 측정값, 심각한 판정 순 정렬', async () => {
    const catalog = await (await createFixtureClient()).listLabCatalog();
    expect(catalog).toEqual([
      {
        code: 'LDL',
        name: 'LDL 콜레스테롤',
        originalName: 'LDL',
        category: '지질',
        unit: 'mg/dL',
        latestValue: 190,
        latestFlag: 'critical_high',
        latestMeasuredAt: '2026-03-05',
        count: 1,
        recentValues: [190],
      },
      {
        code: 'HBA1C',
        name: '당화혈색소',
        originalName: 'HBA1C',
        category: '당뇨',
        unit: '%',
        latestValue: 6.8,
        latestFlag: 'high',
        latestMeasuredAt: '2026-03-05',
        count: 2,
        recentValues: [7.4, 6.8],
      },
      {
        code: 'GLU',
        name: '공복 혈당',
        originalName: 'GLU',
        category: '당뇨',
        unit: 'mg/dL',
        latestValue: 95,
        latestFlag: 'normal',
        latestMeasuredAt: '2026-01-10',
        count: 1,
        recentValues: [95],
      },
    ]);
  });

  it('검사 추이: 측정일 오름차순, 참고치·설명은 가장 최근 결과 기준', async () => {
    const trend = await (await createFixtureClient()).getLabTrend('HBA1C');
    expect(trend).toEqual({
      code: 'HBA1C',
      name: '당화혈색소',
      originalName: 'HBA1C',
      category: '당뇨',
      unit: '%',
      referenceRange: { low: 4, high: 5.6, text: '4.0-5.6' },
      plainExplanation: '당화혈색소 설명 (2026-03-05)',
      points: [
        { documentId: 'doc_a', labResultId: 'lab_a1', measuredAt: '2026-01-10', value: 7.4, flag: 'high' },
        { documentId: 'doc_b', labResultId: 'lab_b1', measuredAt: '2026-03-05', value: 6.8, flag: 'high' },
      ],
    });
  });

  it('측정 이력이 없는 검사 코드는 NOT_FOUND', async () => {
    const error = await captureError((await createFixtureClient()).getLabTrend('UNKNOWN_CODE'));
    expect(error.code).toBe('NOT_FOUND');
  });

  it('타임라인: 날짜 내림차순 · 같은 날은 진료→진단→검사→처방 순 · 실패 문서 제외', async () => {
    const events = await (await createFixtureClient()).getTimeline();
    expect(events.map((e) => [e.date, e.type, e.documentId])).toEqual([
      ['2026-03-05', 'visit', 'doc_b'],
      ['2026-03-05', 'diagnosis', 'doc_b'],
      ['2026-03-05', 'lab', 'doc_b'],
      ['2026-01-10', 'visit', 'doc_a'],
      ['2026-01-10', 'diagnosis', 'doc_a'],
      ['2026-01-10', 'lab', 'doc_a'],
      ['2026-01-10', 'prescription', 'doc_a'],
    ]);
  });

  it('타임라인 진단: 같은 진단은 처음 진단된 날에만, 배제된 진단은 제외, 의심 진단은 구분 표시', async () => {
    const diagnoses = (await (await createFixtureClient()).getTimeline()).filter(
      (e) => e.type === 'diagnosis',
    );
    expect(diagnoses.map((e) => [e.documentId, e.title])).toEqual([
      ['doc_b', '의심 진단: 이상지질혈증'],
      ['doc_a', '진단: 제2형 당뇨병'],
    ]);
  });

  it('타임라인 진단: 의심 진단이 나중 기록에서 확진되면 그날 진단 확정으로 한 번 더 표시한다', async () => {
    const db = buildFixtureDb();
    // A(1월)에서 의심 → B(3월)에서 확진
    db.analyses.doc_a.diagnoses.push({
      id: 'dx_a3',
      name: '이상지질혈증',
      originalTerm: 'Dyslipidemia',
      code: 'E78.5',
      status: 'suspected',
      plainExplanation: '혈액 속 기름 성분이 많을 수 있어요.',
      sentenceIds: [],
    });
    const dxB2 = db.analyses.doc_b.diagnoses.find((d) => d.id === 'dx_b2');
    if (!dxB2) throw new Error('fixture dx_b2 없음');
    dxB2.status = 'confirmed';
    const storage = new MemoryStorage();
    await storage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));

    const diagnoses = (await createClient({ storage }).getTimeline()).filter((e) => e.type === 'diagnosis');
    expect(diagnoses.map((e) => [e.documentId, e.title])).toEqual([
      ['doc_b', '진단 확정: 이상지질혈증'],
      ['doc_a', '진단: 제2형 당뇨병'],
      ['doc_a', '의심 진단: 이상지질혈증'],
    ]);
  });

  it('시드 타임라인은 의심 진단이 확진된 날을 보여 준다', async () => {
    const titles = (await createClient().getTimeline())
      .filter((e) => e.type === 'diagnosis')
      .map((e) => e.title);
    expect(titles.filter((t) => t.startsWith('진단 확정:')).length).toBeGreaterThan(0);
  });

  it('타임라인 검사 사건: 이상 항목 수·가장 심각한 판정, 이상 항목이 하나면 검사 코드 연결', async () => {
    const labs = (await (await createFixtureClient()).getTimeline()).filter((e) => e.type === 'lab');
    const [labB, labA] = labs;

    expect(labA).toMatchObject({
      documentId: 'doc_a',
      title: '검사 2항목 · 확인 필요 1',
      description: '당화혈색소 7.4%',
      flag: 'high',
      labCode: 'HBA1C',
    });
    // 값과 단위는 앱의 다른 화면과 같은 형식 ('190 mg/dL', 퍼센트는 붙여 '6.8%')
    expect(labB).toMatchObject({
      documentId: 'doc_b',
      flag: 'critical_high',
      description: '당화혈색소 6.8%, LDL 콜레스테롤 190 mg/dL',
    });
    expect(labB.labCode).toBeUndefined();
  });

  it('타임라인 진료 사건은 진료과·문서 종류와 문서 요약을 보여준다', async () => {
    const visits = (await (await createFixtureClient()).getTimeline()).filter((e) => e.type === 'visit');
    expect(visits.map((e) => [e.title, e.description])).toEqual([
      [DOCUMENT_TYPE_LABEL.medical_record, 'doc_b 요약'],
      [`내과 ${DOCUMENT_TYPE_LABEL.lab_result}`, 'doc_a 요약'],
    ]);
  });

  it('AI 질문 추천은 이미 저장한 질문을 제외한다', async () => {
    const client = await createFixtureClient();
    await expect(client.suggestQuestions('doc_a')).resolves.toEqual([SUGGESTIONS_A[0], SUGGESTIONS_A[2]]);

    await client.createQuestion({ text: SUGGESTIONS_A[0], source: 'ai', documentId: 'doc_a' });
    await expect(client.suggestQuestions('doc_a')).resolves.toEqual([SUGGESTIONS_A[2]]);
  });

  it('해설이 없는 문서(분석 실패)는 질문 추천이 NOT_FOUND', async () => {
    const error = await captureError((await createFixtureClient()).suggestQuestions('doc_c'));
    expect(error.code).toBe('NOT_FOUND');
    expect(error.userMessage).toBe('해설이 완료된 진료기록에서만 질문을 추천받을 수 있어요.');
  });
});

/* ------------------------------------------------------------------ */
/* 지연·오류 주입                                                       */
/* ------------------------------------------------------------------ */

describe('지연·오류 주입 (개발자 도구)', () => {
  it('응답 지연 설정만큼 기다린다', async () => {
    runtime = { latencyMs: 400 };
    const sleep = jest.fn<Promise<void>, [number]>(async () => undefined);
    await createClient({ sleep }).listDocuments();
    expect(sleep).toHaveBeenCalledTimes(1);
    const [ms] = sleep.mock.calls[0];
    expect(ms).toBeGreaterThanOrEqual(400 * 0.6);
    expect(ms).toBeLessThanOrEqual(400 * 1.4);
  });

  it('오류율 100% 이면 재시도 가능한 NETWORK 또는 SERVER 오류로 실패한다', async () => {
    runtime = { failureRate: 1 };
    const codes = new Set<string>();
    for (const random of [() => 0.2, () => 0.7]) {
      const error = await captureError(createClient({ random }).listDocuments());
      expect(['NETWORK', 'SERVER']).toContain(error.code);
      expect(error.retryable).toBe(true);
      codes.add(error.code);
    }
    expect(codes).toEqual(new Set(['NETWORK', 'SERVER']));
  });

  it('오류로 실패한 요청은 데이터를 바꾸지 않는다', async () => {
    const client = createClient();
    const docsBefore = await client.listDocuments();
    const questionsBefore = await client.listQuestions();

    runtime = { failureRate: 1 };
    await captureError(client.createQuestion({ text: '저장되면 안 되는 질문' }));
    await captureError(client.uploadDocument(uploadInput()));

    runtime = {};
    expect(await client.listQuestions()).toHaveLength(questionsBefore.length);
    expect(await client.listDocuments()).toHaveLength(docsBefore.length);
  });

  it('health 는 오류 주입과 무관하게 응답한다', async () => {
    runtime = { failureRate: 1 };
    await expect(createClient().health()).resolves.toMatchObject({ ok: true });
  });
});

/* ------------------------------------------------------------------ */
/* 영구 저장                                                            */
/* ------------------------------------------------------------------ */

describe('영구 저장', () => {
  it('저장소를 통해 다른 인스턴스(앱 재시작)에서도 데이터가 유지된다', async () => {
    const storage = new MemoryStorage();
    const first = createClient({ storage });
    const question = await first.createQuestion({ text: '재시작 후에도 남아야 하는 질문' });
    const uploaded = await first.uploadDocument(uploadInput());

    const raw = storage.data.get(MOCK_STORAGE_KEY);
    expect(raw).toBeDefined();
    expect((JSON.parse(raw as string) as PersistedMockDb).seedVersion).toBe(SEED_VERSION);

    const second = createClient({ storage });
    expect((await second.listQuestions()).find((q) => q.id === question.id)?.text).toBe(question.text);
    expect((await second.getDocument(uploaded.id)).status).toBe('uploaded');

    // 처리 단계 정보도 저장되어 재시작 후에도 파이프라인이 이어서 진행된다
    advance(PIPELINE_MS);
    expect((await createClient({ storage }).getDocument(uploaded.id)).status).toBe('completed');
  });

  it('시드 버전이 다른 저장 데이터는 버리고 새 샘플 데이터로 시작한다', async () => {
    const storage = new MemoryStorage();
    await storage.setItem(
      MOCK_STORAGE_KEY,
      JSON.stringify({ ...buildFixtureDb(), seedVersion: SEED_VERSION + 1 }),
    );
    const ids = (await createClient({ storage }).listDocuments()).map((d) => d.id);
    expect(ids).not.toContain('doc_a');
    expect(ids.length).toBeGreaterThan(0);
  });

  it('손상된 저장 데이터나 저장소 오류가 있어도 동작한다', async () => {
    const corrupted = new MemoryStorage();
    await corrupted.setItem(MOCK_STORAGE_KEY, '{not json');
    await expect(createClient({ storage: corrupted }).listDocuments()).resolves.not.toHaveLength(0);

    const failing: StorageLike = {
      getItem: () => Promise.reject(new Error('read failed')),
      setItem: () => Promise.reject(new Error('disk full')),
      removeItem: () => Promise.resolve(),
    };
    const client = createClient({ storage: failing });
    await expect(client.listDocuments()).resolves.not.toHaveLength(0);
    await expect(client.createQuestion({ text: '저장 실패해도 생성' })).resolves.toMatchObject({
      text: '저장 실패해도 생성',
    });
  });

  it('데모 데이터 초기화는 샘플 상태로 되돌리고 저장소에도 반영한다', async () => {
    const storage = new MemoryStorage();
    const client = createClient({ storage });
    const initialCount = (await client.listDocuments()).length;
    const question = await client.createQuestion({ text: '초기화되면 사라질 질문' });
    await client.uploadDocument(uploadInput());

    await client.resetDemoData();

    expect(await client.listDocuments()).toHaveLength(initialCount);
    expect((await client.listQuestions()).some((q) => q.id === question.id)).toBe(false);
    const reopened = createClient({ storage });
    expect((await reopened.listQuestions()).some((q) => q.id === question.id)).toBe(false);
  });
});
