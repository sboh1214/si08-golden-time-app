/**
 * 내장 데모 서버 샘플 데이터(seed.ts) 무결성 테스트.
 *
 * 화면은 샘플 데이터를 그대로 믿고 그리므로, 다음 규칙이 항상 성립해야 한다.
 * - 문서 요약 개수 = 해설 내용 개수, 검사 판정 = computeFlag(수치, 참고치)
 * - 문장 ↔ 구조화 항목(진단·검사·약) 참조가 양방향으로 일치하고 모두 실제로 존재
 * - id 는 문서 안팎에서 겹치지 않고, 업로드 해설은 문서 id 로 시작
 * - 의학 용어 풀이(terms)는 원문 문장 안에서 찾을 수 있어야 강조 표시가 된다
 */
import { computeFlag } from '@/lib/labs';
import { DOCUMENT_TYPE_OPTIONS } from '@/lib/labels';
import type { DocumentAnalysis, DocumentType, MedicalDocument } from '@/types/domain';

import { uploadTemplateCount } from '../samples/upload-templates';
import {
  buildAnalysisForUpload,
  createSeedData,
  DISCLAIMER,
  MOCK_MODEL_VERSION,
  SEED_VERSION,
  type SeedData,
} from '../seed';

/** 2026-11-24 10:00 (KST) */
const NOW = new Date(Date.UTC(2026, 10, 24, 1, 0, 0));
const GENERATED_AT = '2026-11-24T01:00:09.000Z';

/* ------------------------------------------------------------------ */
/* 도우미                                                              */
/* ------------------------------------------------------------------ */

function itemIds(analysis: DocumentAnalysis): string[] {
  return [...analysis.diagnoses, ...analysis.labResults, ...analysis.medications].map((i) => i.id);
}

function allIds(analysis: DocumentAnalysis): string[] {
  return [...itemIds(analysis), ...analysis.sentences.map((s) => s.id)];
}

/** 대소문자·연속 공백을 무시하고 비교하기 위한 정규화 */
function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** 화면이 믿고 쓰는 해설 구조 규칙을 한 번에 검사 */
function expectWellFormed(analysis: DocumentAnalysis): void {
  // id 는 항목·문장 전체에서 유일
  const ids = allIds(analysis);
  expect(new Set(ids).size).toBe(ids.length);

  // 문장 순서는 1부터 빠짐없이
  expect(analysis.sentences.map((s) => s.order)).toEqual(analysis.sentences.map((_, i) => i + 1));

  const items = new Map(
    [...analysis.diagnoses, ...analysis.labResults, ...analysis.medications].map((i) => [i.id, i]),
  );
  const sentences = new Map(analysis.sentences.map((s) => [s.id, s]));

  // 문장 → 항목: 모두 존재하고, 항목 쪽에서도 그 문장을 가리킨다
  for (const sentence of analysis.sentences) {
    expect(new Set(sentence.relatedItemIds).size).toBe(sentence.relatedItemIds.length);
    for (const itemId of sentence.relatedItemIds) {
      const item = items.get(itemId);
      expect(item).toBeDefined();
      expect(item?.sentenceIds).toContain(sentence.id);
    }
  }

  // 항목 → 문장: 근거 문장이 최소 1개 있고, 모두 존재하며 역방향도 일치
  for (const item of items.values()) {
    expect(item.sentenceIds.length).toBeGreaterThan(0);
    for (const sentenceId of item.sentenceIds) {
      expect(sentences.get(sentenceId)?.relatedItemIds).toContain(item.id);
    }
  }

  // 검사 판정은 수치·참고치와 항상 일치
  for (const lab of analysis.labResults) {
    expect(lab.flag).toBe(computeFlag(lab.value, lab.referenceRange));
    expect(lab.plainExplanation.length).toBeGreaterThan(0);
    expect(lab.referenceRange.low !== undefined || lab.referenceRange.high !== undefined).toBe(true);
  }

  // 약 목적은 타임라인에 `성분(목적)` 으로 이어 붙으므로 짧게
  for (const med of analysis.medications) {
    expect(med.purpose.length).toBeGreaterThan(0);
    expect(med.purpose.length).toBeLessThanOrEqual(15);
    expect(med.cautions.length).toBeGreaterThanOrEqual(1);
    expect(med.cautions.length).toBeLessThanOrEqual(3);
  }

  // 해설 문장: 신뢰도 범위, 용어 풀이는 원문 안에서 찾을 수 있어야 함
  for (const sentence of analysis.sentences) {
    expect(sentence.confidence).toBeGreaterThanOrEqual(0.55);
    expect(sentence.confidence).toBeLessThanOrEqual(0.98);
    expect(sentence.section.trim().length).toBeGreaterThan(0);
    expect(sentence.plain.trim().length).toBeGreaterThan(0);
    for (const { term, meaning } of sentence.terms) {
      expect(normalize(sentence.original)).toContain(normalize(term));
      expect(meaning.trim().length).toBeGreaterThan(0);
    }
  }

  expect(analysis.overallSummary.trim().length).toBeGreaterThan(0);
  expect(analysis.overallSummary).not.toMatch(/undefined|null/);
  expect(analysis.suggestedQuestions.length).toBeGreaterThanOrEqual(4);
  expect(analysis.suggestedQuestions.length).toBeLessThanOrEqual(6);
  expect(new Set(analysis.suggestedQuestions).size).toBe(analysis.suggestedQuestions.length);
  expect(analysis.modelVersion).toBe(MOCK_MODEL_VERSION);
  expect(analysis.disclaimer).toBe(DISCLAIMER);
}

function completedDocuments(seed: SeedData): MedicalDocument[] {
  return seed.documents.filter((d) => d.status === 'completed');
}

/** 완료 문서의 해설을 진료일 오름차순으로 */
function chronologicalAnalyses(seed: SeedData): { doc: MedicalDocument; analysis: DocumentAnalysis }[] {
  return completedDocuments(seed)
    .slice()
    .sort((a, b) => (a.visitDate < b.visitDate ? -1 : 1))
    .map((doc) => ({ doc, analysis: seed.analyses[doc.id] }));
}

function uploadedDocument(overrides: Partial<MedicalDocument> = {}): MedicalDocument {
  return {
    id: 'doc_upload_1',
    title: '튼튼내과의원 · 진료기록',
    documentType: 'medical_record',
    hospitalName: '튼튼내과의원',
    department: '내과',
    visitDate: '2026-11-20',
    source: 'camera',
    pageCount: 1,
    status: 'explaining',
    progress: 90,
    createdAt: '2026-11-24T00:59:55.000Z',
    updatedAt: '2026-11-24T01:00:05.000Z',
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/* 시드 데이터                                                          */
/* ------------------------------------------------------------------ */

describe('createSeedData', () => {
  const seed = createSeedData(NOW);

  it('시드 버전은 1이다', () => {
    expect(SEED_VERSION).toBe(1);
  });

  it('완료 문서 4건(2025-11 ~ 2026-10)과 분석 실패 문서 1건으로 구성된다', () => {
    expect(seed.documents).toHaveLength(5);
    expect(new Set(seed.documents.map((d) => d.id)).size).toBe(seed.documents.length);

    const completed = completedDocuments(seed);
    expect(completed).toHaveLength(4);
    const visitDates = completed.map((d) => d.visitDate).sort();
    expect(visitDates[0].startsWith('2025-11')).toBe(true);
    expect(visitDates.at(-1)?.startsWith('2026-10')).toBe(true);

    const types = completed.map((d) => d.documentType);
    expect(types.filter((t) => t === 'medical_record')).toHaveLength(2);
    expect(types.filter((t) => t === 'lab_result')).toHaveLength(1);
    expect(types.filter((t) => t === 'opinion' || t === 'prescription')).toHaveLength(1);
  });

  it('완료 문서는 해설을 갖고, 요약 개수가 해설 내용과 일치한다', () => {
    for (const doc of completedDocuments(seed)) {
      const analysis = seed.analyses[doc.id];
      expect(analysis).toBeDefined();
      expect(analysis.documentId).toBe(doc.id);
      expect(doc.progress).toBe(100);
      expect(doc.failureReason).toBeUndefined();
      expect(doc.summary).toEqual({
        diagnosisCount: analysis.diagnoses.length,
        labCount: analysis.labResults.length,
        abnormalLabCount: analysis.labResults.filter((l) => l.flag !== 'normal').length,
        medicationCount: analysis.medications.length,
      });
      // 처리 완료 시각 = 해설 생성 시각, 업로드는 진료일 이후
      expect(analysis.generatedAt).toBe(doc.updatedAt);
      expect(doc.createdAt <= doc.updatedAt).toBe(true);
      expect(doc.createdAt.slice(0, 10) >= doc.visitDate).toBe(true);
    }
    // 해설은 완료 문서에만 있다
    expect(Object.keys(seed.analyses).sort()).toEqual(completedDocuments(seed).map((d) => d.id).sort());
  });

  it('모든 해설이 구조 규칙(참조 일치·판정·id 유일·용어 위치)을 지킨다', () => {
    for (const doc of completedDocuments(seed)) {
      const analysis = seed.analyses[doc.id];
      expectWellFormed(analysis);
      expect(analysis.sentences.length).toBeGreaterThanOrEqual(8);
      expect(analysis.sentences.length).toBeLessThanOrEqual(14);
      expect(analysis.suggestedQuestions.length).toBeGreaterThanOrEqual(4);
      for (const lab of analysis.labResults) expect(lab.measuredAt).toBe(doc.visitDate);
    }
  });

  it('항목·문장 id 는 문서끼리도 겹치지 않는다', () => {
    const ids = Object.values(seed.analyses).flatMap(allIds);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('해설 화면 상태를 골고루 보여 주도록 다양한 값을 포함한다', () => {
    const analyses = Object.values(seed.analyses);
    const statuses = new Set(analyses.flatMap((a) => a.diagnoses.map((d) => d.status)));
    expect([...statuses].sort()).toEqual(['confirmed', 'history', 'ruled_out', 'suspected']);

    const sentences = analyses.flatMap((a) => a.sentences);
    expect(sentences.filter((s) => s.confidence < 0.7).length).toBeGreaterThanOrEqual(3);

    const flags = new Set(analyses.flatMap((a) => a.labResults.map((l) => l.flag)));
    expect(flags).toEqual(new Set(['normal', 'high', 'low', 'critical_high']));
  });

  it('같은 검사 코드는 문서가 달라도 이름·단위·분류·참고치가 같다 (추이 그래프용)', () => {
    const labs = Object.values(seed.analyses).flatMap((a) => a.labResults);
    const byCode = new Map<string, (typeof labs)[number]>();
    for (const lab of labs) {
      const first = byCode.get(lab.code);
      if (!first) {
        byCode.set(lab.code, lab);
        continue;
      }
      expect({ name: lab.name, unit: lab.unit, category: lab.category, range: lab.referenceRange }).toEqual({
        name: first.name,
        unit: first.unit,
        category: first.category,
        range: first.referenceRange,
      });
    }
    // 추이를 볼 수 있도록 핵심 검사는 여러 번 측정되어 있다
    for (const code of ['HBA1C', 'GLU', 'LDL', 'CREAT', 'EGFR']) {
      expect(labs.filter((l) => l.code === code).length).toBeGreaterThanOrEqual(3);
    }
    for (const code of ['WBC', 'HB', 'PLT']) expect(byCode.has(code)).toBe(true);
  });

  it('당화혈색소는 치료 경과에 따라 꾸준히 내려간다', () => {
    const values = chronologicalAnalyses(seed).flatMap(({ analysis }) =>
      analysis.labResults.filter((l) => l.code === 'HBA1C').map((l) => l.value),
    );
    expect(values).toEqual([8.1, 7.4, 6.9, 6.6]);
  });

  it('같은 진단 코드는 같은 이름을 쓴다 (타임라인 진단 묶음용)', () => {
    const nameByCode = new Map<string, string>();
    for (const dx of Object.values(seed.analyses).flatMap((a) => a.diagnoses)) {
      expect(dx.code).toMatch(/^[A-Z]\d{2}\.\d$/);
      const code = dx.code as string;
      const known = nameByCode.get(code);
      if (known) expect(dx.name).toBe(known);
      else nameByCode.set(code, dx.name);
    }
    expect([...nameByCode.keys()]).toEqual(expect.arrayContaining(['E11.9', 'E78.5', 'K76.0', 'R03.0']));
  });

  it('분석 실패 문서는 글자 인식 단계(40%)에서 멈추고 사유를 갖는다', () => {
    const failed = seed.documents.filter((d) => d.status === 'failed');
    expect(failed).toHaveLength(1);
    const [doc] = failed;
    expect(doc.progress).toBe(40);
    expect(doc.documentType).toBe('prescription');
    expect(doc.failureReason?.trim().length).toBeGreaterThan(0);
    expect(doc.summary).toBeUndefined();
    expect(seed.analyses[doc.id]).toBeUndefined();
    // '최근 업로드' 로 보이도록 기준 시각 직전에 만들어진다
    expect(new Date(doc.createdAt).getTime()).toBeLessThan(NOW.getTime());
    expect(doc.createdAt <= doc.updatedAt).toBe(true);
    expect(doc.visitDate <= doc.createdAt.slice(0, 10)).toBe(true);
  });

  it('질문 리스트는 출처·물어봄 여부가 섞여 있고 연결 문서가 실제로 있다', () => {
    const { questions } = seed;
    expect(questions.length).toBeGreaterThanOrEqual(5);
    expect(questions.length).toBeLessThanOrEqual(7);
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    expect(new Set(questions.map((q) => q.source))).toEqual(new Set(['ai', 'user']));
    expect(questions.some((q) => q.isAsked)).toBe(true);
    expect(questions.some((q) => !q.isAsked)).toBe(true);

    const docIds = new Set(seed.documents.map((d) => d.id));
    for (const q of questions) {
      if (q.documentId) expect(docIds.has(q.documentId)).toBe(true);
      // 답변 메모는 물어본 질문에만
      if (q.isAsked) expect(q.answerNote?.trim().length).toBeGreaterThan(0);
      else expect(q.answerNote).toBeUndefined();
      expect(q.createdAt <= q.updatedAt).toBe(true);
      expect(q.text.length).toBeLessThanOrEqual(300);
    }
  });

  it('같은 시각이면 같은 데이터를 만들고, 매번 새 객체를 돌려준다', () => {
    const a = createSeedData(NOW);
    const b = createSeedData(NOW);
    expect(a).toEqual(b);

    a.documents[0].title = '바뀐 제목';
    a.analyses[a.documents[0].id].labResults[0].referenceRange.text = '바뀜';
    a.questions[0].text = '바뀐 질문';
    const c = createSeedData(NOW);
    expect(c.documents[0].title).not.toBe('바뀐 제목');
    expect(c.analyses[c.documents[0].id].labResults[0].referenceRange.text).not.toBe('바뀜');
    expect(c.questions[0].text).not.toBe('바뀐 질문');
  });
});

/* ------------------------------------------------------------------ */
/* 업로드 문서 해설                                                     */
/* ------------------------------------------------------------------ */

describe('buildAnalysisForUpload', () => {
  const TEMPLATE_INDEXES = [0, 1, 2, 3, 7];

  it.each(DOCUMENT_TYPE_OPTIONS)('%s: 모든 변형이 구조 규칙을 지키고 id 가 문서 id 로 시작한다', (type) => {
    for (const templateIndex of TEMPLATE_INDEXES) {
      const document = uploadedDocument({ id: `doc_${type}_${templateIndex}`, documentType: type });
      const analysis = buildAnalysisForUpload({ document, templateIndex, generatedAt: GENERATED_AT });

      expectWellFormed(analysis);
      expect(analysis.documentId).toBe(document.id);
      expect(analysis.generatedAt).toBe(GENERATED_AT);
      for (const id of allIds(analysis)) expect(id.startsWith(`${document.id}_`)).toBe(true);
      for (const lab of analysis.labResults) expect(lab.measuredAt).toBe(document.visitDate);
      // 등록 정보(병원 이름)가 해설에 반영된다
      expect(analysis.overallSummary).toContain(document.hospitalName);
      expect(analysis.sentences.some((s) => s.original.includes(document.hospitalName))).toBe(true);
    }
  });

  it('문서 종류에 맞는 템플릿을 고른다', () => {
    const build = (documentType: DocumentType, templateIndex: number) =>
      buildAnalysisForUpload({
        document: uploadedDocument({ documentType }),
        templateIndex,
        generatedAt: GENERATED_AT,
      });

    for (let i = 0; i < uploadTemplateCount('lab_result'); i += 1) {
      const lab = build('lab_result', i);
      expect(lab.labResults.length).toBeGreaterThanOrEqual(8);
      expect(lab.medications).toHaveLength(0);
    }
    for (let i = 0; i < uploadTemplateCount('prescription'); i += 1) {
      const rx = build('prescription', i);
      expect(rx.medications.length).toBeGreaterThanOrEqual(3);
      expect(rx.labResults).toHaveLength(0);
    }
    for (let i = 0; i < uploadTemplateCount('medical_record'); i += 1) {
      const record = build('medical_record', i);
      expect(record.diagnoses.length).toBeGreaterThanOrEqual(2);
      expect(record.labResults.length).toBeGreaterThan(0);
      expect(record.medications.length).toBeGreaterThan(0);
    }
    // 소견서·퇴원요약지·기타 문서는 진료기록 템플릿을 쓴다
    expect(build('opinion', 0).overallSummary).toBe(build('medical_record', 0).overallSummary);
  });

  it('종류마다 2가지 이상 변형이 있고 업로드 순번으로 순환한다', () => {
    for (const type of DOCUMENT_TYPE_OPTIONS) {
      const count = uploadTemplateCount(type);
      expect(count).toBeGreaterThanOrEqual(2);
      const document = uploadedDocument({ documentType: type });
      const summaries = Array.from({ length: count * 2 }, (_, templateIndex) =>
        buildAnalysisForUpload({ document, templateIndex, generatedAt: GENERATED_AT }).overallSummary,
      );
      expect(new Set(summaries.slice(0, count)).size).toBe(count);
      expect(summaries.slice(count)).toEqual(summaries.slice(0, count));
    }
  });

  it('비정상 순번(음수·소수·NaN)에도 템플릿을 고른다', () => {
    const document = uploadedDocument();
    for (const templateIndex of [-1, 1.7, Number.NaN]) {
      expect(() => buildAnalysisForUpload({ document, templateIndex, generatedAt: GENERATED_AT })).not.toThrow();
    }
  });

  it('같은 템플릿을 여러 문서에 써도 id 가 겹치지 않는다', () => {
    const first = buildAnalysisForUpload({
      document: uploadedDocument({ id: 'doc_a' }),
      templateIndex: 0,
      generatedAt: GENERATED_AT,
    });
    const second = buildAnalysisForUpload({
      document: uploadedDocument({ id: 'doc_b' }),
      templateIndex: 0,
      generatedAt: GENERATED_AT,
    });
    const seedIds = Object.values(createSeedData(NOW).analyses).flatMap(allIds);
    const ids = [...allIds(first), ...allIds(second), ...seedIds];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('검사 수치는 시드 환자의 흐름을 이어 간다 (당화혈색소 6.4~6.8%)', () => {
    for (const type of ['medical_record', 'lab_result'] as const) {
      for (let i = 0; i < uploadTemplateCount(type); i += 1) {
        const analysis = buildAnalysisForUpload({
          document: uploadedDocument({ documentType: type }),
          templateIndex: i,
          generatedAt: GENERATED_AT,
        });
        const hba1c = analysis.labResults.find((l) => l.code === 'HBA1C');
        expect(hba1c?.value).toBeGreaterThanOrEqual(6.4);
        expect(hba1c?.value).toBeLessThanOrEqual(6.8);
      }
    }
  });

  it('진료과가 없으면 병원 이름만 쓰고, 진료일을 문서 정보 문장에 표시한다', () => {
    const document = uploadedDocument({ department: undefined, visitDate: '2026-11-03' });
    const analysis = buildAnalysisForUpload({ document, templateIndex: 0, generatedAt: GENERATED_AT });
    expect(analysis.overallSummary.startsWith(`${document.hospitalName}에서`)).toBe(true);
    expect(analysis.sentences[0].original).toContain('2026.11.03');
    expect(analysis.sentences[0].original).toContain('외래');
  });
});
