/**
 * 내장 데모 서버 (MockApiClient).
 *
 * 창업동아리 백엔드가 연결되지 않은 상태에서도 베타테스트·시연이 가능하도록
 * `ApiClient` 계약을 그대로 흉내 낸다.
 *
 * - 데이터는 기기 내 AsyncStorage 에 저장되어 앱을 재시작해도 유지된다.
 * - 업로드된 문서는 실제 AI 파이프라인처럼 업로드 → 글자 인식 → 항목 구조화 → 해설 생성
 *   단계를 시간 경과에 따라 진행하며, 완료 시 샘플 해설 템플릿으로 결과를 생성한다.
 * - 개발자 설정에서 응답 지연·오류 발생률·분석 실패를 조절해 로딩/오류 화면을 검증할 수 있다.
 */
import type {
  CreateQuestionInput,
  DiagnosisStatus,
  DocumentAnalysis,
  DocumentSource,
  DocumentSummaryCounts,
  HealthStatus,
  LabCatalogItem,
  LabFlag,
  LabResult,
  LabTrend,
  MedicalDocument,
  ProcessingStatus,
  Question,
  QuestionFilter,
  TimelineEvent,
  UpdateQuestionInput,
  UploadDocumentInput,
} from '@/types/domain';
import { formatNumber } from '@/lib/format';
import { DOCUMENT_TYPE_LABEL } from '@/lib/labels';
import { flagSeverity, withUnit } from '@/lib/labs';

import type { ApiClient, UploadProgressHandler } from '../client';
import { ApiError } from '../errors';
import { buildAnalysisForUpload, createSeedData, MOCK_MODEL_VERSION, SEED_VERSION } from './seed';
import { passthroughThumbnailStore, type ThumbnailStore } from './thumbnail-store';

/* ------------------------------------------------------------------ */
/* 설정                                                                */
/* ------------------------------------------------------------------ */

export interface MockRuntimeOptions {
  /** 평균 응답 지연 (ms) */
  latencyMs: number;
  /** 0~1, 요청이 네트워크/서버 오류로 실패할 확률 */
  failureRate: number;
  /** true 이면 다음 업로드 문서 1건의 AI 분석이 실패한다 (사용 후 onForcedFailureConsumed 호출) */
  forceAnalysisFailure: boolean;
  /** AI 파이프라인 전체 소요 시간 (ms) */
  pipelineDurationMs: number;
}

export const DEFAULT_MOCK_OPTIONS: MockRuntimeOptions = {
  latencyMs: 500,
  failureRate: 0,
  forceAnalysisFailure: false,
  pipelineDurationMs: 9_000,
};

export interface StorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface MockApiClientOptions {
  /** null 이면 메모리에만 저장 (테스트용) */
  storage?: StorageLike | null;
  getOptions?: () => Partial<MockRuntimeOptions>;
  /** forceAnalysisFailure 가 한 번 적용된 뒤 호출 — 설정 스토어가 옵션을 끄도록 연결한다 */
  onForcedFailureConsumed?: () => void;
  /** 문서 미리보기 보관소 (기본: 받은 주소를 그대로 저장 — 테스트용). 앱은 기기 저장소에 복사하는 보관소를 넘긴다 */
  thumbnails?: ThumbnailStore;
  now?: () => number;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export const MOCK_STORAGE_KEY = 'health-note/mock-db';

/* ------------------------------------------------------------------ */
/* 내부 저장 구조                                                        */
/* ------------------------------------------------------------------ */

interface PipelineState {
  startedAt: number;
  willFail: boolean;
  templateIndex: number;
}

interface MockDocumentRecord {
  doc: MedicalDocument;
  pipeline?: PipelineState;
}

interface MockDb {
  seedVersion: number;
  uploadCount: number;
  documents: MockDocumentRecord[];
  analyses: Record<string, DocumentAnalysis>;
  questions: Question[];
}

/** 타임라인 진단 이벤트 제목 접두어 (ruled_out 은 타임라인에 표시하지 않음) */
const DIAGNOSIS_TIMELINE_PREFIX: Record<DiagnosisStatus, string> = {
  confirmed: '진단',
  suspected: '의심 진단',
  history: '과거력',
  ruled_out: '배제',
};

/** 의심 진단이 나중 기록에서 확진으로 바뀐 날의 이벤트 제목 접두어 */
const DIAGNOSIS_CONFIRMED_LATER_PREFIX = '진단 확정';

/** 파이프라인 단계별 누적 비율 */
const STAGES: { status: ProcessingStatus; until: number; from: number; to: number }[] = [
  { status: 'uploaded', until: 0.12, from: 5, to: 10 },
  { status: 'ocr', until: 0.45, from: 10, to: 40 },
  { status: 'structuring', until: 0.75, from: 40, to: 70 },
  { status: 'explaining', until: 1, from: 70, to: 95 },
];

/** 계약상 입력 길이 제한 (docs/API_CONTRACT.md §4.12·4.13) */
const QUESTION_TEXT_MAX_LENGTH = 300;
const ANSWER_NOTE_MAX_LENGTH = 500;

const FAILURE_POINT = 0.4;
/** 데모 분석 실패 사유 — 실패 화면의 '새로 등록' 버튼(다시 촬영 · 다른 사진 · 다른 파일)과 같은 행동을 안내한다 */
const FAILURE_REASON: Record<DocumentSource, string> = {
  camera:
    '사진에서 글자를 충분히 인식하지 못했어요. 그림자나 흔들림 없이 문서 전체가 보이도록 다시 촬영해 주세요.',
  gallery:
    '사진에서 글자를 충분히 인식하지 못했어요. 문서 전체가 흔들림 없이 선명하게 찍힌 사진으로 다시 등록해 주세요.',
  pdf: 'PDF에서 글자를 충분히 인식하지 못했어요. 스캔 화질이 낮을 수 있으니 더 선명한 파일로 다시 등록해 주세요.',
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function summarize(analysis: DocumentAnalysis): DocumentSummaryCounts {
  return {
    diagnosisCount: analysis.diagnoses.length,
    labCount: analysis.labResults.length,
    abnormalLabCount: analysis.labResults.filter((l) => l.flag !== 'normal').length,
    medicationCount: analysis.medications.length,
  };
}

function byVisitDateDesc(a: MedicalDocument, b: MedicalDocument): number {
  if (a.visitDate !== b.visitDate) return a.visitDate < b.visitDate ? 1 : -1;
  return a.createdAt < b.createdAt ? 1 : -1;
}

/* ------------------------------------------------------------------ */

export class MockApiClient implements ApiClient {
  readonly mode = 'mock' as const;

  private db: MockDb | null = null;
  private loading: Promise<MockDb> | null = null;
  private readonly storage: StorageLike | null;
  private readonly getOptions: () => Partial<MockRuntimeOptions>;
  private readonly onForcedFailureConsumed?: () => void;
  private readonly thumbnails: ThumbnailStore;
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private idCounter = 0;

  constructor(options: MockApiClientOptions = {}) {
    this.storage = options.storage ?? null;
    this.getOptions = options.getOptions ?? (() => ({}));
    this.onForcedFailureConsumed = options.onForcedFailureConsumed;
    this.thumbnails = options.thumbnails ?? passthroughThumbnailStore;
    this.now = options.now ?? (() => Date.now());
    this.random = options.random ?? Math.random;
    this.sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  /* ---------------- 공통 유틸 ---------------- */

  private get options(): MockRuntimeOptions {
    return { ...DEFAULT_MOCK_OPTIONS, ...this.getOptions() };
  }

  private nextId(prefix: string): string {
    this.idCounter += 1;
    return `${prefix}_${this.now().toString(36)}${this.idCounter.toString(36)}${Math.floor(
      this.random() * 1e6,
    ).toString(36)}`;
  }

  private nowIso(): string {
    return new Date(this.now()).toISOString();
  }

  /** 응답용 문서 사본 — 보관한 미리보기 이름을 지금 쓸 수 있는 주소로 바꾼다 */
  private present(doc: MedicalDocument): MedicalDocument {
    const copy = clone(doc);
    if (copy.thumbnailUri) copy.thumbnailUri = this.thumbnails.resolve(copy.thumbnailUri);
    return copy;
  }

  /** 네트워크 지연 + 오류 주입 */
  private async simulateNetwork(): Promise<void> {
    const { latencyMs, failureRate } = this.options;
    if (latencyMs > 0) await this.sleep(Math.round(latencyMs * (0.6 + this.random() * 0.8)));
    if (failureRate > 0 && this.random() < failureRate) {
      throw new ApiError(this.random() < 0.5 ? 'NETWORK' : 'SERVER', {
        status: undefined,
        message: 'mock injected failure',
      });
    }
  }

  private async load(): Promise<MockDb> {
    if (this.db) return this.db;
    if (!this.loading) {
      this.loading = (async () => {
        let db: MockDb | null = null;
        if (this.storage) {
          try {
            const raw = await this.storage.getItem(MOCK_STORAGE_KEY);
            if (raw) {
              const parsed = JSON.parse(raw) as MockDb;
              if (parsed.seedVersion === SEED_VERSION) db = parsed;
            }
          } catch {
            db = null;
          }
        }
        if (!db) db = this.freshDb();
        this.db = db;
        return db;
      })();
    }
    return this.loading;
  }

  private freshDb(): MockDb {
    const seed = createSeedData(new Date(this.now()));
    return {
      seedVersion: SEED_VERSION,
      uploadCount: 0,
      documents: seed.documents.map((doc) => ({ doc })),
      analyses: seed.analyses,
      questions: seed.questions,
    };
  }

  private async persist(): Promise<void> {
    if (!this.storage || !this.db) return;
    try {
      await this.storage.setItem(MOCK_STORAGE_KEY, JSON.stringify(this.db));
    } catch {
      // 저장 실패는 데모 동작에 영향을 주지 않는다
    }
  }

  /** 시간 경과에 따라 처리 중 문서의 상태를 갱신. 변경이 있으면 true */
  private advancePipelines(db: MockDb): boolean {
    let changed = false;
    const { pipelineDurationMs } = this.options;
    for (const record of db.documents) {
      const p = record.pipeline;
      if (!p) continue;
      const ratio = Math.max(0, (this.now() - p.startedAt) / Math.max(1, pipelineDurationMs));
      const doc = record.doc;

      if (p.willFail && ratio >= FAILURE_POINT) {
        doc.status = 'failed';
        doc.progress = 40;
        doc.failureReason = FAILURE_REASON[doc.source] ?? FAILURE_REASON.camera;
        doc.updatedAt = this.nowIso();
        record.pipeline = undefined;
        changed = true;
        continue;
      }

      if (ratio >= 1) {
        const analysis = buildAnalysisForUpload({
          document: doc,
          templateIndex: p.templateIndex,
          generatedAt: this.nowIso(),
        });
        db.analyses[doc.id] = analysis;
        doc.status = 'completed';
        doc.progress = 100;
        doc.summary = summarize(analysis);
        doc.failureReason = undefined;
        doc.updatedAt = this.nowIso();
        record.pipeline = undefined;
        changed = true;
        continue;
      }

      const stage = STAGES.find((s) => ratio < s.until) ?? STAGES[STAGES.length - 1];
      const prevUntil = STAGES[STAGES.indexOf(stage) - 1]?.until ?? 0;
      const within = (ratio - prevUntil) / (stage.until - prevUntil);
      const progress = Math.round(stage.from + (stage.to - stage.from) * Math.min(1, within));
      if (doc.status !== stage.status || doc.progress !== progress) {
        doc.status = stage.status;
        doc.progress = progress;
        doc.updatedAt = this.nowIso();
        changed = true;
      }
    }
    return changed;
  }

  /** 읽기 전 공통 처리: 로드 + 파이프라인 진행 + 지연/오류 주입 */
  private async read(): Promise<MockDb> {
    const db = await this.load();
    if (this.advancePipelines(db)) await this.persist();
    await this.simulateNetwork();
    return db;
  }

  private findRecord(db: MockDb, id: string): MockDocumentRecord {
    const record = db.documents.find((r) => r.doc.id === id);
    if (!record) throw new ApiError('NOT_FOUND', { status: 404 });
    return record;
  }

  private completedAnalyses(db: MockDb): { doc: MedicalDocument; analysis: DocumentAnalysis }[] {
    return db.documents
      .map((r) => ({ doc: r.doc, analysis: db.analyses[r.doc.id] }))
      .filter((x): x is { doc: MedicalDocument; analysis: DocumentAnalysis } =>
        Boolean(x.analysis && x.doc.status === 'completed'),
      );
  }

  /** 데모 데이터를 초기 상태로 되돌린다 (설정 > 개발자 도구) */
  async resetDemoData(): Promise<void> {
    for (const record of this.db?.documents ?? []) {
      if (record.doc.thumbnailUri) this.thumbnails.remove(record.doc.thumbnailUri);
    }
    this.db = this.freshDb();
    this.loading = Promise.resolve(this.db);
    await this.persist();
  }

  /* ---------------- ApiClient 구현 ---------------- */

  async health(): Promise<HealthStatus> {
    await this.load();
    return { ok: true, version: 'mock-1.0.0', modelVersion: MOCK_MODEL_VERSION };
  }

  async listDocuments(): Promise<MedicalDocument[]> {
    const db = await this.read();
    return db.documents
      .map((r) => r.doc)
      .sort(byVisitDateDesc)
      .map((doc) => this.present(doc));
  }

  async getDocument(id: string): Promise<MedicalDocument> {
    const db = await this.read();
    return this.present(this.findRecord(db, id).doc);
  }

  async uploadDocument(
    input: UploadDocumentInput,
    onProgress?: UploadProgressHandler,
  ): Promise<MedicalDocument> {
    if (input.files.length === 0) {
      throw new ApiError('VALIDATION', { userMessage: '등록할 파일을 선택해 주세요.' });
    }
    if (!input.hospitalName.trim()) {
      throw new ApiError('VALIDATION', { userMessage: '병원 이름을 입력해 주세요.' });
    }
    const db = await this.load();

    // 업로드 진행률 시뮬레이션
    const steps = 5;
    const { latencyMs } = this.options;
    for (let i = 1; i <= steps; i += 1) {
      await this.sleep(Math.max(80, latencyMs / 2));
      onProgress?.(i / steps);
    }
    await this.simulateNetwork();

    const { forceAnalysisFailure } = this.options;
    const id = this.nextId('doc');
    const createdAt = this.nowIso();
    const first = input.files[0];
    // 사진 선택 창의 임시 파일·blob: 주소는 곧 사라지므로 미리보기를 따로 보관한다 (PDF 는 미리보기 없음)
    const thumbnailUri = first.mimeType.startsWith('image/') ? await this.thumbnails.save(id, first) : undefined;
    const doc: MedicalDocument = {
      id,
      title:
        input.title?.trim() || `${input.hospitalName.trim()} · ${DOCUMENT_TYPE_LABEL[input.documentType]}`,
      documentType: input.documentType,
      hospitalName: input.hospitalName.trim(),
      department: input.department?.trim() || undefined,
      visitDate: input.visitDate,
      source: input.source,
      pageCount: input.files.length,
      thumbnailUri,
      status: 'uploaded',
      progress: 5,
      createdAt,
      updatedAt: createdAt,
    };
    db.uploadCount += 1;
    db.documents.push({
      doc,
      pipeline: {
        startedAt: this.now(),
        willFail: forceAnalysisFailure,
        templateIndex: db.uploadCount - 1,
      },
    });
    await this.persist();
    if (forceAnalysisFailure) this.onForcedFailureConsumed?.();
    return this.present(doc);
  }

  async deleteDocument(id: string): Promise<void> {
    const db = await this.read();
    const record = this.findRecord(db, id);
    if (record.doc.thumbnailUri) this.thumbnails.remove(record.doc.thumbnailUri);
    db.documents = db.documents.filter((r) => r.doc.id !== id);
    delete db.analyses[id];
    db.questions = db.questions.map((q) =>
      q.documentId === id ? { ...q, documentId: undefined } : q,
    );
    await this.persist();
  }

  async reanalyzeDocument(id: string): Promise<MedicalDocument> {
    const db = await this.read();
    const record = this.findRecord(db, id);
    if (record.doc.status !== 'failed') {
      throw new ApiError('VALIDATION', { userMessage: '분석에 실패한 진료기록만 다시 분석할 수 있어요.' });
    }
    record.doc.status = 'uploaded';
    record.doc.progress = 5;
    record.doc.failureReason = undefined;
    record.doc.updatedAt = this.nowIso();
    record.pipeline = {
      startedAt: this.now(),
      willFail: false,
      templateIndex: db.uploadCount,
    };
    await this.persist();
    return this.present(record.doc);
  }

  async getAnalysis(documentId: string): Promise<DocumentAnalysis> {
    const db = await this.read();
    const record = this.findRecord(db, documentId);
    if (record.doc.status === 'failed') {
      throw new ApiError('ANALYSIS_FAILED', { status: 409 });
    }
    const analysis = db.analyses[documentId];
    if (!analysis || record.doc.status !== 'completed') {
      throw new ApiError('NOT_FOUND', {
        status: 404,
        userMessage: '아직 해설을 만들고 있어요. 잠시 후 다시 확인해 주세요.',
      });
    }
    return clone(analysis);
  }

  async listLabCatalog(): Promise<LabCatalogItem[]> {
    const db = await this.read();
    // 검사 코드별로 모아 측정일 오름차순 정렬 → 마지막이 최신
    const byCode = new Map<string, LabResult[]>();
    for (const { analysis } of this.completedAnalyses(db)) {
      for (const lab of analysis.labResults) {
        const list = byCode.get(lab.code) ?? [];
        list.push(lab);
        byCode.set(lab.code, list);
      }
    }
    const map = new Map<string, LabCatalogItem>();
    for (const [code, labs] of byCode) {
      labs.sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
      const latest = labs[labs.length - 1];
      map.set(code, {
        code,
        name: latest.name,
        originalName: latest.originalName,
        category: latest.category,
        unit: latest.unit,
        latestValue: latest.value,
        latestFlag: latest.flag,
        latestMeasuredAt: latest.measuredAt,
        count: labs.length,
        recentValues: labs.slice(-6).map((l) => l.value),
      });
    }
    return [...map.values()].sort(
      (a, b) =>
        flagSeverity(b.latestFlag) - flagSeverity(a.latestFlag) ||
        a.category.localeCompare(b.category, 'ko') ||
        a.name.localeCompare(b.name, 'ko'),
    );
  }

  async getLabTrend(code: string): Promise<LabTrend> {
    const db = await this.read();
    const entries = this.completedAnalyses(db).flatMap(({ doc, analysis }) =>
      analysis.labResults.filter((l) => l.code === code).map((lab) => ({ doc, lab })),
    );
    if (entries.length === 0) throw new ApiError('NOT_FOUND', { status: 404 });
    // 안정 정렬(Array.prototype.sort) + localeCompare → 같은 날짜는 저장 순서 유지 (목록의 최신값과 일치)
    entries.sort((a, b) => a.lab.measuredAt.localeCompare(b.lab.measuredAt));
    const latest = entries[entries.length - 1].lab;
    return clone({
      code,
      name: latest.name,
      originalName: latest.originalName,
      category: latest.category,
      unit: latest.unit,
      referenceRange: latest.referenceRange,
      plainExplanation: latest.plainExplanation,
      points: entries.map(({ doc, lab }) => ({
        documentId: doc.id,
        labResultId: lab.id,
        measuredAt: lab.measuredAt,
        value: lab.value,
        flag: lab.flag,
      })),
    });
  }

  async listQuestions(filter?: QuestionFilter): Promise<Question[]> {
    const db = await this.read();
    const list = filter?.documentId
      ? db.questions.filter((q) => q.documentId === filter.documentId)
      : db.questions;
    // 안 물어본 질문 먼저, 그 안에서는 최신순
    return clone(
      [...list].sort(
        (a, b) =>
          Number(a.isAsked) - Number(b.isAsked) || (a.createdAt < b.createdAt ? 1 : -1),
      ),
    );
  }

  async createQuestion(input: CreateQuestionInput): Promise<Question> {
    const text = input.text.trim();
    if (!text) throw new ApiError('VALIDATION', { userMessage: '질문 내용을 입력해 주세요.' });
    if (text.length > QUESTION_TEXT_MAX_LENGTH) {
      throw new ApiError('VALIDATION', { userMessage: '질문은 300자 이내로 입력해 주세요.' });
    }
    const db = await this.read();
    const createdAt = this.nowIso();
    const question: Question = {
      id: this.nextId('q'),
      text,
      source: input.source ?? 'user',
      documentId: input.documentId,
      relatedLabel: input.relatedLabel,
      isAsked: false,
      createdAt,
      updatedAt: createdAt,
    };
    db.questions.push(question);
    await this.persist();
    return clone(question);
  }

  async updateQuestion(id: string, input: UpdateQuestionInput): Promise<Question> {
    const db = await this.read();
    const question = db.questions.find((q) => q.id === id);
    if (!question) throw new ApiError('NOT_FOUND', { status: 404 });
    if (input.text !== undefined) {
      const text = input.text.trim();
      if (!text) throw new ApiError('VALIDATION', { userMessage: '질문 내용을 입력해 주세요.' });
      if (text.length > QUESTION_TEXT_MAX_LENGTH) {
        throw new ApiError('VALIDATION', { userMessage: '질문은 300자 이내로 입력해 주세요.' });
      }
      question.text = text;
    }
    if (input.isAsked !== undefined) question.isAsked = input.isAsked;
    if (input.answerNote !== undefined) {
      const answerNote = input.answerNote.trim();
      if (answerNote.length > ANSWER_NOTE_MAX_LENGTH) {
        throw new ApiError('VALIDATION', { userMessage: '답변 메모는 500자 이내로 입력해 주세요.' });
      }
      question.answerNote = answerNote || undefined;
    }
    question.updatedAt = this.nowIso();
    await this.persist();
    return clone(question);
  }

  async deleteQuestion(id: string): Promise<void> {
    const db = await this.read();
    if (!db.questions.some((q) => q.id === id)) throw new ApiError('NOT_FOUND', { status: 404 });
    db.questions = db.questions.filter((q) => q.id !== id);
    await this.persist();
  }

  async suggestQuestions(documentId: string): Promise<string[]> {
    const db = await this.read();
    // AI 추천 생성 시간을 흉내
    await this.sleep(Math.min(1500, this.options.latencyMs * 2));
    this.findRecord(db, documentId);
    const analysis = db.analyses[documentId];
    if (!analysis) {
      throw new ApiError('NOT_FOUND', {
        status: 404,
        userMessage: '해설이 완료된 진료기록에서만 질문을 추천받을 수 있어요.',
      });
    }
    const saved = new Set(db.questions.map((q) => q.text));
    return analysis.suggestedQuestions.filter((q) => !saved.has(q));
  }

  async getTimeline(): Promise<TimelineEvent[]> {
    const db = await this.read();
    const completed = this.completedAnalyses(db).sort((a, b) =>
      a.doc.visitDate < b.doc.visitDate ? -1 : 1,
    );
    const events: TimelineEvent[] = [];
    /** 진단(코드 기준)별로 타임라인에 이미 표시한 상태 */
    const shownDiagnoses = new Map<string, DiagnosisStatus>();
    const typeOrder: Record<TimelineEvent['type'], number> = {
      visit: 0,
      diagnosis: 1,
      lab: 2,
      prescription: 3,
    };

    for (const { doc, analysis } of completed) {
      const base = {
        documentId: doc.id,
        hospitalName: doc.hospitalName,
        department: doc.department,
        date: doc.visitDate,
      };
      events.push({
        ...base,
        id: `${doc.id}:visit`,
        type: 'visit',
        title: `${doc.department ? `${doc.department} ` : ''}${DOCUMENT_TYPE_LABEL[doc.documentType]}`,
        description: analysis.overallSummary,
      });
      for (const dx of analysis.diagnoses) {
        if (dx.status === 'ruled_out') continue;
        const key = dx.code ?? dx.name;
        const shown = shownDiagnoses.get(key);
        // 같은 진단은 처음 기록된 날에 한 번, 의심 진단이 확진으로 바뀐 날에 한 번 더 표시한다
        const confirmedLater = shown === 'suspected' && dx.status === 'confirmed';
        if (shown !== undefined && !confirmedLater) continue;
        shownDiagnoses.set(key, dx.status);
        events.push({
          ...base,
          id: `${doc.id}:dx:${dx.id}`,
          type: 'diagnosis',
          title: `${confirmedLater ? DIAGNOSIS_CONFIRMED_LATER_PREFIX : DIAGNOSIS_TIMELINE_PREFIX[dx.status]}: ${dx.name}`,
          description: dx.plainExplanation,
        });
      }
      if (analysis.labResults.length > 0) {
        const abnormal = analysis.labResults.filter((l) => l.flag !== 'normal');
        const worst = analysis.labResults.reduce<LabFlag>(
          (acc, l) => (flagSeverity(l.flag) > flagSeverity(acc) ? l.flag : acc),
          'normal',
        );
        events.push({
          ...base,
          id: `${doc.id}:lab`,
          type: 'lab',
          title: `검사 ${analysis.labResults.length}항목${abnormal.length ? ` · 확인 필요 ${abnormal.length}` : ' · 모두 정상'}`,
          description: abnormal.length
            ? abnormal.map((l) => `${l.name} ${withUnit(formatNumber(l.value), l.unit)}`).join(', ')
            : '모든 검사 수치가 참고치 범위 안에 있어요.',
          flag: worst,
          labCode: abnormal.length === 1 ? abnormal[0].code : undefined,
        });
      }
      if (analysis.medications.length > 0) {
        events.push({
          ...base,
          id: `${doc.id}:rx`,
          type: 'prescription',
          title: `처방 약 ${analysis.medications.length}종`,
          description: analysis.medications.map((m) => `${m.ingredient}(${m.purpose})`).join(', '),
        });
      }
    }

    return events.sort(
      (a, b) =>
        (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) || typeOrder[a.type] - typeOrder[b.type],
    );
  }
}
