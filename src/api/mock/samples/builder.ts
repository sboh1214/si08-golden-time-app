/**
 * 샘플 해설 조립기.
 *
 * 샘플 문서는 "무엇이 적혀 있는지"만 간결한 명세(AnalysisSpec)로 적고,
 * id 부여·검사 판정·문장↔항목 양방향 연결은 이 모듈이 계산한다.
 *
 * - 검사 판정(flag)은 항상 `computeFlag(value, referenceRange)` 로 계산해 수치와 어긋나지 않는다.
 * - 문장이 가리키는 항목(`related`)만 적으면, 각 항목의 `sentenceIds` 는 그 역방향으로 채워진다.
 *   → `ExplainedSentence.relatedItemIds` 와 `item.sentenceIds` 가 항상 서로 일치한다.
 * - 존재하지 않는 항목을 참조하거나 같은 항목을 두 번 정의하면 즉시 오류를 던진다
 *   (샘플 데이터 작성 실수를 테스트에서 바로 잡기 위함).
 */
import { computeFlag } from '@/lib/labs';
import type {
  Diagnosis,
  DiagnosisStatus,
  DocumentAnalysis,
  DocumentSummaryCounts,
  ExplainedSentence,
  GlossaryTerm,
  LabFlag,
  LabResult,
  Medication,
} from '@/types/domain';

import {
  CONDITIONS,
  DRUGS,
  LAB_CATALOG,
  type ConditionKey,
  type DrugKey,
  type LabCode,
} from './catalog';

/* ------------------------------------------------------------------ */
/* 명세 타입                                                            */
/* ------------------------------------------------------------------ */

/** 문장이 가리키는 구조화 항목 — 'dx:<진단 키>' | 'lab:<검사 코드>' | 'med:<약 키>' */
export type ItemRef = `dx:${ConditionKey}` | `lab:${LabCode}` | `med:${DrugKey}`;

export interface DiagnosisSpec {
  condition: ConditionKey;
  /** 원문 표기 (의사가 적은 그대로) */
  originalTerm: string;
  status: DiagnosisStatus;
  plainExplanation: string;
}

export interface LabSpec {
  code: LabCode;
  value: number;
  /** 결과지 표기가 사전과 다를 때만 지정 */
  originalName?: string;
  /** 판정 문구 뒤에 붙는 문서별 설명 (예: 이전 결과와 비교) */
  note?: string;
}

export interface MedicationSpec {
  drug: DrugKey;
  originalText: string;
  dose: string;
  frequency: string;
  durationDays?: number;
}

export interface SentenceSpec {
  section: string;
  original: string;
  plain: string;
  terms?: GlossaryTerm[];
  confidence: number;
  related?: ItemRef[];
}

export interface AnalysisSpec {
  overallSummary: string;
  diagnoses: DiagnosisSpec[];
  labs: LabSpec[];
  medications: MedicationSpec[];
  /** 원문 순서대로 */
  sentences: SentenceSpec[];
  suggestedQuestions: string[];
}

/** 문서·생성 시각과 무관한 해설 본문 */
export type AnalysisContent = Pick<
  DocumentAnalysis,
  'overallSummary' | 'diagnoses' | 'labResults' | 'medications' | 'sentences' | 'suggestedQuestions'
>;

/* ------------------------------------------------------------------ */
/* id 규칙                                                             */
/* ------------------------------------------------------------------ */

export type ItemKind = 'dx' | 'lab' | 'med';

export interface IdScheme {
  item(kind: ItemKind, key: string): string;
  sentence(order: number): string;
}

function twoDigits(order: number): string {
  return String(order).padStart(2, '0');
}

/** 시드 문서용: `dx_2026_03_dm`, `lab_2026_03_hba1c`, `s_2026_03_04` */
export function seedIdScheme(tag: string): IdScheme {
  return {
    item: (kind, key) => `${kind}_${tag}_${key.toLowerCase()}`,
    sentence: (order) => `s_${tag}_${twoDigits(order)}`,
  };
}

/** 업로드 문서용: 문서 id 를 앞에 붙여 여러 번 업로드해도 겹치지 않는다 */
export function documentIdScheme(documentId: string): IdScheme {
  return {
    item: (kind, key) => `${documentId}_${kind}_${key.toLowerCase()}`,
    sentence: (order) => `${documentId}_s_${twoDigits(order)}`,
  };
}

/* ------------------------------------------------------------------ */
/* 조립                                                                */
/* ------------------------------------------------------------------ */

const FLAG_COMMENT: Record<LabFlag, string> = {
  critical_low: '이번 결과는 참고치보다 많이 낮아요.',
  low: '이번 결과는 참고치보다 낮아요.',
  normal: '이번 결과는 참고치 범위 안이에요.',
  high: '이번 결과는 참고치보다 높아요.',
  critical_high: '이번 결과는 참고치보다 많이 높아요.',
};

/**
 * 명세 → 해설 본문.
 * @param measuredAt 검사 결과의 측정일 (문서의 진료·검사일)
 */
export function assembleAnalysis(spec: AnalysisSpec, ids: IdScheme, measuredAt: string): AnalysisContent {
  const refToId = new Map<ItemRef, string>();
  const register = (ref: ItemRef, id: string): string => {
    if (refToId.has(ref)) throw new Error(`[mock seed] 같은 항목이 두 번 정의됨: ${ref}`);
    refToId.set(ref, id);
    return id;
  };

  const diagnosisIds = spec.diagnoses.map((d) => register(`dx:${d.condition}`, ids.item('dx', d.condition)));
  const labIds = spec.labs.map((l) => register(`lab:${l.code}`, ids.item('lab', l.code)));
  const medicationIds = spec.medications.map((m) => register(`med:${m.drug}`, ids.item('med', m.drug)));

  const sentences: ExplainedSentence[] = spec.sentences.map((s, index) => {
    const order = index + 1;
    return {
      id: ids.sentence(order),
      order,
      section: s.section,
      original: s.original,
      plain: s.plain,
      terms: (s.terms ?? []).map((t) => ({ ...t })),
      confidence: s.confidence,
      relatedItemIds: (s.related ?? []).map((ref) => {
        const id = refToId.get(ref);
        if (!id) throw new Error(`[mock seed] 문장 ${order} 이(가) 없는 항목을 참조함: ${ref}`);
        return id;
      }),
    };
  });

  /** 이 항목을 가리키는 문장 id (원문 순서) */
  const sentenceIdsFor = (itemId: string): string[] =>
    sentences.filter((s) => s.relatedItemIds.includes(itemId)).map((s) => s.id);

  const diagnoses: Diagnosis[] = spec.diagnoses.map((d, i) => {
    const condition = CONDITIONS[d.condition];
    return {
      id: diagnosisIds[i],
      name: condition.name,
      originalTerm: d.originalTerm,
      code: condition.code,
      status: d.status,
      plainExplanation: d.plainExplanation,
      sentenceIds: sentenceIdsFor(diagnosisIds[i]),
    };
  });

  const labResults: LabResult[] = spec.labs.map((l, i) => {
    const def = LAB_CATALOG[l.code];
    const flag = computeFlag(l.value, def.referenceRange);
    return {
      id: labIds[i],
      code: l.code,
      name: def.name,
      originalName: l.originalName ?? def.originalName,
      category: def.category,
      value: l.value,
      unit: def.unit,
      referenceRange: { ...def.referenceRange },
      flag,
      measuredAt,
      plainExplanation: [def.about, FLAG_COMMENT[flag], l.note].filter(Boolean).join(' '),
      sentenceIds: sentenceIdsFor(labIds[i]),
    };
  });

  const medications: Medication[] = spec.medications.map((m, i) => {
    const drug = DRUGS[m.drug];
    return {
      id: medicationIds[i],
      name: drug.name,
      ingredient: drug.ingredient,
      originalText: m.originalText,
      dose: m.dose,
      frequency: m.frequency,
      ...(m.durationDays !== undefined ? { durationDays: m.durationDays } : {}),
      purpose: drug.purpose,
      cautions: [...drug.cautions],
      sentenceIds: sentenceIdsFor(medicationIds[i]),
    };
  });

  return {
    overallSummary: spec.overallSummary,
    diagnoses,
    labResults,
    medications,
    sentences,
    suggestedQuestions: [...spec.suggestedQuestions],
  };
}

/** 문서 목록 카드에 표시되는 요약 개수 (해설 내용과 항상 일치) */
export function summarizeAnalysis(content: AnalysisContent): DocumentSummaryCounts {
  return {
    diagnosisCount: content.diagnoses.length,
    labCount: content.labResults.length,
    abnormalLabCount: content.labResults.filter((l) => l.flag !== 'normal').length,
    medicationCount: content.medications.length,
  };
}
