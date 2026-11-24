/**
 * 시연용 가상 환자 이야기 (시드 데이터).
 *
 * 50대 남성(가상 인물)이 1년 동안 모은 진료 문서를 시간순으로 구성했다.
 * 병원 이름은 모두 가상이며 실제 환자·의료기관과 관계없다.
 *
 * 2025-11  바른숲내과의원 · 첫 진료기록      제2형 당뇨병(HbA1c 8.1%)·이상지질혈증 진단, 지방간 의심
 * 2026-02  바른숲내과의원 · 3개월 추적 진료   HbA1c 7.4%, 초음파로 지방간 확인, 시타글립틴 추가
 * 2026-06  한결가정의학과의원 · 건강검진     HbA1c 6.9%, 간 수치 정상화, 고혈압 전단계 의심
 * 2026-10  새빛종합병원 · 내분비내과 소견서   HbA1c 6.6%, 합병증 없음, 고혈압 전단계 관찰
 * (최근)   바른숲내과의원 · 처방전 사진       흐린 사진으로 글자 인식 실패 → 다시 촬영 안내
 *
 * 검사 코드(HBA1C, LDL …)를 문서끼리 공유해 검사 추이·타임라인이 하나의 흐름으로 이어진다.
 */
import { toDateString } from '@/lib/format';
import type { IsoDateTime, MedicalDocument, Question } from '@/types/domain';

import type { AnalysisSpec } from './builder';

/** 한국 시간(KST) 'YYYY-MM-DD', 'HH:mm:ss' → ISO 8601 (UTC) */
function kst(date: string, time: string): IsoDateTime {
  return new Date(`${date}T${time}+09:00`).toISOString();
}

export interface StoryDocument {
  /** 항목·문장 id 에 쓰는 접미어 (예: '2025_11' → 'lab_2025_11_hba1c') */
  tag: string;
  document: Pick<
    MedicalDocument,
    | 'id'
    | 'title'
    | 'documentType'
    | 'hospitalName'
    | 'department'
    | 'visitDate'
    | 'source'
    | 'pageCount'
    | 'createdAt'
  >;
  /** AI 해설 생성 완료 시각 (= 문서 updatedAt) */
  analyzedAt: IsoDateTime;
  analysis: AnalysisSpec;
}

/* ------------------------------------------------------------------ */
/* 1. 2025-11 첫 진료기록                                               */
/* ------------------------------------------------------------------ */

const FIRST_VISIT: StoryDocument = {
  tag: '2025_11',
  document: {
    id: 'doc_2025_11',
    title: '바른숲내과의원 · 첫 진료기록',
    documentType: 'medical_record',
    hospitalName: '바른숲내과의원',
    department: '내과',
    visitDate: '2025-11-20',
    source: 'camera',
    pageCount: 2,
    createdAt: kst('2025-11-20', '19:42:06'),
  },
  analyzedAt: kst('2025-11-20', '19:42:18'),
  analysis: {
    overallSummary:
      '건강검진에서 혈당이 높다는 말을 듣고 처음 방문한 진료기록이에요. 당화혈색소 8.1%로 제2형 당뇨병을 진단받았고, 콜레스테롤 수치가 높아 이상지질혈증도 함께 확인되었어요. 간 수치가 조금 높아 지방간이 의심되어 복부 초음파 검사를 받기로 했어요. 혈당약(메트포르민)과 콜레스테롤약(아토르바스타틴)을 시작하고 3개월 뒤 다시 검사해요.',
    diagnoses: [
      {
        condition: 'dm',
        originalTerm: 'Type 2 DM, uncontrolled',
        status: 'confirmed',
        plainExplanation:
          '몸에서 인슐린이 제대로 작용하지 않아 혈당이 높게 유지되는 병이에요. 당화혈색소 8.1%로 아직 혈당 조절이 충분하지 않아, 약과 식사·운동 관리를 함께 시작했어요.',
      },
      {
        condition: 'dyslipidemia',
        originalTerm: 'Dyslipidemia',
        status: 'confirmed',
        plainExplanation:
          '혈액 속 콜레스테롤이나 중성지방이 너무 많거나, 좋은 콜레스테롤이 너무 적은 상태예요. 혈관이 좁아지는 동맥경화 위험을 높일 수 있어 당뇨병이 있으면 더 꼼꼼히 관리해요.',
      },
      {
        condition: 'nafld',
        originalTerm: 'Fatty liver, r/o NAFLD',
        status: 'suspected',
        plainExplanation:
          '과음이 주된 원인이 아닌데도 간에 지방이 쌓이는 상태로, 비만·당뇨병과 관련이 깊어요. 간 수치가 조금 높아 의심하고 있으며, 복부 초음파로 확인할 예정이에요.',
      },
      {
        condition: 'ureteral_stone',
        originalTerm: 'Rt. ureteral stone s/p ESWL (2019)',
        status: 'history',
        plainExplanation:
          '2019년에 치료를 마친 과거 병력이에요. 이번 진료의 주된 문제는 아니지만 참고로 기록되어 있어요.',
      },
    ],
    labs: [
      { code: 'HBA1C', value: 8.1, note: '첫 진료 결과로, 앞으로 이 값을 기준으로 변화를 살펴봐요.' },
      { code: 'GLU', value: 168 },
      { code: 'TC', value: 252, originalName: 'T-chol' },
      { code: 'LDL', value: 171 },
      { code: 'HDL', value: 38 },
      { code: 'TG', value: 218 },
      { code: 'AST', value: 46 },
      { code: 'ALT', value: 58 },
      { code: 'GGT', value: 84, originalName: 'r-GTP' },
      { code: 'CREAT', value: 0.94 },
      { code: 'EGFR', value: 91 },
    ],
    medications: [
      {
        drug: 'metformin',
        originalText: 'Metformin 500mg 1T bid pc',
        dose: '1정',
        frequency: '하루 2번, 아침·저녁 식사 직후',
        durationDays: 90,
      },
      {
        drug: 'atorvastatin',
        originalText: 'Atorvastatin 10mg 1T qd',
        dose: '1정',
        frequency: '하루 1번, 저녁 식사 후',
        durationDays: 90,
      },
    ],
    sentences: [
      {
        section: '주호소',
        original: 'C/C) 건강검진상 FBS 142 mg/dL로 혈당 높다는 소견 듣고 내원함',
        plain: '건강검진에서 공복혈당이 142mg/dL로 높게 나왔다는 이야기를 듣고 병원에 오셨다는 기록이에요.',
        terms: [
          { term: 'C/C', meaning: '주호소(Chief Complaint). 환자가 병원에 온 가장 주된 이유' },
          { term: 'FBS', meaning: '공복혈당(Fasting Blood Sugar). 8시간 이상 금식한 뒤 잰 혈당' },
          { term: '내원', meaning: '병원에 옴' },
        ],
        confidence: 0.95,
      },
      {
        section: '현병력',
        original: 'P/I) 54/M, 약 1년 전부터 polydipsia, polyuria 있었으나 별다른 조치 없이 지냄. 최근 3개월간 체중 약 3kg 감소',
        plain:
          '54세 남성으로, 1년쯤 전부터 물을 많이 마시고 소변을 자주 보는 증상이 있었지만 따로 치료받지 않았고, 최근 3개월 동안 몸무게가 3kg쯤 줄었다는 내용이에요. 혈당이 높을 때 흔히 나타나는 증상이에요.',
        terms: [
          { term: 'P/I', meaning: '현병력(Present Illness). 지금 문제가 언제 시작되어 어떻게 진행됐는지' },
          { term: '54/M', meaning: '54세 남성(Male)' },
          { term: 'polydipsia', meaning: '다음(多飮). 목이 말라 물을 많이 마시는 증상' },
          { term: 'polyuria', meaning: '다뇨(多尿). 소변을 자주, 많이 보는 증상' },
        ],
        confidence: 0.88,
        related: ['dx:dm'],
      },
      {
        section: '과거력',
        original: 'PHx) DM(-), HTN(-), hepatitis(-). 2019년 Rt. ureteral stone s/p ESWL',
        plain:
          '이전에 당뇨병·고혈압·간염을 진단받은 적은 없고, 2019년에 오른쪽 요관결석을 몸 밖에서 충격파로 깨는 치료를 받았다는 기록이에요.',
        terms: [
          { term: 'PHx', meaning: '과거력(Past History). 예전에 앓았던 병이나 수술' },
          { term: 'DM', meaning: '당뇨병(Diabetes Mellitus)' },
          { term: 'HTN', meaning: '고혈압(Hypertension)' },
          { term: '(-)', meaning: '해당 없음(음성)' },
          { term: 'Rt.', meaning: '오른쪽(Right)' },
          { term: 's/p', meaning: '~을 받은 뒤(status post)' },
          { term: 'ESWL', meaning: '체외충격파쇄석술. 몸 밖에서 충격파를 보내 결석을 잘게 부수는 치료' },
        ],
        confidence: 0.66,
        related: ['dx:ureteral_stone'],
      },
      {
        section: '사회력',
        original: 'SHx) 음주 주 2~3회 소주 1병, smoking(-). FHx) 부: DM',
        plain:
          '술은 일주일에 2~3번, 한 번에 소주 1병 정도 마시고 담배는 피우지 않으며, 아버지가 당뇨병이 있다는 내용이에요. 가족 중에 당뇨병이 있으면 당뇨병이 생길 위험이 더 높아요.',
        terms: [
          { term: 'SHx', meaning: '사회력(Social History). 음주·흡연 같은 생활 습관' },
          { term: 'smoking', meaning: '흡연' },
          { term: 'FHx', meaning: '가족력(Family History). 가족이 앓았던 병' },
        ],
        confidence: 0.86,
      },
      {
        section: '신체검진',
        original: 'V/S) BP 126/78 mmHg, Ht 172.4 cm, Wt 83.6 kg, BMI 28.1 kg/m²',
        plain:
          '혈압은 126/78mmHg이고, 키와 몸무게로 계산한 체질량지수(BMI)는 28.1로 비만 범위(25 이상)에 해당해요.',
        terms: [
          { term: 'V/S', meaning: '활력징후(Vital Signs). 혈압·맥박·체온 같은 기본 측정값' },
          { term: 'BP', meaning: '혈압(Blood Pressure)' },
          { term: 'BMI', meaning: '체질량지수. 몸무게(kg)를 키(m)의 제곱으로 나눈 비만 지표' },
        ],
        confidence: 0.93,
      },
      {
        section: '검사 결과',
        original: 'Lab) HbA1c 8.1%, FBS 168 mg/dL',
        plain:
          '최근 2~3개월 평균 혈당을 보여 주는 당화혈색소가 8.1%, 공복혈당이 168mg/dL로 모두 기준보다 높아요. 당뇨병 진단 기준(당화혈색소 6.5% 이상 또는 공복혈당 126mg/dL 이상)을 넘는 수치예요.',
        terms: [
          { term: 'HbA1c', meaning: '당화혈색소. 최근 2~3개월 평균 혈당을 반영하는 검사' },
          { term: 'FBS', meaning: '공복혈당' },
        ],
        confidence: 0.97,
        related: ['lab:HBA1C', 'lab:GLU', 'dx:dm'],
      },
      {
        section: '검사 결과',
        original: 'Lipid) T-chol 252, LDL-C 171, HDL-C 38, TG 218 mg/dL',
        plain:
          '총콜레스테롤·나쁜 콜레스테롤(LDL)·중성지방은 기준보다 높고, 좋은 콜레스테롤(HDL)은 기준보다 낮아요. 이런 상태를 이상지질혈증이라고 해요.',
        terms: [
          { term: 'T-chol', meaning: '총콜레스테롤(Total Cholesterol)' },
          { term: 'LDL-C', meaning: "저밀도 지단백 콜레스테롤. 흔히 '나쁜 콜레스테롤'" },
          { term: 'HDL-C', meaning: "고밀도 지단백 콜레스테롤. 흔히 '좋은 콜레스테롤'" },
          { term: 'TG', meaning: '중성지방(Triglyceride)' },
        ],
        confidence: 0.96,
        related: ['lab:TC', 'lab:LDL', 'lab:HDL', 'lab:TG', 'dx:dyslipidemia'],
      },
      {
        section: '검사 결과',
        original: 'LFT) AST/ALT 46/58 IU/L, r-GTP 84 IU/L로 경도 상승',
        plain:
          '간세포가 손상될 때 올라가는 간 수치(AST·ALT)와 감마지티피가 기준보다 조금 높아요. 지방간이나 음주가 원인일 수 있어 추가 확인이 필요해요.',
        terms: [
          { term: 'LFT', meaning: '간기능 검사(Liver Function Test)' },
          { term: 'r-GTP', meaning: '감마지티피(γ-GTP). 음주·지방간 등에 영향을 받는 간 효소' },
          { term: '경도', meaning: '가벼운 정도' },
        ],
        confidence: 0.82,
        related: ['lab:AST', 'lab:ALT', 'lab:GGT', 'dx:nafld'],
      },
      {
        section: '검사 결과',
        original: 'Cr 0.94 mg/dL, eGFR 91 mL/min/1.73m²',
        plain:
          '콩팥 기능을 보여 주는 크레아티닌과 사구체여과율(eGFR)은 정상이에요. 메트포르민 같은 당뇨약을 시작하기 전에 꼭 확인하는 검사예요.',
        terms: [
          { term: 'Cr', meaning: '크레아티닌. 콩팥으로 걸러지는 노폐물' },
          { term: 'eGFR', meaning: '추정 사구체여과율. 콩팥이 노폐물을 거르는 능력' },
        ],
        confidence: 0.95,
        related: ['lab:CREAT', 'lab:EGFR'],
      },
      {
        section: '진단',
        original: 'Imp) #1. Type 2 DM, uncontrolled #2. Dyslipidemia #3. Fatty liver, r/o NAFLD',
        plain:
          '의사의 판단은 ① 아직 조절이 잘 되지 않는 제2형 당뇨병, ② 이상지질혈증, ③ 비알코올 지방간 의심이에요.',
        terms: [
          { term: 'Imp', meaning: '임상적 판단(Impression). 의사가 내린 진단 소견' },
          { term: 'Type 2 DM', meaning: '제2형 당뇨병' },
          { term: 'uncontrolled', meaning: '조절되지 않는 상태' },
          { term: 'Dyslipidemia', meaning: '이상지질혈증' },
          { term: 'r/o', meaning: '가능성이 있어 확인이 필요함(rule out)' },
          { term: 'NAFLD', meaning: '비알코올 지방간질환' },
        ],
        confidence: 0.9,
        related: ['dx:dm', 'dx:dyslipidemia', 'dx:nafld'],
      },
      {
        section: '처방',
        original: 'Rx) Metformin 500mg 1T bid pc, 90일분',
        plain: '혈당을 낮추는 메트포르민 500mg을 하루 2번, 식사 직후에 1알씩 90일 동안 먹도록 처방했어요.',
        terms: [
          { term: 'Rx', meaning: '처방' },
          { term: '1T', meaning: '1정(한 알)' },
          { term: 'bid', meaning: '하루 두 번' },
          { term: 'pc', meaning: '식후(식사 후에)' },
        ],
        confidence: 0.94,
        related: ['med:metformin'],
      },
      {
        section: '처방',
        original: 'Atorvastatin 10mg 1T qd, 90일분',
        plain: '콜레스테롤을 낮추는 아토르바스타틴 10mg을 하루 1번 1알씩 90일 동안 먹도록 처방했어요.',
        terms: [{ term: 'qd', meaning: '하루 한 번' }],
        confidence: 0.94,
        related: ['med:atorvastatin'],
      },
      {
        section: '향후 계획',
        original: 'Plan) 식이·운동 교육, 절주 권고. Abd. US 예정 (fatty liver 확인)',
        plain:
          '식사 조절과 운동 방법을 안내받았고, 술을 줄이도록 권고받았어요. 지방간이 있는지 확인하려고 복부 초음파 검사를 하기로 했어요.',
        terms: [
          { term: '절주', meaning: '술을 줄임' },
          { term: 'Abd. US', meaning: '복부 초음파 검사(Abdominal Ultrasonography)' },
          { term: 'fatty liver', meaning: '지방간' },
        ],
        confidence: 0.86,
        related: ['dx:nafld'],
      },
      {
        section: '향후 계획',
        original: '3개월 후 f/u, HbA1c·lipid·LFT f/u lab',
        plain: '3개월 뒤 다시 방문해 당화혈색소·콜레스테롤·간 수치를 다시 검사하기로 했어요.',
        terms: [
          { term: 'f/u', meaning: '추적 관찰(follow-up). 경과를 보려고 다시 방문' },
          { term: 'lipid', meaning: '콜레스테롤·중성지방 같은 지질 검사' },
        ],
        confidence: 0.91,
      },
    ],
    suggestedQuestions: [
      '당뇨약을 평생 먹어야 하나요?',
      '당화혈색소는 몇 %까지 낮추는 것을 목표로 하면 될까요?',
      '메트포르민을 먹고 속이 불편하면 어떻게 해야 하나요?',
      '운동은 어떤 종류를 일주일에 얼마나 하면 좋을까요?',
      '콜레스테롤 약이 혈당에 영향을 주지는 않나요?',
    ],
  },
};

/* ------------------------------------------------------------------ */
/* 2. 2026-02 3개월 추적 진료                                           */
/* ------------------------------------------------------------------ */

const FOLLOW_UP: StoryDocument = {
  tag: '2026_02',
  document: {
    id: 'doc_2026_02',
    title: '바른숲내과의원 · 3개월 추적 진료',
    documentType: 'medical_record',
    hospitalName: '바른숲내과의원',
    department: '내과',
    visitDate: '2026-02-24',
    source: 'gallery',
    pageCount: 1,
    createdAt: kst('2026-02-24', '20:15:07'),
  },
  analyzedAt: kst('2026-02-24', '20:15:19'),
  analysis: {
    overallSummary:
      '첫 진료 3개월 뒤 다시 방문한 추적 진료기록이에요. 당화혈색소가 8.1%에서 7.4%로, 나쁜 콜레스테롤(LDL)이 171에서 98로 내려가 치료 효과가 나타나고 있어요. 복부 초음파에서 가벼운 지방간이 확인되었어요. 혈당을 조금 더 낮추기 위해 시타글립틴(자누비아)이 추가되었어요.',
    diagnoses: [
      {
        condition: 'dm',
        originalTerm: 'T2DM, improving',
        status: 'confirmed',
        plainExplanation:
          '약과 생활습관 관리로 혈당이 좋아지고 있어요. 당화혈색소가 8.1%에서 7.4%로 내려갔지만 목표까지는 더 낮출 필요가 있어 당뇨약이 하나 추가되었어요.',
      },
      {
        condition: 'dyslipidemia',
        originalTerm: 'Dyslipidemia',
        status: 'confirmed',
        plainExplanation:
          '콜레스테롤약을 먹은 뒤 나쁜 콜레스테롤(LDL)이 크게 줄었어요. 중성지방은 아직 조금 높아 식사·운동 관리가 계속 필요해요.',
      },
      {
        condition: 'nafld',
        originalTerm: 'NAFLD, mild',
        status: 'confirmed',
        plainExplanation:
          '복부 초음파로 가벼운 지방간이 확인되었어요. 체중을 줄이고 술을 끊거나 줄이면 좋아지는 경우가 많아요.',
      },
    ],
    labs: [
      { code: 'HBA1C', value: 7.4, note: '첫 진료(8.1%) 때보다 0.7%p 내려왔어요.' },
      { code: 'GLU', value: 129, note: '첫 진료(168mg/dL) 때보다 내려왔어요.' },
      { code: 'TC', value: 174, originalName: 'T-chol' },
      { code: 'LDL', value: 98, note: '첫 진료(171mg/dL) 때보다 크게 내려왔어요.' },
      { code: 'HDL', value: 41 },
      { code: 'TG', value: 176 },
      { code: 'AST', value: 35 },
      { code: 'ALT', value: 47 },
      { code: 'GGT', value: 61, originalName: 'r-GTP' },
    ],
    medications: [
      {
        drug: 'metformin',
        originalText: 'Metformin 500mg 1T bid pc',
        dose: '1정',
        frequency: '하루 2번, 아침·저녁 식사 직후',
        durationDays: 90,
      },
      {
        drug: 'sitagliptin',
        originalText: 'Sitagliptin 100mg 1T qd',
        dose: '1정',
        frequency: '하루 1번, 아침 식사 후',
        durationDays: 90,
      },
      {
        drug: 'atorvastatin',
        originalText: 'Atorvastatin 10mg 1T qd',
        dose: '1정',
        frequency: '하루 1번, 저녁 식사 후',
        durationDays: 90,
      },
    ],
    sentences: [
      {
        section: '주호소',
        original: 'C/C) DM, dyslipidemia f/u. 특이 증상 없음',
        plain: '당뇨병과 이상지질혈증 치료 경과를 보려고 다시 방문했고, 특별히 불편한 증상은 없다는 기록이에요.',
        terms: [
          { term: 'DM', meaning: '당뇨병(Diabetes Mellitus)' },
          { term: 'dyslipidemia', meaning: '이상지질혈증' },
          { term: 'f/u', meaning: '추적 관찰(follow-up). 경과를 보려고 다시 방문' },
        ],
        confidence: 0.94,
        related: ['dx:dm', 'dx:dyslipidemia'],
      },
      {
        section: '현병력',
        original: '복약 순응도 양호. 초기 GI upset 있었으나 2주 후 호전',
        plain:
          '약을 빠뜨리지 않고 잘 먹고 있고, 처음에 있던 속 불편함은 2주쯤 지나 좋아졌다는 내용이에요. 메트포르민을 처음 먹을 때 흔히 생기는 증상이에요.',
        terms: [
          { term: '순응도', meaning: '처방대로 약을 잘 챙겨 먹는 정도' },
          { term: 'GI upset', meaning: '위장 장애. 속쓰림·더부룩함·설사 등' },
          { term: '호전', meaning: '증상이 좋아짐' },
        ],
        confidence: 0.89,
        related: ['med:metformin'],
      },
      {
        section: '신체검진',
        original: 'BW 81.2 kg (-2.4 kg), BP 124/78 mmHg',
        plain: '몸무게가 지난번보다 2.4kg 줄어 81.2kg이고, 혈압은 124/78mmHg로 측정되었어요.',
        terms: [
          { term: 'BW', meaning: '체중(Body Weight)' },
          { term: 'BP', meaning: '혈압(Blood Pressure)' },
        ],
        confidence: 0.67,
      },
      {
        section: '검사 결과',
        original: 'HbA1c 7.4% (← 8.1%), FBS 129 mg/dL',
        plain:
          '당화혈색소가 8.1%에서 7.4%로 내려가 혈당이 좋아지고 있어요. 다만 아직 흔히 쓰는 관리 목표(6.5% 미만)보다는 높아요.',
        terms: [
          { term: 'HbA1c', meaning: '당화혈색소. 최근 2~3개월 평균 혈당을 반영하는 검사' },
          { term: 'FBS', meaning: '공복혈당' },
        ],
        confidence: 0.97,
        related: ['lab:HBA1C', 'lab:GLU', 'dx:dm'],
      },
      {
        section: '검사 결과',
        original: 'T-chol 174, LDL-C 98, HDL-C 41, TG 176 mg/dL',
        plain:
          '나쁜 콜레스테롤(LDL)이 171에서 98로 크게 줄었고, 좋은 콜레스테롤(HDL)도 참고치 범위가 되었어요. 중성지방은 아직 기준보다 조금 높아요.',
        terms: [
          { term: 'LDL-C', meaning: "저밀도 지단백 콜레스테롤. 흔히 '나쁜 콜레스테롤'" },
          { term: 'HDL-C', meaning: "고밀도 지단백 콜레스테롤. 흔히 '좋은 콜레스테롤'" },
          { term: 'TG', meaning: '중성지방(Triglyceride)' },
        ],
        confidence: 0.95,
        related: ['lab:TC', 'lab:LDL', 'lab:HDL', 'lab:TG', 'dx:dyslipidemia'],
      },
      {
        section: '검사 결과',
        original: 'AST/ALT 35/47 IU/L, r-GTP 61 IU/L',
        plain: '간 수치가 지난번보다 내려왔지만, ALT는 아직 기준보다 조금 높아요.',
        terms: [{ term: 'r-GTP', meaning: '감마지티피(γ-GTP). 음주·지방간 등에 영향을 받는 간 효소' }],
        confidence: 0.9,
        related: ['lab:AST', 'lab:ALT', 'lab:GGT'],
      },
      {
        section: '영상 소견',
        original: 'Abd. US (2025.12.09): mild fatty liver, no focal lesion',
        plain:
          "복부 초음파에서 간에 지방이 조금 쌓인 '경도 지방간'이 보였고, 혹 같은 다른 이상은 없었다는 결과예요.",
        terms: [
          { term: 'Abd. US', meaning: '복부 초음파 검사(Abdominal Ultrasonography)' },
          { term: 'mild', meaning: '경도(가벼운 정도)' },
          { term: 'fatty liver', meaning: '지방간' },
          { term: 'focal lesion', meaning: '국소 병변. 혹이나 덩어리 같은 이상' },
        ],
        confidence: 0.92,
        related: ['dx:nafld'],
      },
      {
        section: '진단',
        original: 'Imp) T2DM, improving / Dyslipidemia / NAFLD, mild',
        plain: '제2형 당뇨병은 좋아지는 중이고, 이상지질혈증과 가벼운 비알코올 지방간이 확인되었다는 판단이에요.',
        terms: [
          { term: 'Imp', meaning: '임상적 판단(Impression). 의사가 내린 진단 소견' },
          { term: 'T2DM', meaning: '제2형 당뇨병' },
          { term: 'improving', meaning: '호전 중(좋아지는 중)' },
          { term: 'NAFLD', meaning: '비알코올 지방간질환' },
        ],
        confidence: 0.91,
        related: ['dx:dm', 'dx:dyslipidemia', 'dx:nafld'],
      },
      {
        section: '처방',
        original: 'Rx) Metformin 500mg 1T bid pc 유지',
        plain: '메트포르민은 지금처럼 하루 2번 식사 직후에 1알씩 계속 먹는 처방이에요.',
        terms: [
          { term: 'bid', meaning: '하루 두 번' },
          { term: 'pc', meaning: '식후(식사 후에)' },
          { term: '유지', meaning: '지금 쓰는 약을 그대로 계속 사용' },
        ],
        confidence: 0.95,
        related: ['med:metformin'],
      },
      {
        section: '처방',
        original: 'Sitagliptin 100mg 1T qd 추가',
        plain: '혈당을 조금 더 낮추기 위해 시타글립틴(자누비아) 100mg을 하루 1번 1알 추가했어요.',
        terms: [{ term: 'qd', meaning: '하루 한 번' }],
        confidence: 0.93,
        related: ['med:sitagliptin'],
      },
      {
        section: '처방',
        original: 'Atorvastatin 10mg 1T qd 유지, 각 90일분',
        plain: '콜레스테롤약 아토르바스타틴은 하루 1번 1알을 그대로 유지하고, 약은 모두 90일분 처방했어요.',
        terms: [{ term: 'qd', meaning: '하루 한 번' }],
        confidence: 0.95,
        related: ['med:atorvastatin'],
      },
      {
        section: '향후 계획',
        original: 'Plan) 체중 감량 지속 (목표 -5%), 금주 권고. 3개월 후 f/u',
        plain:
          '몸무게를 지금보다 5% 정도 더 줄이고, 지방간을 위해 술은 끊는 것을 권했어요. 3개월 뒤 다시 진료받기로 했어요.',
        terms: [{ term: 'f/u', meaning: '추적 관찰(follow-up). 경과를 보려고 다시 방문' }],
        confidence: 0.85,
        related: ['dx:nafld'],
      },
      {
        section: '향후 계획',
        original: '6월 국가검진 시 결과지 지참',
        plain: '6월에 받을 국가 건강검진 결과지를 다음 진료 때 가져오라는 내용이에요.',
        terms: [{ term: '지참', meaning: '가지고 옴' }],
        confidence: 0.58,
      },
    ],
    suggestedQuestions: [
      '자누비아를 추가하면 저혈당이 올 수 있나요?',
      '지방간은 약 없이 체중 감량만으로 좋아질 수 있나요?',
      '중성지방을 낮추려면 식사에서 무엇을 가장 줄여야 하나요?',
      '집에서 혈당을 직접 재 봐야 하나요? 잰다면 언제 재는 게 좋을까요?',
      '다음 검사 전에 금식은 몇 시간 해야 하나요?',
    ],
  },
};

/* ------------------------------------------------------------------ */
/* 3. 2026-06 건강검진 결과                                             */
/* ------------------------------------------------------------------ */

const CHECKUP: StoryDocument = {
  tag: '2026_06',
  document: {
    id: 'doc_2026_06',
    title: '한결가정의학과의원 · 건강검진 결과',
    documentType: 'lab_result',
    hospitalName: '한결가정의학과의원',
    department: '가정의학과',
    visitDate: '2026-06-16',
    source: 'pdf',
    pageCount: 4,
    createdAt: kst('2026-06-19', '21:03:44'),
  },
  analyzedAt: kst('2026-06-19', '21:03:57'),
  analysis: {
    overallSummary:
      '2026년 6월에 받은 일반 건강검진 결과예요. 당화혈색소가 6.9%까지 내려왔고 콜레스테롤과 간 수치는 모두 참고치 범위로 돌아왔어요. 혈액(빈혈·백혈구·혈소판)과 콩팥 검사도 정상이에요. 다만 혈압이 134/86mmHg로 고혈압 전단계에 해당해 생활습관 개선과 가정혈압 측정을 권고받았어요.',
    diagnoses: [
      {
        condition: 'dm',
        originalTerm: '유질환자 - 당뇨병 (치료 중)',
        status: 'confirmed',
        plainExplanation:
          '이미 진단받아 치료 중인 당뇨병이에요. 검진 수치로 보면 혈당 조절이 꾸준히 좋아지고 있어요.',
      },
      {
        condition: 'dyslipidemia',
        originalTerm: '유질환자 - 이상지질혈증 (치료 중)',
        status: 'confirmed',
        plainExplanation:
          '치료 중인 이상지질혈증이에요. 이번 검진에서는 콜레스테롤과 중성지방이 모두 참고치 범위 안이었어요.',
      },
      {
        condition: 'prehypertension',
        originalTerm: '고혈압 전단계 (134/86 mmHg)',
        status: 'suspected',
        plainExplanation:
          '혈압이 정상보다 조금 높게 측정되었어요. 고혈압으로 진단된 것은 아니며, 하루 측정값만으로는 판단하기 어려워 집에서 재 보거나 다음 진료 때 다시 확인이 필요해요.',
      },
    ],
    labs: [
      { code: 'HB', value: 14.6, originalName: '혈색소' },
      { code: 'WBC', value: 6.8, originalName: '백혈구' },
      { code: 'PLT', value: 238, originalName: '혈소판' },
      { code: 'GLU', value: 121, originalName: '공복혈당' },
      {
        code: 'HBA1C',
        value: 6.9,
        originalName: '당화혈색소(HbA1c)',
        note: '첫 진료(8.1%) 이후 꾸준히 내려오고 있어요.',
      },
      { code: 'TC', value: 158, originalName: '총콜레스테롤' },
      { code: 'HDL', value: 44, originalName: 'HDL 콜레스테롤' },
      { code: 'TG', value: 148, originalName: '트리글리세라이드', note: '지난 진료(176mg/dL) 때보다 내려왔어요.' },
      { code: 'LDL', value: 84, originalName: 'LDL 콜레스테롤' },
      { code: 'AST', value: 29, originalName: 'AST(SGOT)' },
      { code: 'ALT', value: 36, originalName: 'ALT(SGPT)', note: '지난 진료(47U/L) 때보다 내려왔어요.' },
      { code: 'GGT', value: 49, originalName: '감마지티피(γ-GTP)' },
      { code: 'CREAT', value: 0.98, originalName: '혈청 크레아티닌' },
      { code: 'EGFR', value: 87, originalName: 'e-GFR' },
    ],
    medications: [],
    sentences: [
      {
        section: '검진 정보',
        original: '2026년 일반건강검진 결과통보서 (검진일 2026.06.16)',
        plain: '2026년 6월 16일에 받은 일반 건강검진 결과를 알려 주는 문서예요.',
        terms: [{ term: '일반건강검진', meaning: '국민건강보험에서 정기적으로 제공하는 기본 건강검진' }],
        confidence: 0.96,
      },
      {
        section: '계측 검사',
        original: '신장 172.4cm, 체중 79.0kg, 체질량지수 26.6, 허리둘레 92cm',
        plain:
          '체질량지수(BMI)는 26.6으로 아직 비만 범위(25 이상)이고, 허리둘레 92cm는 남성 복부비만 기준(90cm 이상)을 넘어요. 그래도 첫 진료 때(28.1)보다는 꾸준히 줄고 있어요.',
        terms: [
          { term: '체질량지수', meaning: '몸무게(kg)를 키(m)의 제곱으로 나눈 비만 지표' },
          { term: '허리둘레', meaning: '복부비만 지표. 남성 90cm, 여성 85cm 이상이면 복부비만' },
        ],
        confidence: 0.93,
      },
      {
        section: '계측 검사',
        original: '혈압 134/86 mmHg (재측정 132/84 mmHg) — 고혈압 전단계',
        plain:
          "두 번 잰 혈압이 모두 수축기 130~139 또는 이완기 80~89 범위라, 고혈압은 아니지만 정상보다 높은 '고혈압 전단계'로 분류되었어요.",
        terms: [
          { term: '고혈압 전단계', meaning: '수축기 혈압 130~139 또는 이완기 혈압 80~89mmHg인 상태' },
          { term: '재측정', meaning: '다시 잼' },
        ],
        confidence: 0.9,
        related: ['dx:prehypertension'],
      },
      {
        section: '혈액 검사',
        original: '혈색소 14.6 g/dL, 백혈구 6.8 ×10³/µL, 혈소판 238 ×10³/µL',
        plain: '빈혈을 보는 혈색소, 감염·염증과 관련된 백혈구, 피를 멈추게 하는 혈소판 수치가 모두 정상이에요.',
        terms: [{ term: '혈색소', meaning: '적혈구 안에서 산소를 나르는 단백질(헤모글로빈)' }],
        confidence: 0.96,
        related: ['lab:HB', 'lab:WBC', 'lab:PLT'],
      },
      {
        section: '당뇨병 검사',
        original: '공복혈당 121 mg/dL, 당화혈색소(HbA1c) 6.9 %',
        plain:
          '공복혈당과 당화혈색소는 아직 기준보다 조금 높지만, 첫 진료 때(168mg/dL, 8.1%)보다 많이 내려왔어요.',
        terms: [{ term: 'HbA1c', meaning: '당화혈색소. 최근 2~3개월 평균 혈당을 반영하는 검사' }],
        confidence: 0.97,
        related: ['lab:GLU', 'lab:HBA1C', 'dx:dm'],
      },
      {
        section: '이상지질혈증 검사',
        original: '총콜레스테롤 158, HDL 콜레스테롤 44, 트리글리세라이드 148, LDL 콜레스테롤 84 mg/dL',
        plain:
          '콜레스테롤과 중성지방이 모두 참고치 안에 있어요. 당뇨병이 있으면 나쁜 콜레스테롤(LDL)을 흔히 100mg/dL 미만으로 관리하는데, 84로 이 목표 안에 있어요.',
        terms: [{ term: '트리글리세라이드', meaning: '중성지방의 다른 이름' }],
        confidence: 0.95,
        related: ['lab:TC', 'lab:HDL', 'lab:TG', 'lab:LDL', 'dx:dyslipidemia'],
      },
      {
        section: '간장질환 검사',
        original: 'AST(SGOT) 29, ALT(SGPT) 36, 감마지티피(γ-GTP) 49 U/L',
        plain: '간 수치가 모두 정상 범위로 돌아왔어요. 지방간 관리에 좋은 신호예요.',
        terms: [
          { term: 'SGOT', meaning: 'AST의 다른 이름. 간·근육 세포에 있는 효소' },
          { term: 'SGPT', meaning: 'ALT의 다른 이름. 주로 간세포에 있는 효소' },
        ],
        confidence: 0.94,
        related: ['lab:AST', 'lab:ALT', 'lab:GGT'],
      },
      {
        section: '신장질환 검사',
        original: '혈청 크레아티닌 0.98 mg/dL, 신사구체여과율(e-GFR) 87 mL/min/1.73m²',
        plain: '콩팥 기능을 보는 크레아티닌과 사구체여과율이 모두 정상이에요.',
        terms: [
          { term: '혈청', meaning: '혈액이 굳은 뒤 위에 뜨는 맑은 액체' },
          { term: 'e-GFR', meaning: '추정 사구체여과율. 콩팥이 노폐물을 거르는 능력' },
        ],
        confidence: 0.95,
        related: ['lab:CREAT', 'lab:EGFR'],
      },
      {
        section: '요검사',
        original: '요단백 음성',
        plain: '소변에 단백질이 나오지 않아, 콩팥이 단백질을 잘 걸러 내고 있다는 뜻이에요.',
        terms: [
          { term: '요단백', meaning: '소변 속 단백질' },
          { term: '음성', meaning: '검사에서 해당 성분이 발견되지 않음' },
        ],
        confidence: 0.68,
      },
      {
        section: '종합 판정',
        original: '판정: 유질환자 (당뇨병, 이상지질혈증) — 현재 치료 지속',
        plain: '이미 당뇨병과 이상지질혈증으로 치료받고 있는 사람으로 분류되었고, 지금 받는 치료를 계속하라는 판정이에요.',
        terms: [{ term: '유질환자', meaning: '검진 대상 질환을 이미 진단받아 치료 중인 사람' }],
        confidence: 0.88,
        related: ['dx:dm', 'dx:dyslipidemia'],
      },
      {
        section: '종합 판정',
        original: '고혈압 전단계 — 생활습관 개선 및 가정혈압 측정 권고',
        plain: '싱겁게 먹기·운동·체중 관리 같은 생활습관 개선과 함께, 집에서 혈압을 재 보라는 권고예요.',
        terms: [{ term: '가정혈압', meaning: '집에서 직접 잰 혈압. 병원에서 잰 혈압보다 평소 혈압을 더 잘 보여 줘요' }],
        confidence: 0.87,
        related: ['dx:prehypertension'],
      },
      {
        section: '의사 소견',
        original: '주치의와 상담하여 정기 진료 지속 요망',
        plain: '다니고 있는 병원에서 정기 진료를 계속 받으라는 검진 의사의 의견이에요.',
        terms: [{ term: '요망', meaning: '그렇게 해 주기를 바람' }],
        confidence: 0.64,
      },
    ],
    suggestedQuestions: [
      '공복혈당이 아직 높은데 지금 약으로 충분한가요?',
      '고혈압 전단계면 혈압약을 먹어야 하나요?',
      '간 수치가 정상이 되었으면 지방간도 좋아진 건가요?',
      '허리둘레를 줄이려면 어떤 운동이 도움이 되나요?',
      '집에서 잰 혈압은 어떻게 기록해서 보여 드리면 좋을까요?',
    ],
  },
};

/* ------------------------------------------------------------------ */
/* 4. 2026-10 내분비내과 소견서                                         */
/* ------------------------------------------------------------------ */

const SPECIALIST_OPINION: StoryDocument = {
  tag: '2026_10',
  document: {
    id: 'doc_2026_10',
    title: '새빛종합병원 · 내분비내과 소견서',
    documentType: 'opinion',
    hospitalName: '새빛종합병원',
    department: '내분비내과',
    visitDate: '2026-10-13',
    source: 'gallery',
    pageCount: 1,
    createdAt: kst('2026-10-13', '18:27:51'),
  },
  analyzedAt: kst('2026-10-13', '18:28:03'),
  analysis: {
    overallSummary:
      '당뇨 합병증 평가를 위해 새빛종합병원 내분비내과에 의뢰되어 받은 소견서예요. 당화혈색소 6.6%로 혈당이 잘 조절되고 있고, 눈(안저)과 콩팥 검사에서 합병증은 발견되지 않았어요. 혈압이 여러 번 130~139/80~89 범위로 측정되어 고혈압 전단계로 지켜보기로 했어요. 지금 먹는 약은 그대로 유지하고 생활습관 관리를 이어 가도록 권고했어요.',
    diagnoses: [
      {
        condition: 'dm',
        originalTerm: 'T2DM without complication, well controlled',
        status: 'confirmed',
        plainExplanation:
          '혈당이 목표에 가깝게 잘 조절되고 있고, 눈과 콩팥 합병증 검사에서도 이상이 없었어요.',
      },
      {
        condition: 'dyslipidemia',
        originalTerm: 'Dyslipidemia',
        status: 'confirmed',
        plainExplanation: '콜레스테롤약으로 나쁜 콜레스테롤(LDL)이 76mg/dL까지 내려와 잘 조절되고 있어요.',
      },
      {
        condition: 'nafld',
        originalTerm: 'NAFLD',
        status: 'confirmed',
        plainExplanation:
          '이전에 복부 초음파로 확인된 지방간이에요. 최근 간 수치는 정상이지만, 지방간은 체중·음주 관리로 꾸준히 살펴봐야 해요.',
      },
      {
        condition: 'prehypertension',
        originalTerm: 'Prehypertension',
        status: 'confirmed',
        plainExplanation:
          '병원과 집에서 여러 번 잰 혈압이 130~139/80~89 범위로 확인되었어요. 아직 고혈압은 아니지만, 당뇨병이 있으면 혈관 건강에 더 신경 써야 해서 꾸준히 지켜보기로 했어요.',
      },
      {
        condition: 'retinopathy',
        originalTerm: 'no DR, both eyes',
        status: 'ruled_out',
        plainExplanation:
          '안저검사에서 당뇨병으로 인한 망막 손상이 없다고 확인되었어요. 당뇨병이 있으면 증상이 없어도 해마다 확인하는 것이 좋아요.',
      },
    ],
    labs: [
      { code: 'HBA1C', value: 6.6, note: '1년 전 첫 진료(8.1%)보다 1.5%p 내려왔어요.' },
      { code: 'GLU', value: 108, note: '첫 진료 이후 처음으로 참고치 범위 안에 들어왔어요.' },
      { code: 'LDL', value: 76 },
      { code: 'CREAT', value: 1.01 },
      { code: 'EGFR', value: 83 },
      { code: 'UACR', value: 18, originalName: 'urine ACR' },
    ],
    medications: [
      {
        drug: 'metformin',
        originalText: 'Metformin 500mg bid',
        dose: '1정',
        frequency: '하루 2번, 아침·저녁 식사 직후',
      },
      {
        drug: 'sitagliptin',
        originalText: 'Sitagliptin 100mg qd',
        dose: '1정',
        frequency: '하루 1번, 아침 식사 후',
      },
      {
        drug: 'atorvastatin',
        originalText: 'Atorvastatin 10mg qd',
        dose: '1정',
        frequency: '하루 1번, 저녁 식사 후',
      },
    ],
    sentences: [
      {
        section: '의뢰 사유',
        original: '상기 환자 T2DM, dyslipidemia로 local clinic에서 f/u 중 합병증 평가 위해 본원 의뢰됨',
        plain:
          '동네 의원에서 당뇨병과 이상지질혈증을 치료받다가, 당뇨 합병증이 있는지 자세히 확인하려고 종합병원 내분비내과로 의뢰되었다는 내용이에요.',
        terms: [
          { term: 'T2DM', meaning: '제2형 당뇨병' },
          { term: 'local clinic', meaning: '지역 의원(동네 병원)' },
          { term: 'f/u', meaning: '추적 관찰(follow-up). 경과를 보려고 다시 방문' },
          { term: '의뢰', meaning: '다른 병원에 진료나 검사를 부탁하는 것' },
          { term: '본원', meaning: '이 병원' },
        ],
        confidence: 0.92,
        related: ['dx:dm', 'dx:dyslipidemia'],
      },
      {
        section: '검사 결과',
        original: 'HbA1c 6.6%, FBS 108 mg/dL',
        plain: '당화혈색소가 6.6%로 1년 전(8.1%)보다 크게 좋아졌고, 공복혈당은 참고치 범위 안이에요.',
        terms: [
          { term: 'HbA1c', meaning: '당화혈색소. 최근 2~3개월 평균 혈당을 반영하는 검사' },
          { term: 'FBS', meaning: '공복혈당' },
        ],
        confidence: 0.97,
        related: ['lab:HBA1C', 'lab:GLU', 'dx:dm'],
      },
      {
        section: '검사 결과',
        original: 'LDL-C 76 mg/dL on statin',
        plain: '콜레스테롤약을 먹으면서 나쁜 콜레스테롤(LDL)이 76mg/dL로 잘 조절되고 있어요.',
        terms: [{ term: 'on statin', meaning: '스타틴(콜레스테롤약)을 먹고 있는 상태' }],
        confidence: 0.94,
        related: ['lab:LDL', 'dx:dyslipidemia'],
      },
      {
        section: '검사 결과',
        original: 'Cr 1.01 mg/dL, eGFR 83, urine ACR 18 mg/g',
        plain:
          '콩팥 기능(크레아티닌·사구체여과율)과 소변 알부민 수치가 모두 정상이라, 당뇨병으로 인한 콩팥 손상 소견은 없어요.',
        terms: [
          { term: 'Cr', meaning: '크레아티닌. 콩팥으로 걸러지는 노폐물' },
          { term: 'eGFR', meaning: '추정 사구체여과율. 콩팥이 노폐물을 거르는 능력' },
          { term: 'urine ACR', meaning: '소변 알부민/크레아티닌 비. 콩팥 손상을 일찍 찾는 소변 검사' },
        ],
        confidence: 0.9,
        related: ['lab:CREAT', 'lab:EGFR', 'lab:UACR'],
      },
      {
        section: '안과 검사',
        original: 'Fundus exam: no DR, both eyes',
        plain: '눈 안쪽 망막을 들여다보는 안저검사에서 양쪽 눈 모두 당뇨망막병증이 없었어요.',
        terms: [
          { term: 'Fundus exam', meaning: '안저검사. 동공을 통해 망막을 살펴보는 검사' },
          { term: 'DR', meaning: '당뇨망막병증(Diabetic Retinopathy)' },
        ],
        confidence: 0.88,
        related: ['dx:retinopathy'],
      },
      {
        section: '신체검진',
        original: 'BP 136/84, 132/82 mmHg. HBPM 7일 평균 133/83 mmHg',
        plain: '병원에서 두 번 잰 혈압과 일주일 동안 집에서 잰 평균 혈압이 모두 130~139/80~89 범위였어요.',
        terms: [
          { term: 'BP', meaning: '혈압(Blood Pressure)' },
          { term: 'HBPM', meaning: '가정혈압 측정(Home Blood Pressure Monitoring)' },
        ],
        confidence: 0.69,
        related: ['dx:prehypertension'],
      },
      {
        section: '진단',
        original:
          'Dx) #1. T2DM without complication, well controlled #2. Dyslipidemia #3. NAFLD #4. Prehypertension',
        plain:
          '진단은 ① 합병증 없이 잘 조절되고 있는 제2형 당뇨병, ② 이상지질혈증, ③ 비알코올 지방간, ④ 고혈압 전단계예요.',
        terms: [
          { term: 'Dx', meaning: '진단(Diagnosis)' },
          { term: 'without complication', meaning: '합병증 없음' },
          { term: 'well controlled', meaning: '잘 조절되는 상태' },
          { term: 'NAFLD', meaning: '비알코올 지방간질환' },
          { term: 'Prehypertension', meaning: '고혈압 전단계' },
        ],
        confidence: 0.93,
        related: ['dx:dm', 'dx:dyslipidemia', 'dx:nafld', 'dx:prehypertension'],
      },
      {
        section: '평가',
        original:
          '현 OHA 및 statin 유지 권고 (Metformin 500mg bid, Sitagliptin 100mg qd, Atorvastatin 10mg qd)',
        plain: '지금 먹고 있는 당뇨약 두 가지와 콜레스테롤약 한 가지를 그대로 유지하는 것을 권한다는 의견이에요.',
        terms: [
          { term: 'OHA', meaning: '먹는 당뇨약(경구 혈당강하제, Oral Hypoglycemic Agent)' },
          { term: 'statin', meaning: '스타틴. 콜레스테롤을 낮추는 약' },
          { term: 'bid', meaning: '하루 두 번' },
          { term: 'qd', meaning: '하루 한 번' },
        ],
        confidence: 0.91,
        related: ['med:metformin', 'med:sitagliptin', 'med:atorvastatin'],
      },
      {
        section: '평가',
        original: 'Prehypertension: 저염식·운동 등 생활요법 우선, HBPM 지속',
        plain:
          '고혈압 전단계는 우선 싱겁게 먹기·운동 같은 생활습관 관리를 하면서, 집에서 혈압을 계속 재 보자는 의견이에요.',
        terms: [
          { term: '생활요법', meaning: '식사·운동 등 생활습관을 바꾸는 치료' },
          { term: 'HBPM', meaning: '가정혈압 측정(Home Blood Pressure Monitoring)' },
        ],
        confidence: 0.86,
        related: ['dx:prehypertension'],
      },
      {
        section: '향후 계획',
        original: '연 1회 fundus exam 및 urine ACR, 신기능 f/u 권고',
        plain: '합병증을 일찍 발견하기 위해 1년에 한 번 안저검사와 소변 알부민·콩팥 기능 검사를 받도록 권고했어요.',
        terms: [
          { term: 'fundus exam', meaning: '안저검사. 동공을 통해 망막을 살펴보는 검사' },
          { term: '신기능', meaning: '콩팥 기능' },
        ],
        confidence: 0.89,
        related: ['dx:retinopathy', 'lab:UACR'],
      },
      {
        section: '향후 계획',
        original: 'Local clinic에서 f/u 지속, 필요 시 재의뢰',
        plain: '앞으로는 다니던 동네 의원에서 계속 진료받고, 필요하면 다시 의뢰하면 된다는 내용이에요.',
        terms: [
          { term: 'Local clinic', meaning: '지역 의원(동네 병원)' },
          { term: '재의뢰', meaning: '다시 의뢰함' },
        ],
        confidence: 0.63,
      },
    ],
    suggestedQuestions: [
      '당화혈색소 목표는 몇 %로 잡으면 될까요?',
      '고혈압 전단계에서 고혈압으로 넘어가지 않으려면 무엇을 가장 신경 써야 하나요?',
      '혈당이 계속 잘 유지되면 약을 줄여 볼 수 있는 시점이 있을까요?',
      '하루 소금 섭취는 어느 정도로 줄이면 좋을까요?',
      '내년 안저검사와 소변 검사는 어디에서 받으면 되나요?',
    ],
  },
};

/** 해설이 완료된 시드 문서 (진료일 오름차순) */
export const STORY_DOCUMENTS: readonly StoryDocument[] = [FIRST_VISIT, FOLLOW_UP, CHECKUP, SPECIALIST_OPINION];

/* ------------------------------------------------------------------ */
/* 분석 실패 문서                                                       */
/* ------------------------------------------------------------------ */

export const FAILED_DOCUMENT_ID = 'doc_rx_blurry';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * 흐리게 찍힌 처방전 사진 — 글자 인식 단계(40%)에서 실패한 상태.
 * 앱을 처음 실행한 시점 기준 "최근 업로드" 로 보이도록 시각을 `now` 에서 계산한다.
 */
export function createFailedDocument(now: Date): MedicalDocument {
  const createdAt = new Date(now.getTime() - HOUR_MS);
  return {
    id: FAILED_DOCUMENT_ID,
    title: '바른숲내과의원 · 처방전',
    documentType: 'prescription',
    hospitalName: '바른숲내과의원',
    department: '내과',
    visitDate: toDateString(new Date(now.getTime() - 7 * DAY_MS)),
    source: 'camera',
    pageCount: 1,
    status: 'failed',
    progress: 40,
    failureReason:
      '사진이 흐리고 처방전 아래쪽이 잘려 약 이름을 읽지 못했어요. 밝은 곳에서 처방전 전체가 화면에 들어오도록 다시 촬영해 주세요.',
    createdAt: createdAt.toISOString(),
    updatedAt: new Date(createdAt.getTime() + 4_000).toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* 질문 리스트                                                          */
/* ------------------------------------------------------------------ */

export const STORY_QUESTIONS: readonly Question[] = [
  {
    id: 'q_seed_01',
    text: '당뇨약을 평생 먹어야 하나요?',
    source: 'ai',
    documentId: 'doc_2025_11',
    relatedLabel: '당화혈색소 8.1%',
    isAsked: true,
    answerNote:
      '지금은 혈당을 안정시키는 게 우선이라 꾸준히 먹는 것이 중요하다고 하셨어요. 체중을 줄이고 혈당이 잘 유지되면 그때 약 조정을 함께 상의하자고 하셨어요.',
    createdAt: kst('2025-11-20', '19:50:12'),
    updatedAt: kst('2026-02-24', '11:32:40'),
  },
  {
    id: 'q_seed_02',
    text: '술은 어느 정도까지 줄여야 간 수치가 좋아질까요?',
    source: 'user',
    documentId: 'doc_2025_11',
    relatedLabel: 'ALT(간 수치) 58U/L',
    isAsked: true,
    answerNote:
      '초음파에서 지방간이 확인되어 되도록 술을 끊는 것이 좋다고 하셨어요. 체중을 5% 정도 줄이는 것도 간 수치에 도움이 된다고 하셨어요.',
    createdAt: kst('2025-11-23', '08:14:05'),
    updatedAt: kst('2026-02-24', '11:35:02'),
  },
  {
    id: 'q_seed_03',
    text: '자누비아를 추가하면 저혈당이 올 수 있나요?',
    source: 'ai',
    documentId: 'doc_2026_02',
    relatedLabel: '당화혈색소 7.4%',
    isAsked: true,
    answerNote:
      '메트포르민과 함께 먹어도 저혈당은 드문 편이지만, 식사를 거르지 말고 식은땀·손 떨림이 있으면 알려 달라고 하셨어요.',
    createdAt: kst('2026-02-24', '20:20:31'),
    updatedAt: kst('2026-05-26', '10:48:19'),
  },
  {
    id: 'q_seed_04',
    text: '집에서 혈압은 하루에 언제, 몇 번 재면 되나요?',
    source: 'user',
    documentId: 'doc_2026_06',
    relatedLabel: '혈압 134/86mmHg',
    isAsked: true,
    answerNote:
      '아침에는 일어나 1시간 안에 화장실을 다녀온 뒤 아침 식사 전에, 저녁에는 잠자기 전에 재라고 하셨어요. 몇 분 앉아서 쉰 뒤 두 번씩 재서 기록해 오라고 하셨어요.',
    createdAt: kst('2026-06-19', '21:10:44'),
    updatedAt: kst('2026-08-25', '10:21:37'),
  },
  {
    id: 'q_seed_05',
    text: '당화혈색소 목표는 몇 %로 잡으면 될까요?',
    source: 'ai',
    documentId: 'doc_2026_10',
    relatedLabel: '당화혈색소 6.6%',
    isAsked: false,
    createdAt: kst('2026-10-13', '18:35:20'),
    updatedAt: kst('2026-10-13', '18:35:20'),
  },
  {
    id: 'q_seed_06',
    text: '혈압이 어느 정도로 계속 높으면 혈압약을 시작하게 되나요?',
    source: 'user',
    documentId: 'doc_2026_10',
    relatedLabel: '혈압 136/84mmHg',
    isAsked: false,
    createdAt: kst('2026-10-14', '07:58:03'),
    updatedAt: kst('2026-10-14', '07:58:03'),
  },
  {
    id: 'q_seed_07',
    text: '검사하는 날 아침에 당뇨약은 먹고 가도 되나요?',
    source: 'user',
    isAsked: false,
    createdAt: kst('2026-11-02', '22:41:16'),
    updatedAt: kst('2026-11-02', '22:41:16'),
  },
];
