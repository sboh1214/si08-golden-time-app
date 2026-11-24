/**
 * 도메인 enum → 한국어 라벨 매핑 단위 테스트.
 */
import type { ProcessingStatus } from '@/types/domain';

import {
  AI_DISCLAIMER_TEXT,
  DEFAULT_FAILURE_REASON,
  DIAGNOSIS_STATUS_LABEL,
  DOCUMENT_SOURCE_LABEL,
  DOCUMENT_TYPE_LABEL,
  DOCUMENT_TYPE_OPTIONS,
  failureReasonText,
  formatProgress,
  isProcessing,
  LAB_FLAG_LABEL,
  PROCESSING_STATUS_LABEL,
  PROCESSING_STEPS,
  TIMELINE_EVENT_LABEL,
} from '../labels';

describe('isProcessing', () => {
  it.each([
    ['uploaded', true],
    ['ocr', true],
    ['structuring', true],
    ['explaining', true],
    ['completed', false],
    ['failed', false],
  ] as const)('%s → %s', (status, expected) => {
    expect(isProcessing(status)).toBe(expected);
  });
});

describe('PROCESSING_STEPS', () => {
  it('처리 단계 안내는 파이프라인 순서이고 모두 처리 중 상태다', () => {
    const order: ProcessingStatus[] = ['uploaded', 'ocr', 'structuring', 'explaining'];
    expect(PROCESSING_STEPS.map((s) => s.status)).toEqual(order);
    for (const step of PROCESSING_STEPS) {
      expect(isProcessing(step.status)).toBe(true);
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
    }
  });
});

describe('formatProgress', () => {
  it.each([
    [37.6, 38],
    [0, 0],
    [100, 100],
    [-5, 0],
    [130, 100],
    [Number.NaN, 0],
  ])('%p → %p', (value, expected) => {
    expect(formatProgress(value)).toBe(expected);
  });
});

describe('failureReasonText', () => {
  it('서버 사유가 있으면 그대로, 없거나 빈 문자열이면 기본 안내', () => {
    expect(failureReasonText({ failureReason: '사진이 흔들렸어요.' })).toBe('사진이 흔들렸어요.');
    expect(failureReasonText({})).toBe(DEFAULT_FAILURE_REASON);
    expect(failureReasonText({ failureReason: '  ' })).toBe(DEFAULT_FAILURE_REASON);
  });
});

describe('안내 문구', () => {
  it('AI 해설 고지와 처리 단계 안내는 해요체로 쓰고 저장 위치(서버 전송)를 단정하지 않는다', () => {
    expect(AI_DISCLAIMER_TEXT).not.toMatch(/습니다|합니다/);
    for (const step of PROCESSING_STEPS) expect(step.description).not.toMatch(/서버/);
  });
});

describe('DOCUMENT_TYPE_OPTIONS', () => {
  it('모든 문서 종류를 한 번씩 포함한다', () => {
    expect([...DOCUMENT_TYPE_OPTIONS].sort()).toEqual(Object.keys(DOCUMENT_TYPE_LABEL).sort());
    expect(new Set(DOCUMENT_TYPE_OPTIONS).size).toBe(DOCUMENT_TYPE_OPTIONS.length);
  });
});

describe('라벨 사전', () => {
  it.each([
    ['DOCUMENT_TYPE_LABEL', DOCUMENT_TYPE_LABEL],
    ['DOCUMENT_SOURCE_LABEL', DOCUMENT_SOURCE_LABEL],
    ['PROCESSING_STATUS_LABEL', PROCESSING_STATUS_LABEL],
    ['DIAGNOSIS_STATUS_LABEL', DIAGNOSIS_STATUS_LABEL],
    ['LAB_FLAG_LABEL', LAB_FLAG_LABEL],
    ['TIMELINE_EVENT_LABEL', TIMELINE_EVENT_LABEL],
  ] as const)('%s 는 비어 있지 않고 서로 다른 라벨을 가진다', (_name, labels) => {
    const values: string[] = Object.values(labels);
    expect(values.every((v) => v.trim().length > 0)).toBe(true);
    expect(new Set(values).size).toBe(values.length);
  });

  it('검사 판정 라벨은 색 없이도 의미가 전달되는 글자다', () => {
    expect(LAB_FLAG_LABEL).toEqual({
      critical_low: '매우 낮음',
      low: '낮음',
      normal: '정상',
      high: '높음',
      critical_high: '매우 높음',
    });
  });
});
