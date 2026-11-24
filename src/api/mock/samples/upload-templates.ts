/**
 * 새로 등록한 문서에 붙일 샘플 해설 템플릿.
 *
 * 내장 데모 서버는 실제 OCR·AI 없이 동작하므로, 문서 종류에 맞는 해설 템플릿을 골라
 * 등록 정보(병원·진료과·진료일)를 끼워 넣는다. 수치는 시드 환자 이야기의 흐름
 * (당화혈색소 6%대 중후반 유지, 고혈압 전단계 관찰)을 자연스럽게 이어 가도록 정했다.
 *
 * - 검사 결과지(lab_result) → 검사 위주 템플릿
 * - 처방전(prescription)   → 약 위주 템플릿
 * - 그 밖의 문서            → 진료기록 템플릿
 * 종류마다 2가지 변형이 있으며, 업로드 순번(templateIndex)으로 번갈아 고른다.
 */
import { formatDate } from '@/lib/format';
import { DOCUMENT_TYPE_LABEL } from '@/lib/labels';
import type { DocumentType, GlossaryTerm, MedicalDocument } from '@/types/domain';

import type { AnalysisSpec, MedicationSpec, SentenceSpec } from './builder';

export interface UploadContext {
  hospitalName: string;
  /** '병원 진료과' (진료과가 없으면 병원 이름만) */
  place: string;
  /** 진료과 (없으면 '외래') */
  departmentLabel: string;
  /** 문서 종류 표시 이름 (진료기록, 소견서·진단서 …) */
  typeLabel: string;
  /** 진료일 '2026.11.24' */
  dateLabel: string;
}

export type UploadTemplate = (ctx: UploadContext) => AnalysisSpec;

export function createUploadContext(
  document: Pick<MedicalDocument, 'hospitalName' | 'department' | 'documentType' | 'visitDate'>,
): UploadContext {
  const department = document.department?.trim();
  return {
    hospitalName: document.hospitalName,
    place: department ? `${document.hospitalName} ${department}` : document.hospitalName,
    departmentLabel: department || '외래',
    typeLabel: DOCUMENT_TYPE_LABEL[document.documentType],
    dateLabel: formatDate(document.visitDate),
  };
}

/* ------------------------------------------------------------------ */
/* 공통 조각                                                            */
/* ------------------------------------------------------------------ */

const TERM = {
  bid: { term: 'bid', meaning: '하루 두 번' },
  qd: { term: 'qd', meaning: '하루 한 번' },
  fu: { term: 'f/u', meaning: '추적 관찰(follow-up). 경과를 보려고 다시 방문' },
  hba1c: { term: 'HbA1c', meaning: '당화혈색소. 최근 2~3개월 평균 혈당을 반영하는 검사' },
  fbs: { term: 'FBS', meaning: '공복혈당' },
  bp: { term: 'BP', meaning: '혈압(Blood Pressure)' },
  t2dm: { term: 'T2DM', meaning: '제2형 당뇨병' },
  nafld: { term: 'NAFLD', meaning: '비알코올 지방간질환' },
  prehypertension: { term: 'Prehypertension', meaning: '고혈압 전단계' },
  eGfrDash: { term: 'e-GFR', meaning: '추정 사구체여과율. 콩팥이 노폐물을 거르는 능력' },
} satisfies Record<string, GlossaryTerm>;

/** 처방전의 '1회 투약량 / 1일 투여 횟수 / 총 투약일수' 칸 풀이 */
function dosingColumnsTerm(text: string): GlossaryTerm {
  return { term: text, meaning: '1회 투약량 / 1일 투여 횟수 / 총 투약일수' };
}

/**
 * 현재 복용 중인 세 가지 약 (시드 이야기의 2026-02 처방과 동일).
 * 의사마다 적는 방식이 달라 원문 표기를 두 가지로 둔다.
 * - full : 'Metformin 500mg 1T bid pc'
 * - brief: 'Metformin 500mg bid'
 */
function currentMedications(notation: 'full' | 'brief', durationDays: number): MedicationSpec[] {
  const full = notation === 'full';
  return [
    {
      drug: 'metformin',
      originalText: full ? 'Metformin 500mg 1T bid pc' : 'Metformin 500mg bid',
      dose: '1정',
      frequency: '하루 2번, 아침·저녁 식사 직후',
      durationDays,
    },
    {
      drug: 'sitagliptin',
      originalText: full ? 'Sitagliptin 100mg 1T qd' : 'Sitagliptin 100mg qd',
      dose: '1정',
      frequency: '하루 1번, 아침 식사 후',
      durationDays,
    },
    {
      drug: 'atorvastatin',
      originalText: full ? 'Atorvastatin 10mg 1T qd' : 'Atorvastatin 10mg qd',
      dose: '1정',
      frequency: '하루 1번, 저녁 식사 후',
      durationDays,
    },
  ];
}

function recordHeader(ctx: UploadContext): SentenceSpec {
  return {
    section: '진료 정보',
    original: `${ctx.hospitalName} ${ctx.departmentLabel} ${ctx.typeLabel} (${ctx.dateLabel})`,
    plain: '이 문서를 작성한 병원·진료과와 진료 날짜예요.',
    confidence: 0.97,
  };
}

function prescriptionHeader(ctx: UploadContext): SentenceSpec {
  return {
    section: '처방전 정보',
    original: `의료기관 명칭: ${ctx.hospitalName} / 교부일: ${ctx.dateLabel}`,
    plain: '처방전을 발급한 병원과 발급한 날짜예요.',
    terms: [{ term: '교부일', meaning: '처방전을 발급한 날' }],
    confidence: 0.95,
  };
}

const PRESCRIPTION_DISEASE_CODES: SentenceSpec = {
  section: '질병분류기호',
  original: '질병분류기호: E11.9, E78.5',
  plain: '처방 이유가 된 병의 코드예요. E11.9는 제2형 당뇨병, E78.5는 이상지질혈증을 뜻해요.',
  terms: [{ term: '질병분류기호', meaning: '한국표준질병·사인분류(KCD)에 따른 병의 코드' }],
  confidence: 0.9,
  related: ['dx:dm', 'dx:dyslipidemia'],
};

const PRESCRIPTION_VALIDITY: SentenceSpec = {
  section: '사용기간',
  original: '사용기간: 교부일로부터 3일간',
  plain: '이 처방전은 발급일을 포함해 3일 안에 약국에 내야 약을 받을 수 있다는 뜻이에요.',
  terms: [{ term: '교부일', meaning: '처방전을 발급한 날' }],
  confidence: 0.93,
};

/* ------------------------------------------------------------------ */
/* 진료기록                                                            */
/* ------------------------------------------------------------------ */

/** 진료기록 ①: 혈당이 안정된 정기 추적 진료 */
const routineFollowUp: UploadTemplate = (ctx) => ({
  overallSummary: `${ctx.place}에서 받은 정기 추적 진료 내용이에요. 당화혈색소가 6.5%로 관리 목표 가까이 유지되고 있고, 나쁜 콜레스테롤과 콩팥 기능도 안정적이에요. 혈압이 고혈압 전단계 범위로 측정되어 집에서 재 보며 지켜보기로 했어요. 지금 먹는 약은 그대로 유지해요.`,
  diagnoses: [
    {
      condition: 'dm',
      originalTerm: 'T2DM, stable',
      status: 'confirmed',
      plainExplanation: '혈당이 관리 목표 가까이에서 안정적으로 유지되고 있어요. 지금의 약과 생활습관 관리를 이어 가요.',
    },
    {
      condition: 'dyslipidemia',
      originalTerm: 'Dyslipidemia',
      status: 'confirmed',
      plainExplanation: '콜레스테롤약으로 나쁜 콜레스테롤(LDL)이 잘 조절되고 있어요.',
    },
    {
      condition: 'prehypertension',
      originalTerm: 'Prehypertension, observation',
      status: 'confirmed',
      plainExplanation:
        '진료실에서 잰 혈압이 130~139/80~89 범위였어요. 고혈압으로 진단된 것은 아니며, 집에서 잰 혈압과 함께 지켜보기로 했어요.',
    },
  ],
  labs: [
    { code: 'HBA1C', value: 6.5 },
    { code: 'GLU', value: 114 },
    { code: 'LDL', value: 74 },
    { code: 'CREAT', value: 0.99 },
    { code: 'EGFR', value: 85 },
  ],
  medications: currentMedications('full', 90),
  sentences: [
    recordHeader(ctx),
    {
      section: '주호소',
      original: 'C/C) DM, dyslipidemia 정기 f/u. hypoglycemia sx (-)',
      plain: '당뇨병과 이상지질혈증으로 정기적으로 방문했고, 저혈당 증상은 없었다는 기록이에요.',
      terms: [
        { term: 'DM', meaning: '당뇨병(Diabetes Mellitus)' },
        TERM.fu,
        { term: 'hypoglycemia', meaning: '저혈당' },
        { term: 'sx', meaning: '증상(symptom)' },
        { term: '(-)', meaning: '없음(음성)' },
      ],
      confidence: 0.94,
      related: ['dx:dm', 'dx:dyslipidemia'],
    },
    {
      section: '현병력',
      original: 'SMBG 공복 100~120 mg/dL, 주 4회 30분 걷기 운동 중',
      plain: '집에서 직접 잰 아침 공복혈당이 100~120mg/dL 정도이고, 일주일에 4번 30분씩 걷기 운동을 하고 있다는 내용이에요.',
      terms: [{ term: 'SMBG', meaning: '자가혈당측정. 집에서 혈당측정기로 직접 재는 혈당' }],
      confidence: 0.83,
      related: ['dx:dm'],
    },
    {
      section: '신체검진',
      original: 'BP 134/84 mmHg, BW 78.4 kg',
      plain: "혈압이 134/84mmHg로 정상보다 조금 높은 '고혈압 전단계' 범위였고, 몸무게는 78.4kg이에요.",
      terms: [TERM.bp, { term: 'BW', meaning: '체중(Body Weight)' }],
      confidence: 0.66,
      related: ['dx:prehypertension'],
    },
    {
      section: '검사 결과',
      original: 'HbA1c 6.5%, FBS 114 mg/dL',
      plain: '당화혈색소 6.5%, 공복혈당 114mg/dL로 참고치보다는 조금 높지만, 혈당이 비교적 안정적으로 유지되고 있어요.',
      terms: [TERM.hba1c, TERM.fbs],
      confidence: 0.97,
      related: ['lab:HBA1C', 'lab:GLU', 'dx:dm'],
    },
    {
      section: '검사 결과',
      original: 'LDL-C 74 mg/dL',
      plain: '나쁜 콜레스테롤(LDL)이 74mg/dL로 잘 조절되고 있어요.',
      terms: [{ term: 'LDL-C', meaning: "저밀도 지단백 콜레스테롤. 흔히 '나쁜 콜레스테롤'" }],
      confidence: 0.95,
      related: ['lab:LDL', 'dx:dyslipidemia'],
    },
    {
      section: '검사 결과',
      original: 'Cr 0.99 mg/dL, eGFR 85',
      plain: '콩팥 기능을 보는 크레아티닌과 사구체여과율이 정상이에요.',
      terms: [
        { term: 'Cr', meaning: '크레아티닌. 콩팥으로 걸러지는 노폐물' },
        { term: 'eGFR', meaning: '추정 사구체여과율. 콩팥이 노폐물을 거르는 능력' },
      ],
      confidence: 0.95,
      related: ['lab:CREAT', 'lab:EGFR'],
    },
    {
      section: '진단',
      original: 'Imp) T2DM, stable / Dyslipidemia / Prehypertension, observation',
      plain: '제2형 당뇨병은 안정적이고, 이상지질혈증은 잘 조절되고 있으며, 고혈압 전단계는 지켜보는 중이라는 판단이에요.',
      terms: [
        TERM.t2dm,
        { term: 'stable', meaning: '안정적인 상태' },
        TERM.prehypertension,
        { term: 'observation', meaning: '경과 관찰(지켜봄)' },
      ],
      confidence: 0.9,
      related: ['dx:dm', 'dx:dyslipidemia', 'dx:prehypertension'],
    },
    {
      section: '처방',
      original: 'Rx) Metformin 500mg 1T bid pc, Sitagliptin 100mg 1T qd, Atorvastatin 10mg 1T qd, 90일분 (기존 처방 유지)',
      plain: '메트포르민(하루 2번), 시타글립틴(하루 1번), 아토르바스타틴(하루 1번)을 지금처럼 90일분 처방했어요.',
      terms: [{ term: 'Rx', meaning: '처방' }, TERM.bid, TERM.qd],
      confidence: 0.93,
      related: ['med:metformin', 'med:sitagliptin', 'med:atorvastatin'],
    },
    {
      section: '향후 계획',
      original: 'Plan) HBPM 및 저염식 교육. 3개월 후 f/u, 연 1회 fundus exam 권유',
      plain: '집에서 혈압을 재는 방법과 싱겁게 먹는 방법을 안내받았어요. 3개월 뒤 다시 진료받고, 1년에 한 번 안저검사를 받도록 권유받았어요.',
      terms: [
        { term: 'HBPM', meaning: '가정혈압 측정(Home Blood Pressure Monitoring)' },
        TERM.fu,
        { term: 'fundus exam', meaning: '안저검사. 동공을 통해 망막을 살펴보는 검사' },
      ],
      confidence: 0.86,
      related: ['dx:prehypertension'],
    },
  ],
  suggestedQuestions: [
    '당화혈색소가 지금처럼 유지되면 약을 줄여 볼 수도 있나요?',
    '가정혈압이 몇 이상으로 나오면 진료 전에 연락해야 하나요?',
    '안저검사는 어디에서 받으면 되나요?',
    '걷기 말고 근력 운동도 함께 하는 게 좋을까요?',
  ],
});

/** 진료기록 ②: 지방간·혈압 추적 진료 */
const liverAndBloodPressureFollowUp: UploadTemplate = (ctx) => ({
  overallSummary: `${ctx.place}에서 지방간과 혈압을 다시 확인한 진료 내용이에요. 복부 초음파에서 지방간이 이전보다 줄어든 것으로 보이지만, 간 수치(ALT)와 중성지방은 아직 조금 높아요. 혈압은 고혈압 전단계 범위라 생활습관 관리를 이어 가기로 했어요. 당화혈색소는 6.7%이고 지금 먹는 약은 그대로 유지해요.`,
  diagnoses: [
    {
      condition: 'nafld',
      originalTerm: 'NAFLD, improving',
      status: 'confirmed',
      plainExplanation: '초음파에서 지방간이 이전보다 줄어든 것으로 보여요. 체중과 음주 관리를 이어 가면 더 좋아질 수 있어요.',
    },
    {
      condition: 'prehypertension',
      originalTerm: 'Prehypertension',
      status: 'confirmed',
      plainExplanation:
        '병원에서 잰 혈압이 고혈압 전단계 범위예요. 아직 고혈압은 아니며, 싱겁게 먹기·운동 같은 생활습관 관리로 지켜보고 있어요.',
    },
    {
      condition: 'dm',
      originalTerm: 'T2DM',
      status: 'confirmed',
      plainExplanation: '당화혈색소 6%대에서 혈당이 유지되고 있어요. 지금의 약과 생활습관 관리를 이어 가요.',
    },
  ],
  labs: [
    { code: 'HBA1C', value: 6.7 },
    { code: 'GLU', value: 112 },
    { code: 'AST', value: 30 },
    { code: 'ALT', value: 42 },
    { code: 'GGT', value: 52 },
    { code: 'TG', value: 158 },
  ],
  medications: currentMedications('brief', 90),
  sentences: [
    recordHeader(ctx),
    {
      section: '주호소',
      original: 'C/C) NAFLD, prehypertension f/u',
      plain: '지방간과 고혈압 전단계의 경과를 보려고 방문했다는 기록이에요.',
      terms: [TERM.nafld, TERM.prehypertension, TERM.fu],
      confidence: 0.93,
      related: ['dx:nafld', 'dx:prehypertension'],
    },
    {
      section: '현병력',
      original: '최근 회식 잦아 음주 주 2회, 야식 증가',
      plain: '최근 회식이 잦아 일주일에 2번 정도 술을 마셨고, 밤늦게 먹는 일이 늘었다는 내용이에요.',
      terms: [{ term: '야식', meaning: '밤늦게 먹는 음식' }],
      confidence: 0.61,
    },
    {
      section: '신체검진',
      original: 'BP 138/86 mmHg, 재측정 134/84 mmHg',
      plain: '혈압을 두 번 쟀는데 모두 고혈압 전단계 범위(130~139/80~89)였어요.',
      terms: [TERM.bp, { term: '재측정', meaning: '다시 잼' }],
      confidence: 0.9,
      related: ['dx:prehypertension'],
    },
    {
      section: '검사 결과',
      original: 'HbA1c 6.7%, FBS 112 mg/dL',
      plain: '당화혈색소 6.7%, 공복혈당 112mg/dL로 참고치보다 조금 높지만 6%대에서 유지되고 있어요.',
      terms: [TERM.hba1c, TERM.fbs],
      confidence: 0.97,
      related: ['lab:HBA1C', 'lab:GLU', 'dx:dm'],
    },
    {
      section: '검사 결과',
      original: 'AST/ALT 30/42 IU/L, γ-GTP 52 IU/L',
      plain: 'ALT가 기준보다 조금 높고, AST와 감마지티피는 정상이에요. 최근 음주와 야식이 영향을 줬을 수 있어요.',
      terms: [{ term: 'γ-GTP', meaning: '감마지티피. 음주·지방간 등에 영향을 받는 간 효소' }],
      confidence: 0.88,
      related: ['lab:AST', 'lab:ALT', 'lab:GGT', 'dx:nafld'],
    },
    {
      section: '검사 결과',
      original: 'TG 158 mg/dL',
      plain: '중성지방이 기준(150mg/dL)보다 조금 높아요. 술과 야식은 중성지방을 올리기 쉬워요.',
      terms: [{ term: 'TG', meaning: '중성지방(Triglyceride)' }],
      confidence: 0.94,
      related: ['lab:TG'],
    },
    {
      section: '영상 소견',
      original: 'Abd. US: mild fatty liver, interval improvement',
      plain: '복부 초음파에서 가벼운 지방간이 보이지만, 이전 검사보다는 좋아졌다는 결과예요.',
      terms: [
        { term: 'Abd. US', meaning: '복부 초음파 검사(Abdominal Ultrasonography)' },
        { term: 'fatty liver', meaning: '지방간' },
        { term: 'interval improvement', meaning: '이전 검사와 비교해 좋아짐' },
      ],
      confidence: 0.9,
      related: ['dx:nafld'],
    },
    {
      section: '진단',
      original: 'Imp) NAFLD, improving / Prehypertension / T2DM',
      plain: '비알코올 지방간은 좋아지는 중이고, 고혈압 전단계와 제2형 당뇨병은 계속 관리 중이라는 판단이에요.',
      terms: [TERM.nafld, { term: 'improving', meaning: '호전 중(좋아지는 중)' }, TERM.prehypertension, TERM.t2dm],
      confidence: 0.91,
      related: ['dx:nafld', 'dx:prehypertension', 'dx:dm'],
    },
    {
      section: '처방',
      original: 'Rx) 기존 약 유지 (Metformin 500mg bid, Sitagliptin 100mg qd, Atorvastatin 10mg qd), 90일분',
      plain: '지금 먹는 약 세 가지를 그대로 90일분 처방했어요.',
      terms: [{ term: '유지', meaning: '지금 쓰는 약을 그대로 계속 사용' }, TERM.bid, TERM.qd],
      confidence: 0.92,
      related: ['med:metformin', 'med:sitagliptin', 'med:atorvastatin'],
    },
    {
      section: '향후 계획',
      original: '절주, 야식 제한, 저염식 교육. 3개월 후 LFT·TG f/u',
      plain: '술과 야식을 줄이고 싱겁게 먹는 방법을 안내받았어요. 3개월 뒤 간 수치와 중성지방을 다시 확인해요.',
      terms: [
        { term: '절주', meaning: '술을 줄임' },
        { term: 'LFT', meaning: '간기능 검사(Liver Function Test)' },
        TERM.fu,
      ],
      confidence: 0.85,
      related: ['dx:nafld', 'dx:prehypertension'],
    },
  ],
  suggestedQuestions: [
    '지방간이 좋아지고 있다면 초음파는 얼마나 자주 받아야 하나요?',
    '회식 자리에서 술을 피하기 어려울 때는 어떻게 하면 좋을까요?',
    '야식을 줄이는 것 말고 중성지방에 도움이 되는 습관이 있을까요?',
    '혈압이 이 정도로 계속되면 언제쯤 약을 고민하게 되나요?',
  ],
});

/* ------------------------------------------------------------------ */
/* 검사 결과지                                                         */
/* ------------------------------------------------------------------ */

/** 검사 결과지 ①: 정기 혈액검사 (당뇨·지질·간·신장) */
const routineBloodTest: UploadTemplate = (ctx) => ({
  overallSummary: `${ctx.place}에서 받은 정기 혈액검사 결과예요. 당화혈색소 6.5%, 공복혈당 114mg/dL로 참고치보다 조금 높지만 6%대 중반에서 안정적으로 유지되고 있어요. 콜레스테롤·간 수치·콩팥 기능은 모두 참고치 범위 안이에요.`,
  diagnoses: [
    {
      condition: 'dm',
      originalTerm: 'T2DM (on medication)',
      status: 'confirmed',
      plainExplanation: '약을 먹으며 관리 중인 당뇨병이에요. 이번 검사에서 혈당은 6%대 중반으로 유지되고 있어요.',
    },
    {
      condition: 'dyslipidemia',
      originalTerm: 'dyslipidemia (on medication)',
      status: 'confirmed',
      plainExplanation: '약으로 관리 중인 이상지질혈증이에요. 이번 검사에서 콜레스테롤 수치는 모두 참고치 안이었어요.',
    },
  ],
  labs: [
    { code: 'HBA1C', value: 6.5 },
    { code: 'GLU', value: 114, originalName: 'Glucose (fasting)' },
    { code: 'TC', value: 153 },
    { code: 'HDL', value: 46 },
    { code: 'TG', value: 139 },
    { code: 'LDL', value: 79 },
    { code: 'AST', value: 27 },
    { code: 'ALT', value: 33 },
    { code: 'GGT', value: 45 },
    { code: 'CREAT', value: 0.99, originalName: 'Creatinine' },
    { code: 'EGFR', value: 85, originalName: 'eGFR(CKD-EPI)' },
  ],
  medications: [],
  sentences: [
    {
      section: '검사 정보',
      original: `${ctx.hospitalName} 진단검사 결과보고서 (검체 채취일 ${ctx.dateLabel})`,
      plain: '검사 결과지를 발행한 기관과 피를 뽑은 날짜예요.',
      terms: [{ term: '검체', meaning: '검사를 위해 채취한 혈액·소변 등' }],
      confidence: 0.96,
    },
    {
      section: '검사 정보',
      original: 'Specimen: serum / whole blood (EDTA), fasting 12 hr',
      plain: '12시간 금식한 상태에서 뽑은 혈액으로 검사했다는 뜻이에요. 혈당과 중성지방은 금식 여부에 따라 값이 달라져요.',
      terms: [
        { term: 'serum', meaning: '혈청. 혈액이 굳은 뒤 위에 뜨는 맑은 액체' },
        { term: 'fasting', meaning: '금식' },
      ],
      confidence: 0.71,
    },
    {
      section: '임상 정보',
      original: 'Clinical Dx: T2DM, dyslipidemia (on medication)',
      plain: '검사를 요청한 의사가 적은 진단명으로, 당뇨병과 이상지질혈증으로 약을 먹고 있다는 정보예요.',
      terms: [
        { term: 'Clinical Dx', meaning: '임상 진단. 검사를 요청한 의사가 적은 진단명' },
        TERM.t2dm,
        { term: 'on medication', meaning: '약물 치료 중' },
      ],
      confidence: 0.87,
      related: ['dx:dm', 'dx:dyslipidemia'],
    },
    {
      section: '당 검사',
      original: 'HbA1c 6.5 % (H) [4.0-6.0]',
      plain: '당화혈색소가 참고치보다 조금 높아요. 당뇨병 관리 목표로 흔히 쓰는 기준(6.5% 미만) 바로 근처예요.',
      terms: [TERM.hba1c, { term: '(H)', meaning: '참고치보다 높음(High) 표시' }],
      confidence: 0.97,
      related: ['lab:HBA1C', 'dx:dm'],
    },
    {
      section: '당 검사',
      original: 'Glucose (fasting) 114 mg/dL (H) [70-110]',
      plain: '공복혈당이 참고치 상한(110mg/dL)보다 조금 높아요.',
      terms: [
        { term: 'Glucose', meaning: '혈당(포도당)' },
        { term: '(H)', meaning: '참고치보다 높음(High) 표시' },
      ],
      confidence: 0.96,
      related: ['lab:GLU'],
    },
    {
      section: '지질 검사',
      original: 'T-Chol 153 / HDL-C 46 / TG 139 / LDL-C 79 mg/dL',
      plain: '총콜레스테롤·좋은 콜레스테롤·중성지방·나쁜 콜레스테롤이 모두 참고치 안이에요.',
      terms: [
        { term: 'T-Chol', meaning: '총콜레스테롤(Total Cholesterol)' },
        { term: 'HDL-C', meaning: "고밀도 지단백 콜레스테롤. 흔히 '좋은 콜레스테롤'" },
        { term: 'LDL-C', meaning: "저밀도 지단백 콜레스테롤. 흔히 '나쁜 콜레스테롤'" },
      ],
      confidence: 0.95,
      related: ['lab:TC', 'lab:HDL', 'lab:TG', 'lab:LDL', 'dx:dyslipidemia'],
    },
    {
      section: '간기능 검사',
      original: 'AST 27, ALT 33, γ-GTP 45 U/L',
      plain: '간 수치가 모두 정상이에요.',
      terms: [{ term: 'γ-GTP', meaning: '감마지티피. 음주·지방간 등에 영향을 받는 간 효소' }],
      confidence: 0.95,
      related: ['lab:AST', 'lab:ALT', 'lab:GGT'],
    },
    {
      section: '신기능 검사',
      original: 'Creatinine 0.99 mg/dL, eGFR(CKD-EPI) 85 mL/min/1.73m²',
      plain: '콩팥 기능이 정상이에요.',
      terms: [
        { term: 'Creatinine', meaning: '크레아티닌. 콩팥으로 걸러지는 노폐물' },
        { term: 'CKD-EPI', meaning: 'eGFR을 계산하는 공식 이름' },
      ],
      confidence: 0.94,
      related: ['lab:CREAT', 'lab:EGFR'],
    },
    {
      section: '검사 소견',
      original: '※ 결과 해석은 담당 의사와 상의하십시오.',
      plain: '검사 수치의 의미는 증상과 다른 검사를 함께 보고 판단해야 하니, 담당 의사와 상의하라는 안내예요.',
      confidence: 0.9,
    },
  ],
  suggestedQuestions: [
    '공복혈당이 110을 조금 넘는 정도면 걱정해야 하나요?',
    '콜레스테롤 수치가 좋아졌는데 약은 계속 먹어야 하나요?',
    '다음 혈액검사는 언제 받으면 되나요?',
    '콩팥 기능 검사는 얼마나 자주 확인해야 하나요?',
  ],
});

/** 검사 결과지 ②: 건강검진 (일반혈액·당뇨·지질·간·신장·소변) */
const healthCheckup: UploadTemplate = (ctx) => ({
  overallSummary: `${ctx.place}에서 받은 건강검진 결과예요. 빈혈·백혈구·혈소판 검사와 콩팥 기능은 정상이에요. 당화혈색소 6.8%, 공복혈당 126mg/dL와 함께 중성지방·간 수치(ALT)가 참고치보다 조금 높게 나왔어요. 다음 진료 때 결과지를 보여 드리고 함께 확인해 보세요.`,
  diagnoses: [
    {
      condition: 'dm',
      originalTerm: '유질환자(당뇨병)',
      status: 'confirmed',
      plainExplanation: '이미 진단받아 치료 중인 당뇨병이에요. 이번 검진에서 혈당이 참고치보다 조금 높게 나왔어요.',
    },
    {
      condition: 'dyslipidemia',
      originalTerm: '이상지질혈증',
      status: 'confirmed',
      plainExplanation: '중성지방이 참고치보다 조금 높아요. 나쁜 콜레스테롤(LDL)은 참고치 범위 안이에요.',
    },
    {
      condition: 'liver_enzyme',
      originalTerm: '간기능 이상',
      status: 'suspected',
      plainExplanation:
        '간 수치(ALT)가 참고치보다 조금 높아요. 지방간·음주·약물 등 여러 원인이 있을 수 있어 담당 의료진과 함께 확인이 필요해요.',
    },
  ],
  labs: [
    { code: 'WBC', value: 7.2 },
    { code: 'HB', value: 14.2 },
    { code: 'PLT', value: 226 },
    { code: 'GLU', value: 126, originalName: '공복혈당' },
    { code: 'HBA1C', value: 6.8, originalName: '당화혈색소' },
    { code: 'TG', value: 162, originalName: '트리글리세라이드' },
    { code: 'LDL', value: 88, originalName: 'LDL 콜레스테롤' },
    { code: 'AST', value: 31 },
    { code: 'ALT', value: 44 },
    { code: 'GGT', value: 58, originalName: '감마지티피' },
    { code: 'CREAT', value: 1.03, originalName: '혈청 크레아티닌' },
    { code: 'EGFR', value: 81, originalName: 'e-GFR' },
  ],
  medications: [],
  sentences: [
    {
      section: '검진 정보',
      original: `${ctx.hospitalName} 건강검진 결과통보서 (검진일 ${ctx.dateLabel})`,
      plain: '건강검진을 받은 기관과 날짜예요.',
      confidence: 0.96,
    },
    {
      section: '혈액 검사',
      original: 'WBC 7.2 ×10³/µL, Hb 14.2 g/dL, PLT 226 ×10³/µL',
      plain: '백혈구·혈색소·혈소판이 모두 정상이에요.',
      terms: [
        { term: 'WBC', meaning: '백혈구(White Blood Cell)' },
        { term: 'Hb', meaning: '혈색소(헤모글로빈)' },
        { term: 'PLT', meaning: '혈소판(Platelet)' },
      ],
      confidence: 0.95,
      related: ['lab:WBC', 'lab:HB', 'lab:PLT'],
    },
    {
      section: '당뇨병 검사',
      original: '공복혈당 126 mg/dL ↑',
      plain: '공복혈당이 참고치보다 높아요. 검사 전날 식사나 수면 상태에 따라서도 달라질 수 있어요.',
      terms: [{ term: '↑', meaning: '참고치보다 높음 표시' }],
      confidence: 0.93,
      related: ['lab:GLU', 'dx:dm'],
    },
    {
      section: '당뇨병 검사',
      original: '당화혈색소 6.8 % ↑',
      plain: '최근 2~3개월 평균 혈당을 보여 주는 당화혈색소가 참고치보다 조금 높아요.',
      terms: [{ term: '당화혈색소', meaning: '최근 2~3개월 평균 혈당을 반영하는 검사(HbA1c)' }],
      confidence: 0.95,
      related: ['lab:HBA1C', 'dx:dm'],
    },
    {
      section: '이상지질혈증 검사',
      original: '트리글리세라이드 162 mg/dL ↑, LDL 콜레스테롤 88 mg/dL',
      plain: '중성지방은 참고치보다 조금 높고, 나쁜 콜레스테롤(LDL)은 정상이에요.',
      terms: [{ term: '트리글리세라이드', meaning: '중성지방의 다른 이름' }],
      confidence: 0.92,
      related: ['lab:TG', 'lab:LDL', 'dx:dyslipidemia'],
    },
    {
      section: '간장질환 검사',
      original: 'AST 31, ALT 44 ↑, 감마지티피 58 U/L',
      plain: 'ALT가 참고치보다 조금 높고, AST와 감마지티피는 정상이에요.',
      terms: [{ term: '감마지티피', meaning: 'γ-GTP. 음주·지방간 등에 영향을 받는 간 효소' }],
      confidence: 0.9,
      related: ['lab:AST', 'lab:ALT', 'lab:GGT', 'dx:liver_enzyme'],
    },
    {
      section: '신장질환 검사',
      original: '혈청 크레아티닌 1.03 mg/dL, e-GFR 81',
      plain: '콩팥 기능은 정상이에요.',
      terms: [TERM.eGfrDash],
      confidence: 0.94,
      related: ['lab:CREAT', 'lab:EGFR'],
    },
    {
      section: '요검사',
      original: '요단백 음성(-)',
      plain: '소변에서 단백질이 나오지 않았다는 뜻이에요.',
      terms: [
        { term: '요단백', meaning: '소변 속 단백질' },
        { term: '음성', meaning: '검사에서 해당 성분이 발견되지 않음' },
      ],
      confidence: 0.66,
    },
    {
      section: '종합 판정',
      original: '판정: 유질환자(당뇨병), 이상지질혈증·간기능 이상 — 생활습관 관리 및 추적검사 필요',
      plain: '당뇨병으로 치료 중이고, 중성지방과 간 수치가 조금 높아 생활습관 관리와 추적 검사가 필요하다는 판정이에요.',
      terms: [
        { term: '유질환자', meaning: '검진 대상 질환을 이미 진단받아 치료 중인 사람' },
        { term: '추적검사', meaning: '시간 간격을 두고 다시 하는 검사' },
      ],
      confidence: 0.86,
      related: ['dx:dm', 'dx:dyslipidemia', 'dx:liver_enzyme'],
    },
    {
      section: '의사 소견',
      original: '주치의와 상담하여 정기적인 진료 및 검사를 받으십시오.',
      plain: '다니는 병원에서 정기적으로 진료와 검사를 받으라는 검진 의사의 의견이에요.',
      terms: [{ term: '주치의', meaning: '평소 진료를 맡고 있는 의사' }],
      confidence: 0.62,
    },
  ],
  suggestedQuestions: [
    '공복혈당이 126까지 올라간 이유가 무엇일까요?',
    '간 수치(ALT)가 다시 올라간 이유가 무엇일까요?',
    '중성지방이 높을 때 특히 피해야 할 음식이 있나요?',
    '다음 건강검진 전까지 따로 받아야 할 검사가 있나요?',
  ],
});

/* ------------------------------------------------------------------ */
/* 처방전                                                              */
/* ------------------------------------------------------------------ */

const SITAGLIPTIN_LINE = '자누비아정100mg(시타글립틴인산염수화물) 1 / 1 / 90';
const ATORVASTATIN_LINE = '리피토정10mg(아토르바스타틴칼슘삼수화물) 1 / 1 / 90';

const SITAGLIPTIN_RX: MedicationSpec = {
  drug: 'sitagliptin',
  originalText: SITAGLIPTIN_LINE,
  dose: '1정',
  frequency: '하루 1번, 아침 식사 후',
  durationDays: 90,
};

const ATORVASTATIN_RX: MedicationSpec = {
  drug: 'atorvastatin',
  originalText: ATORVASTATIN_LINE,
  dose: '1정',
  frequency: '하루 1번, 저녁 식사 후',
  durationDays: 90,
};

const SITAGLIPTIN_SENTENCE: SentenceSpec = {
  section: '처방 의약품',
  original: SITAGLIPTIN_LINE,
  plain: '시타글립틴 100mg을 1회 1정, 하루 1번, 90일 동안 먹는다는 뜻이에요.',
  terms: [dosingColumnsTerm('1 / 1 / 90')],
  confidence: 0.91,
  related: ['med:sitagliptin'],
};

const ATORVASTATIN_SENTENCE: SentenceSpec = {
  section: '처방 의약품',
  original: ATORVASTATIN_LINE,
  plain: '아토르바스타틴 10mg을 1회 1정, 하루 1번, 90일 동안 먹는다는 뜻이에요.',
  terms: [dosingColumnsTerm('1 / 1 / 90')],
  confidence: 0.9,
  related: ['med:atorvastatin'],
};

const PRESCRIPTION_DIAGNOSES: AnalysisSpec['diagnoses'] = [
  {
    condition: 'dm',
    originalTerm: '질병분류기호 E11.9',
    status: 'confirmed',
    plainExplanation: '처방전에 적힌 질병 코드로, 당뇨약을 처방한 이유인 제2형 당뇨병이에요.',
  },
  {
    condition: 'dyslipidemia',
    originalTerm: '질병분류기호 E78.5',
    status: 'confirmed',
    plainExplanation: '처방전에 적힌 질병 코드로, 콜레스테롤약을 처방한 이유인 이상지질혈증이에요.',
  },
];

/** 처방전 ①: 정기 처방 (당뇨약 2 + 콜레스테롤약 1) */
const regularPrescription: UploadTemplate = (ctx) => {
  const metforminLine = '다이아벡스정500mg(메트포르민염산염) 1 / 2 / 90';
  return {
    overallSummary: `${ctx.place}에서 발급한 처방전이에요. 당뇨약 2가지(메트포르민, 시타글립틴)와 콜레스테롤약 1가지(아토르바스타틴)가 90일분 처방되었어요. 약마다 먹는 횟수와 시간이 달라 복용 방법을 확인해 두면 좋아요.`,
    diagnoses: PRESCRIPTION_DIAGNOSES,
    labs: [],
    medications: [
      {
        drug: 'metformin',
        originalText: metforminLine,
        dose: '1정',
        frequency: '하루 2번, 아침·저녁 식사 직후',
        durationDays: 90,
      },
      SITAGLIPTIN_RX,
      ATORVASTATIN_RX,
    ],
    sentences: [
      prescriptionHeader(ctx),
      PRESCRIPTION_DISEASE_CODES,
      {
        section: '처방 의약품',
        original: metforminLine,
        plain: '메트포르민 500mg을 1회 1정, 하루 2번, 90일 동안 먹는다는 뜻이에요.',
        terms: [dosingColumnsTerm('1 / 2 / 90')],
        confidence: 0.92,
        related: ['med:metformin'],
      },
      SITAGLIPTIN_SENTENCE,
      ATORVASTATIN_SENTENCE,
      {
        section: '용법',
        original: '다이아벡스: 1일 2회 아침·저녁 식후 즉시 / 자누비아: 1일 1회 아침 식후 / 리피토: 1일 1회 저녁 식후',
        plain: '약마다 먹는 시간이 달라요. 메트포르민은 아침·저녁 식사 직후, 시타글립틴은 아침 식사 후, 아토르바스타틴은 저녁 식사 후에 먹어요.',
        terms: [{ term: '식후 즉시', meaning: '식사를 마친 바로 뒤' }],
        confidence: 0.78,
        related: ['med:metformin', 'med:sitagliptin', 'med:atorvastatin'],
      },
      {
        section: '조제 시 참고사항',
        original: '메트포르민: 조영제 사용 검사 전후 복용 여부 의사와 상의',
        plain: '조영제를 쓰는 CT 같은 검사를 받기 전후에는 이 약을 계속 먹어도 되는지 의사와 상의하라는 안내예요.',
        terms: [{ term: '조영제', meaning: '검사 사진이 잘 보이도록 몸에 넣는 약' }],
        confidence: 0.64,
        related: ['med:metformin'],
      },
      PRESCRIPTION_VALIDITY,
    ],
    suggestedQuestions: [
      '세 가지 약을 한꺼번에 먹어도 괜찮나요?',
      '약 먹는 것을 깜빡했을 때는 어떻게 해야 하나요?',
      '감기약이나 진통제를 함께 먹어도 되나요?',
      '다음 진료가 늦어져 약이 떨어지면 어떻게 하나요?',
    ],
  };
};

/** 처방전 ②: 메트포르민을 하루 1번 먹는 서방정으로 바꾼 처방 */
const extendedReleaseSwitch: UploadTemplate = (ctx) => {
  const metforminXrLine = '다이아벡스엑스알서방정1000mg(메트포르민염산염) 1 / 1 / 90';
  return {
    overallSummary: `${ctx.place}에서 발급한 처방전이에요. 하루 2번 먹던 메트포르민이 하루 1번 먹는 서방정(천천히 녹는 약)으로 바뀌었고, 시타글립틴과 아토르바스타틴은 그대로예요. 약이 바뀐 만큼 먹는 시간과 방법을 다시 확인해 두세요.`,
    diagnoses: PRESCRIPTION_DIAGNOSES,
    labs: [],
    medications: [
      {
        drug: 'metformin_xr',
        originalText: metforminXrLine,
        dose: '1정',
        frequency: '하루 1번, 저녁 식사 직후',
        durationDays: 90,
      },
      SITAGLIPTIN_RX,
      ATORVASTATIN_RX,
    ],
    sentences: [
      prescriptionHeader(ctx),
      PRESCRIPTION_DISEASE_CODES,
      {
        section: '처방 의약품',
        original: metforminXrLine,
        plain: '메트포르민 서방정 1000mg을 1회 1정, 하루 1번, 90일 동안 먹는다는 뜻이에요.',
        terms: [
          { term: '서방정', meaning: '약 성분이 천천히 나오도록 만든 알약' },
          dosingColumnsTerm('1 / 1 / 90'),
        ],
        confidence: 0.89,
        related: ['med:metformin_xr'],
      },
      SITAGLIPTIN_SENTENCE,
      ATORVASTATIN_SENTENCE,
      {
        section: '용법',
        original: '다이아벡스XR: 1일 1회 저녁 식사 직후, 분할·분쇄 금지',
        plain: '메트포르민 서방정은 하루 1번 저녁 식사 직후에 먹고, 쪼개거나 씹지 말고 통째로 삼켜야 해요.',
        terms: [{ term: '분할·분쇄 금지', meaning: '쪼개거나 갈지 말 것' }],
        confidence: 0.82,
        related: ['med:metformin_xr'],
      },
      {
        section: '처방 메모',
        original: 'Metformin IR 500mg bid → XR 1000mg qd 변경 (복약 편의)',
        plain: '하루 2번 먹던 메트포르민(속방정)을 하루 총량은 같게(1000mg) 하면서 하루 1번 먹는 서방정으로 바꿨다는 메모예요.',
        terms: [
          { term: 'IR', meaning: '속방형(Immediate Release). 먹으면 바로 녹는 약' },
          { term: 'XR', meaning: '서방형(Extended Release). 천천히 녹도록 만든 약' },
          TERM.bid,
          TERM.qd,
        ],
        confidence: 0.69,
        related: ['med:metformin_xr'],
      },
      PRESCRIPTION_VALIDITY,
    ],
    suggestedQuestions: [
      '서방정으로 바꾸면 효과나 부작용이 달라지나요?',
      '저녁을 늦게 먹는 날에는 서방정을 언제 먹으면 되나요?',
      '집에 남은 500mg 알약은 어떻게 하면 되나요?',
      '약이 바뀐 뒤 특히 살펴봐야 할 증상이 있나요?',
    ],
  };
};

/* ------------------------------------------------------------------ */
/* 선택                                                                */
/* ------------------------------------------------------------------ */

const MEDICAL_RECORD_TEMPLATES: readonly UploadTemplate[] = [routineFollowUp, liverAndBloodPressureFollowUp];
const LAB_RESULT_TEMPLATES: readonly UploadTemplate[] = [routineBloodTest, healthCheckup];
const PRESCRIPTION_TEMPLATES: readonly UploadTemplate[] = [regularPrescription, extendedReleaseSwitch];

function templatesFor(documentType: DocumentType): readonly UploadTemplate[] {
  switch (documentType) {
    case 'lab_result':
      return LAB_RESULT_TEMPLATES;
    case 'prescription':
      return PRESCRIPTION_TEMPLATES;
    case 'medical_record':
    case 'opinion':
    case 'discharge_summary':
    case 'other':
      return MEDICAL_RECORD_TEMPLATES;
  }
}

/** 문서 종류별 템플릿 개수 (테스트에서 모든 변형을 확인할 때 사용) */
export function uploadTemplateCount(documentType: DocumentType): number {
  return templatesFor(documentType).length;
}

/** 문서 종류에 맞는 템플릿을 업로드 순번으로 순환 선택 (음수·소수·NaN 도 안전하게 처리) */
export function pickUploadTemplate(documentType: DocumentType, templateIndex: number): UploadTemplate {
  const templates = templatesFor(documentType);
  const whole = Number.isFinite(templateIndex) ? Math.trunc(templateIndex) : 0;
  const index = whole % templates.length;
  return templates[index < 0 ? index + templates.length : index];
}
