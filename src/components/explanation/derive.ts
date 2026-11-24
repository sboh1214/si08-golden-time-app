/**
 * 원문 대조 해설 화면용 파생 데이터 계산 (순수 함수 — UI 의존 없음).
 *
 * API 응답(DocumentAnalysis)을 화면에 필요한 형태로 가공한다.
 * - 구역(주호소·현병력 …)별 묶음과 필터
 * - 목록(FlatList) 행 구성
 * - 문서 전체 용어 사전
 * - 관련 구조화 항목(진단·검사·약) 조회
 */
import type { DocumentAnalysis, ExplainedSentence, GlossaryTerm, LabFlag } from '@/types/domain';

import { normalizeTermKey } from './highlight';

/* ------------------------------------------------------------------ */
/* 신뢰도                                                              */
/* ------------------------------------------------------------------ */

/** 이 값 미만이면 "의료진 확인 권장" 표시 */
export const LOW_CONFIDENCE_THRESHOLD = 0.7;

/** 신뢰도가 낮은지. 값이 없거나 잘못된 경우에도 안전하게 '확인 권장'으로 본다. */
export function isLowConfidence(confidence: number): boolean {
  return !(confidence >= LOW_CONFIDENCE_THRESHOLD);
}

/* ------------------------------------------------------------------ */
/* 구역                                                                */
/* ------------------------------------------------------------------ */

/** 구역 이름이 비어 있는 문장을 모으는 구역 */
export const FALLBACK_SECTION = '기타';

export interface SentenceSection {
  title: string;
  /** order 오름차순 */
  sentences: ExplainedSentence[];
}

/** 문장 순서(order)대로 정렬한 뒤, 구역이 처음 나온 순서대로 묶는다. */
export function groupSentencesBySection(sentences: readonly ExplainedSentence[]): SentenceSection[] {
  const sorted = [...sentences].sort((a, b) => a.order - b.order);
  const groups = new Map<string, ExplainedSentence[]>();
  for (const sentence of sorted) {
    const title = sentence.section.trim() || FALLBACK_SECTION;
    const bucket = groups.get(title);
    if (bucket) bucket.push(sentence);
    else groups.set(title, [sentence]);
  }
  return Array.from(groups, ([title, items]) => ({ title, sentences: items }));
}

/** 진료기록 구역 이름 → 환자용 한 줄 설명 (키는 공백 제거) */
const SECTION_HINTS: Record<string, string> = {
  주호소: '병원에 온 이유',
  현병력: '지금 증상이 어떻게 시작되고 진행됐는지',
  과거력: '예전에 앓았던 병이나 수술',
  가족력: '가족이 앓았던 병',
  사회력: '흡연·음주 같은 생활 습관',
  신체검진: '의사가 직접 진찰한 내용',
  검사결과: '검사에서 나온 결과',
  진단: '의사가 판단한 병명',
  평가: '의사의 종합 판단',
  처방: '처방받은 약과 먹는 방법',
  경과: '치료하면서 달라진 점',
  향후계획: '앞으로의 치료·검사 계획',
};

/** 구역 이름의 쉬운 설명 (모르는 구역이면 undefined) */
export function getSectionHint(title: string): string | undefined {
  return SECTION_HINTS[title.replace(/\s+/g, '')];
}

/* ------------------------------------------------------------------ */
/* 목록 행                                                             */
/* ------------------------------------------------------------------ */

/** 상단 고정(sticky) 도구 막대 행의 key */
export const TOOLBAR_ROW_KEY = 'toolbar';

export type ExplanationRow =
  | { type: 'toolbar'; key: typeof TOOLBAR_ROW_KEY }
  | { type: 'section'; key: string; title: string; count: number }
  | { type: 'sentence'; key: string; sentence: ExplainedSentence; section: string };

/**
 * FlatList 행 구성: [도구 막대, 구역 제목, 문장, 문장, 구역 제목, …]
 * `activeSection` 이 있으면 해당 구역만 남긴다. 문장이 하나도 없으면 빈 배열.
 */
export function buildRows(sections: readonly SentenceSection[], activeSection: string | null): ExplanationRow[] {
  if (sections.length === 0) return [];
  const visible = activeSection ? sections.filter((s) => s.title === activeSection) : sections;
  const rows: ExplanationRow[] = [{ type: 'toolbar', key: TOOLBAR_ROW_KEY }];
  for (const section of visible) {
    rows.push({
      type: 'section',
      key: `section:${section.title}`,
      title: section.title,
      count: section.sentences.length,
    });
    for (const sentence of section.sentences) {
      rows.push({ type: 'sentence', key: `sentence:${sentence.id}`, sentence, section: section.title });
    }
  }
  return rows;
}

/** 문장 행의 인덱스 (없으면 -1) */
export function findSentenceRowIndex(rows: readonly ExplanationRow[], sentenceId: string): number {
  return rows.findIndex((row) => row.type === 'sentence' && row.sentence.id === sentenceId);
}

/* ------------------------------------------------------------------ */
/* 용어 사전                                                            */
/* ------------------------------------------------------------------ */

export interface GlossaryEntry {
  /** 비교용 정규화 키 */
  key: string;
  /** 처음 등장한 표기 */
  term: string;
  meaning: string;
  /** 용어가 나온 문장 id (문장 순서대로) */
  sentenceIds: string[];
}

/** 한 문장 안에서 대소문자·공백만 다른 중복 용어를 제거한다 (처음 것 유지). */
export function dedupeTerms(terms: readonly GlossaryTerm[]): GlossaryTerm[] {
  const seen = new Set<string>();
  return terms.filter((t) => {
    const key = normalizeTermKey(t.term);
    if (key.length === 0 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 문서 전체의 용어를 중복 없이 모아 가나다순으로 정렬한다.
 * 대소문자·공백만 다른 용어는 하나로 합치고, 뜻은 처음 나온(비어 있지 않은) 것을 쓴다.
 */
export function collectGlossary(sentences: readonly ExplainedSentence[]): GlossaryEntry[] {
  const sorted = [...sentences].sort((a, b) => a.order - b.order);
  const entries = new Map<string, GlossaryEntry>();
  for (const sentence of sorted) {
    for (const { term, meaning } of sentence.terms) {
      const key = normalizeTermKey(term);
      if (key.length === 0) continue;
      const existing = entries.get(key);
      if (!existing) {
        entries.set(key, { key, term: term.trim(), meaning: meaning.trim(), sentenceIds: [sentence.id] });
        continue;
      }
      if (!existing.meaning && meaning.trim()) existing.meaning = meaning.trim();
      if (!existing.sentenceIds.includes(sentence.id)) existing.sentenceIds.push(sentence.id);
    }
  }
  return Array.from(entries.values()).sort((a, b) => a.term.localeCompare(b.term, 'ko'));
}

/* ------------------------------------------------------------------ */
/* 관련 구조화 항목                                                      */
/* ------------------------------------------------------------------ */

export type RelatedItem =
  | { kind: 'diagnosis'; id: string; label: string }
  | { kind: 'medication'; id: string; label: string }
  | { kind: 'lab'; id: string; label: string; code: string; flag: LabFlag };

export type RelatedItemKind = RelatedItem['kind'];

/** 구조화 항목 id → 표시 정보 */
export function buildRelatedItemIndex(
  analysis: Pick<DocumentAnalysis, 'diagnoses' | 'labResults' | 'medications'>,
): Map<string, RelatedItem> {
  const index = new Map<string, RelatedItem>();
  for (const d of analysis.diagnoses) index.set(d.id, { kind: 'diagnosis', id: d.id, label: d.name });
  for (const l of analysis.labResults) {
    index.set(l.id, { kind: 'lab', id: l.id, label: l.name, code: l.code, flag: l.flag });
  }
  for (const m of analysis.medications) index.set(m.id, { kind: 'medication', id: m.id, label: m.name });
  return index;
}

/** 문장의 relatedItemIds 를 표시 정보로 바꾼다 (모르는 id·중복은 제외). */
export function resolveRelatedItems(
  ids: readonly string[],
  index: ReadonlyMap<string, RelatedItem>,
): RelatedItem[] {
  const seen = new Set<string>();
  const items: RelatedItem[] = [];
  for (const id of ids) {
    const item = index.get(id);
    if (!item || seen.has(id)) continue;
    seen.add(id);
    items.push(item);
  }
  return items;
}
