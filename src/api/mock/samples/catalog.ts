/**
 * 내장 데모 서버 샘플 데이터의 공통 사전 — 검사 항목 · 약 · 진단명.
 *
 * 여러 문서에 같은 검사·약·진단이 반복해서 나오므로, 이름·단위·참고치·코드처럼
 * 문서와 상관없이 고정된 정보는 여기에서 한 번만 정의한다.
 * (같은 검사 코드를 공유해야 검사 추이 그래프와 타임라인 진단 묶음이 올바르게 동작한다.)
 *
 * 의학 정보는 환자 교육용 일반 설명이며, 복용량 변경 등 지시는 담지 않는다.
 */
import type { ReferenceRange } from '@/types/domain';

/* ------------------------------------------------------------------ */
/* 검사 항목                                                           */
/* ------------------------------------------------------------------ */

/** 표준화 검사 코드 (LabResult.code) */
export type LabCode =
  | 'HBA1C'
  | 'GLU'
  | 'TC'
  | 'LDL'
  | 'HDL'
  | 'TG'
  | 'AST'
  | 'ALT'
  | 'GGT'
  | 'CREAT'
  | 'EGFR'
  | 'UACR'
  | 'WBC'
  | 'HB'
  | 'PLT';

export type LabCategory = '당뇨' | '지질' | '간기능' | '신장기능' | '혈액';

export interface LabDefinition {
  /** 환자용 한글 검사명 */
  name: string;
  /** 결과지에 흔히 인쇄되는 표기 (문서별로 바꿔 쓸 수 있음) */
  originalName: string;
  category: LabCategory;
  unit: string;
  /** 성인 남성 기준의 일반적인 국내 검사실 참고치 */
  referenceRange: ReferenceRange;
  /** 어떤 검사인지 쉬운 설명 (판정 문구 앞에 붙는다) */
  about: string;
}

export const LAB_CATALOG: Record<LabCode, LabDefinition> = {
  HBA1C: {
    name: '당화혈색소',
    originalName: 'HbA1c',
    category: '당뇨',
    unit: '%',
    referenceRange: { low: 4.0, high: 6.0, text: '4.0-6.0' },
    about:
      '당화혈색소는 최근 2~3개월 동안의 평균 혈당을 보여 주는 검사예요. 당뇨병이 있으면 흔히 6.5% 미만을 관리 목표로 하지만, 목표는 나이와 건강 상태에 따라 담당 의료진이 정해요.',
  },
  GLU: {
    name: '공복혈당',
    originalName: 'FBS',
    category: '당뇨',
    unit: 'mg/dL',
    referenceRange: { low: 70, high: 110, text: '70-110' },
    about:
      '8시간 이상 아무것도 먹지 않은 상태에서 잰 혈당이에요. 126mg/dL 이상이 반복되면 당뇨병 진단 기준에 해당해요.',
  },
  TC: {
    name: '총콜레스테롤',
    originalName: 'T-Chol',
    category: '지질',
    unit: 'mg/dL',
    referenceRange: { high: 200, text: '<200' },
    about: '혈액 속 콜레스테롤의 전체 양이에요. 좋은 콜레스테롤과 나쁜 콜레스테롤이 모두 포함돼요.',
  },
  LDL: {
    name: 'LDL 콜레스테롤',
    originalName: 'LDL-C',
    category: '지질',
    unit: 'mg/dL',
    referenceRange: { high: 130, text: '<130' },
    about:
      "혈관 벽에 쌓여 동맥경화를 일으킬 수 있어 '나쁜 콜레스테롤'이라고 불려요. 당뇨병이 있으면 일반 참고치보다 낮은 목표(흔히 100mg/dL 미만)로 관리하는 경우가 많아요.",
  },
  HDL: {
    name: 'HDL 콜레스테롤',
    originalName: 'HDL-C',
    category: '지질',
    unit: 'mg/dL',
    referenceRange: { low: 40, text: '>40' },
    about: "혈관에 쌓인 콜레스테롤을 간으로 옮겨 없애 주는 '좋은 콜레스테롤'이에요. 높을수록 혈관 건강에 좋아요.",
  },
  TG: {
    name: '중성지방',
    originalName: 'TG',
    category: '지질',
    unit: 'mg/dL',
    referenceRange: { high: 150, text: '<150' },
    about: '몸에 저장되는 지방의 한 종류예요. 단 음식, 밥·빵 같은 탄수화물이나 술을 많이 먹으면 올라가기 쉬워요.',
  },
  AST: {
    name: 'AST(간 수치)',
    originalName: 'AST',
    category: '간기능',
    unit: 'U/L',
    referenceRange: { low: 0, high: 40, text: '0-40' },
    about: '간과 근육 세포가 손상될 때 혈액으로 나오는 효소예요. ALT와 함께 간 건강을 살피는 기본 검사예요.',
  },
  ALT: {
    name: 'ALT(간 수치)',
    originalName: 'ALT',
    category: '간기능',
    unit: 'U/L',
    referenceRange: { low: 0, high: 40, text: '0-40' },
    about: '주로 간세포 안에 있는 효소로, 지방간이나 간염이 있으면 올라가요. 간 상태를 비교적 잘 반영하는 수치예요.',
  },
  GGT: {
    name: '감마지티피',
    originalName: 'γ-GTP',
    category: '간기능',
    unit: 'U/L',
    referenceRange: { low: 11, high: 63, text: '11-63' },
    about: '간과 담도(쓸개즙이 지나는 길)에 있는 효소로, 음주·지방간·일부 약물의 영향을 받아 올라갈 수 있어요.',
  },
  CREAT: {
    name: '크레아티닌',
    originalName: 'Cr',
    category: '신장기능',
    unit: 'mg/dL',
    referenceRange: { low: 0.7, high: 1.3, text: '0.7-1.3' },
    about: '근육에서 만들어져 콩팥으로 걸러지는 노폐물이에요. 콩팥 기능이 떨어지면 혈액 속 수치가 올라가요.',
  },
  EGFR: {
    name: '사구체여과율',
    originalName: 'eGFR',
    category: '신장기능',
    unit: 'mL/min/1.73m²',
    referenceRange: { low: 60, text: '≥60' },
    about:
      '크레아티닌 수치와 나이·성별로 계산한 콩팥의 노폐물 거르는 능력이에요. 60 미만이 3개월 넘게 이어지면 만성콩팥병을 의심해요.',
  },
  UACR: {
    name: '소변 알부민',
    originalName: 'Urine ACR',
    category: '신장기능',
    unit: 'mg/g',
    referenceRange: { high: 30, text: '<30' },
    about:
      '소변으로 새어 나오는 알부민(단백질)의 양을 크레아티닌과 비교한 값으로, 당뇨병으로 인한 콩팥 손상을 일찍 찾아내는 데 쓰여요.',
  },
  WBC: {
    name: '백혈구',
    originalName: 'WBC',
    category: '혈액',
    unit: '×10³/µL',
    referenceRange: { low: 4.0, high: 10.0, text: '4.0-10.0' },
    about: '세균·바이러스와 싸우는 혈액 세포예요. 감염이나 염증이 있으면 늘어날 수 있어요.',
  },
  HB: {
    name: '혈색소',
    originalName: 'Hb',
    category: '혈액',
    unit: 'g/dL',
    referenceRange: { low: 13.0, high: 17.0, text: '13.0-17.0' },
    about: '적혈구 안에서 산소를 나르는 단백질이에요. 낮으면 빈혈을 의심해요.',
  },
  PLT: {
    name: '혈소판',
    originalName: 'PLT',
    category: '혈액',
    unit: '×10³/µL',
    referenceRange: { low: 150, high: 400, text: '150-400' },
    about: '피가 날 때 뭉쳐서 피를 멈추게 하는 혈액 세포예요.',
  },
};

/* ------------------------------------------------------------------ */
/* 약                                                                  */
/* ------------------------------------------------------------------ */

export type DrugKey = 'metformin' | 'metformin_xr' | 'sitagliptin' | 'atorvastatin';

export interface DrugDefinition {
  /** 제품명 */
  name: string;
  /** 성분명 */
  ingredient: string;
  /** 왜 먹는 약인지 — 타임라인에 `성분(목적)` 으로 이어 붙으므로 짧게 */
  purpose: string;
  cautions: readonly string[];
}

const METFORMIN_SHARED_CAUTIONS = [
  '조영제를 쓰는 CT 검사나 수술을 앞두고 있다면 이 약을 먹고 있다고 미리 알려 주세요.',
  '과음은 피하세요. 드물지만 심각한 부작용(젖산산증) 위험이 커질 수 있어요.',
] as const;

export const DRUGS: Record<DrugKey, DrugDefinition> = {
  metformin: {
    name: '다이아벡스정 500mg',
    ingredient: '메트포르민',
    purpose: '혈당 조절',
    cautions: [
      '복용 초기에 속 불편함·설사가 생길 수 있어요. 대부분 시간이 지나면 나아지지만, 계속되면 의료진과 상의하세요.',
      ...METFORMIN_SHARED_CAUTIONS,
    ],
  },
  metformin_xr: {
    name: '다이아벡스엑스알서방정 1000mg',
    ingredient: '메트포르민(서방형)',
    purpose: '혈당 조절',
    cautions: [
      '천천히 녹도록 만든 약이라 쪼개거나 씹지 말고 통째로 삼키세요.',
      ...METFORMIN_SHARED_CAUTIONS,
    ],
  },
  sitagliptin: {
    name: '자누비아정 100mg',
    ingredient: '시타글립틴',
    purpose: '혈당 조절 보조',
    cautions: [
      '이 약만으로는 저혈당이 드물지만, 다른 당뇨약과 함께 먹거나 식사를 거르면 생길 수 있어요. 식은땀·손 떨림이 있으면 당분을 섭취하고 의료진에게 알려 주세요.',
      '배가 심하게 아프고 통증이 등까지 이어지면 드문 부작용(췌장염)일 수 있으니 바로 진료를 받으세요.',
    ],
  },
  atorvastatin: {
    name: '리피토정 10mg',
    ingredient: '아토르바스타틴',
    purpose: '콜레스테롤 조절',
    cautions: [
      '특별한 이유 없이 근육이 아프거나 힘이 빠지면 의료진에게 알려 주세요.',
      '자몽주스를 많이 마시면 약의 혈중 농도가 높아질 수 있어요.',
    ],
  },
};

/* ------------------------------------------------------------------ */
/* 진단명                                                              */
/* ------------------------------------------------------------------ */

export type ConditionKey =
  | 'dm'
  | 'dyslipidemia'
  | 'nafld'
  | 'prehypertension'
  | 'ureteral_stone'
  | 'retinopathy'
  | 'liver_enzyme';

export interface ConditionDefinition {
  /** 환자용 한글 진단명 */
  name: string;
  /** KCD-8 코드 — 타임라인은 이 코드로 같은 진단을 한 번만 보여 준다 */
  code: string;
}

export const CONDITIONS: Record<ConditionKey, ConditionDefinition> = {
  dm: { name: '제2형 당뇨병', code: 'E11.9' },
  dyslipidemia: { name: '이상지질혈증', code: 'E78.5' },
  nafld: { name: '비알코올 지방간', code: 'K76.0' },
  prehypertension: { name: '고혈압 전단계', code: 'R03.0' },
  ureteral_stone: { name: '요관결석', code: 'N20.1' },
  retinopathy: { name: '당뇨망막병증', code: 'H36.0' },
  liver_enzyme: { name: '간 수치 상승', code: 'R74.0' },
};
