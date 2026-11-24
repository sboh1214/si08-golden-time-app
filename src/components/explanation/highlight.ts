/**
 * 원문 문장 속 의학 용어 강조용 분할 로직 (순수 함수 — UI 의존 없음).
 *
 * 규칙
 * - 대소문자를 구분하지 않는다. (용어 "HbA1c" ↔ 원문 "HBA1C")
 * - 용어 안의 정규식 특수문자( ( ) + . * ? [ ] | 등 )는 모두 일반 글자로 취급한다.
 * - 용어 안의 공백은 원문의 공백 1개 이상과 대응한다. ("Type 2 DM" ↔ "Type 2  DM")
 * - 영문으로 시작·끝나는 용어는 다른 영문 단어의 일부일 때 강조하지 않는다.
 *   ("DM" 은 "ADM" 안에서 강조하지 않음, "BP130/80" 의 "BP" 는 강조)
 *   한글은 조사가 바로 붙으므로("당뇨병이") 경계를 따지지 않는다.
 * - 강조 구간은 서로 겹치지 않는다. 먼저 시작하는 용어를 고르고,
 *   같은 위치에서 시작하면 더 긴 용어를 고른다. ("Type 2 DM" > "DM")
 */

export interface HighlightSegment {
  /** 화면에 그대로 표시할 원문 조각 (대소문자 등 원문 표기 유지) */
  text: string;
  /** 강조 구간이면 입력 `terms` 배열의 인덱스, 일반 텍스트면 null */
  termIndex: number | null;
  /** 원문 안에서의 시작 위치 (React key 용) */
  start: number;
}

interface TermMatch {
  start: number;
  end: number;
  termIndex: number;
}

/** RegExp 생성자에서 의미를 갖는 문자 */
const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\/]/g;
const ASCII_LETTER = /^[A-Za-z]$/;
const WHITESPACE = /\s+/;

/** 문자열을 정규식에서 글자 그대로 일치하도록 이스케이프한다. */
export function escapeRegExp(value: string): string {
  return value.replace(REGEX_SPECIAL_CHARS, '\\$&');
}

/** 용어 비교용 키: 앞뒤 공백 제거 + 연속 공백 1개로 + 소문자 */
export function normalizeTermKey(term: string): string {
  return term.trim().replace(/\s+/g, ' ').toLowerCase();
}

function buildTermPattern(term: string): RegExp | null {
  const parts = term.trim().split(WHITESPACE).filter((part) => part.length > 0);
  if (parts.length === 0) return null;
  return new RegExp(parts.map(escapeRegExp).join('\\s+'), 'gi');
}

function isAsciiLetter(char: string | undefined): boolean {
  return char !== undefined && ASCII_LETTER.test(char);
}

/** 영문 용어가 앞뒤 영문 단어에 붙어 있지 않은지 */
function isStandalone(text: string, start: number, end: number): boolean {
  if (isAsciiLetter(text[start]) && isAsciiLetter(text[start - 1])) return false;
  if (isAsciiLetter(text[end - 1]) && isAsciiLetter(text[end])) return false;
  return true;
}

/** 모든 용어의 출현 위치를 찾는다 (서로 다른 용어끼리는 겹칠 수 있음). */
function findAllMatches(text: string, terms: readonly string[]): TermMatch[] {
  const seenKeys = new Set<string>();
  const matches: TermMatch[] = [];

  terms.forEach((term, termIndex) => {
    // 같은 용어가 중복 입력되면 처음 것만 사용한다
    const key = normalizeTermKey(term);
    if (key.length === 0 || seenKeys.has(key)) return;
    seenKeys.add(key);

    const pattern = buildTermPattern(term);
    if (!pattern) return;

    let found = pattern.exec(text);
    while (found !== null) {
      const start = found.index;
      const end = start + found[0].length;
      if (isStandalone(text, start, end)) {
        matches.push({ start, end, termIndex });
      } else {
        // 경계 조건으로 버린 경우, 바로 다음 글자부터 다시 찾는다
        pattern.lastIndex = start + 1;
      }
      found = pattern.exec(text);
    }
  });

  return matches;
}

/** 겹치지 않는 강조 구간 선택: 먼저 시작하는 것 → 같은 위치면 긴 것 */
function selectNonOverlapping(matches: TermMatch[]): TermMatch[] {
  const sorted = [...matches].sort(
    (a, b) => a.start - b.start || b.end - b.start - (a.end - a.start) || a.termIndex - b.termIndex,
  );
  const selected: TermMatch[] = [];
  let cursor = 0;
  for (const match of sorted) {
    if (match.start >= cursor) {
      selected.push(match);
      cursor = match.end;
    }
  }
  return selected;
}

/**
 * 원문을 일반 텍스트 / 용어 구간으로 나눈다.
 * 반환된 조각의 `text` 를 순서대로 이어 붙이면 항상 원문과 같다.
 */
export function splitByTerms(text: string, terms: readonly string[]): HighlightSegment[] {
  if (text.length === 0) return [];

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const match of selectNonOverlapping(findAllMatches(text, terms))) {
    if (match.start > cursor) {
      segments.push({ text: text.slice(cursor, match.start), termIndex: null, start: cursor });
    }
    segments.push({ text: text.slice(match.start, match.end), termIndex: match.termIndex, start: match.start });
    cursor = match.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), termIndex: null, start: cursor });
  }
  return segments;
}
