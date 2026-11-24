import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { AiDisclaimer } from '@/components/domain/ai-disclaimer';
import { DocumentSectionNav } from '@/components/domain/document-section-nav';
import { SuggestedQuestionsCard } from '@/components/questions/suggested-questions-card';
import { Screen } from '@/components/ui/screen';
import { queryKeys } from '@/hooks/api';
import { useManualRefresh } from '@/hooks/use-manual-refresh';
import { ITEM_ICON, outlineIcon } from '@/lib/icons';
import { isAbnormal } from '@/lib/labs';
import type { DocumentAnalysis, MedicalDocument } from '@/types/domain';

import { CountTiles } from './count-tiles';
import { DiagnosisCard, sortDiagnoses } from './diagnosis-card';
import { DocumentHeader } from './document-header';
import { LabSummaryList } from './lab-summary-list';
import { MedicationCard } from './medication-card';
import { ResultSection, SectionEmpty } from './result-section';
import { SummaryCard } from './summary-card';

export interface DocumentResultContentProps {
  document: MedicalDocument;
  analysis: DocumentAnalysis;
}

/**
 * ② 구조화 결과 본문.
 * 문서 정보 → AI 요약 → 개수 요약 → 진단명 → 검사 항목 → 처방 약 → AI 추천 질문 → AI 고지 순으로 보여준다.
 */
export function DocumentResultContent({ document, analysis }: DocumentResultContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const documentId = document.id;
  const { refreshing, onRefresh } = useManualRefresh([
    () => queryClient.invalidateQueries({ queryKey: queryKeys.document(documentId) }),
    () => queryClient.invalidateQueries({ queryKey: queryKeys.analysis(documentId) }),
  ]);
  const diagnoses = sortDiagnoses(analysis.diagnoses);
  const labs = analysis.labResults;
  const medications = analysis.medications;
  const abnormalLabCount = labs.filter((lab) => isAbnormal(lab.flag)).length;

  // 해설에 실제로 존재하는 문장만 "원문 보기" 대상으로 삼는다
  const sentenceIdSet = new Set(analysis.sentences.map((sentence) => sentence.id));

  /** 항목의 첫 근거 문장으로 원문 대조 해설 화면을 연다 (근거 문장이 없으면 링크를 숨긴다) */
  const sourceHandler = (sentenceIds: readonly string[]) => {
    const sentenceId = sentenceIds.find((sid) => sentenceIdSet.has(sid));
    if (!sentenceId) return undefined;
    return () =>
      router.replace({ pathname: '/documents/[id]/explanation', params: { id: documentId, sentenceId } });
  };

  return (
    <Screen refreshing={refreshing} onRefresh={() => void onRefresh()} safeBottom testID="document-result">
      <DocumentSectionNav documentId={documentId} current="result" hasLabs={labs.length > 0} />

      <DocumentHeader document={document} />

      <SummaryCard analysis={analysis} />

      <CountTiles
        diagnosisCount={diagnoses.length}
        labCount={labs.length}
        abnormalLabCount={abnormalLabCount}
        medicationCount={medications.length}
      />

      <ResultSection
        title="진단명"
        count={diagnoses.length}
        subtitle="진료기록에 적힌 진단을 쉬운 말로 풀었어요"
        testID="result-diagnoses">
        {diagnoses.length > 0 ? (
          diagnoses.map((diagnosis) => (
            <DiagnosisCard
              key={diagnosis.id}
              diagnosis={diagnosis}
              onViewSource={sourceHandler(diagnosis.sentenceIds)}
            />
          ))
        ) : (
          <SectionEmpty icon={outlineIcon(ITEM_ICON.diagnosis)} message="이 기록에서 찾은 진단명이 없어요." />
        )}
      </ResultSection>

      <ResultSection
        title="검사 항목"
        count={labs.length}
        subtitle={describeLabSection(labs.length, abnormalLabCount)}
        testID="result-labs">
        {labs.length > 0 ? (
          <LabSummaryList
            labs={labs}
            onPressLab={(lab) => router.push({ pathname: '/labs/[code]', params: { code: lab.code } })}
            getViewSource={(lab) => sourceHandler(lab.sentenceIds)}
            onShowAll={() => router.replace({ pathname: '/documents/[id]/labs', params: { id: documentId } })}
          />
        ) : (
          <SectionEmpty icon={outlineIcon(ITEM_ICON.lab)} message="이 기록에는 검사 결과가 없어요." />
        )}
      </ResultSection>

      <ResultSection
        title="처방 약"
        count={medications.length}
        subtitle="처방받은 약과 먹는 방법이에요"
        testID="result-medications">
        {medications.length > 0 ? (
          medications.map((medication) => (
            <MedicationCard
              key={medication.id}
              medication={medication}
              onViewSource={sourceHandler(medication.sentenceIds)}
            />
          ))
        ) : (
          <SectionEmpty icon={outlineIcon(ITEM_ICON.medication)} message="이 기록에서 찾은 처방 약이 없어요." />
        )}
      </ResultSection>

      <SuggestedQuestionsCard documentId={documentId} />

      {/* 서버 고지 문구가 비어 있으면 기본 문구를 사용 */}
      <AiDisclaimer text={analysis.disclaimer || undefined} />
    </Screen>
  );
}

/** 검사 항목 구역 안내 문구 */
function describeLabSection(labCount: number, abnormalLabCount: number): string | undefined {
  if (labCount === 0) return undefined;
  if (abnormalLabCount > 0) return `참고치를 벗어난 ${abnormalLabCount}개 항목을 먼저 보여드려요`;
  return '모든 항목이 참고치 범위 안에 있어요';
}
