/**
 * 서버 상태 훅 (TanStack Query).
 *
 * 모든 화면은 API 를 직접 호출하지 않고 이 훅을 통해 데이터를 가져온다.
 * 로딩·오류·재시도·캐시 무효화가 여기서 일괄 처리된다.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { api } from '@/api';
import { isProcessing } from '@/lib/labels';
import type {
  CreateQuestionInput,
  MedicalDocument,
  Question,
  QuestionFilter,
  UpdateQuestionInput,
  UploadDocumentInput,
} from '@/types/domain';

/** 처리 중 문서 상태 폴링 간격 */
export const PROCESSING_POLL_MS = 1500;

export const queryKeys = {
  health: ['health'] as const,
  documents: ['documents'] as const,
  document: (id: string) => ['documents', id] as const,
  analysis: (id: string) => ['analysis', id] as const,
  labCatalog: ['labs'] as const,
  labTrend: (code: string) => ['labs', code, 'trend'] as const,
  questions: (filter?: QuestionFilter) =>
    filter?.documentId ? (['questions', { documentId: filter.documentId }] as const) : (['questions'] as const),
  /** 질문 저장 시 ['questions'] 무효화에 휩쓸려 AI 추천이 재요청되지 않도록 별도 루트 키 사용 */
  questionSuggestions: (documentId: string) => ['question-suggestions', documentId] as const,
  timeline: ['timeline'] as const,
};

/**
 * 문서 처리 완료·삭제 등으로 파생 데이터가 바뀌었을 때.
 * 목록 키는 `exact` 로 무효화한다 — 접두사 일치로 ['documents', id] 단건 쿼리까지
 * 무효화하면, 단건 queryFn 안에서 호출될 때 진행 중인 자기 자신을 취소해 상태 전환이 반영되지 않는다.
 */
export function invalidateDerived(client: QueryClient): Promise<void> {
  return Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.documents, exact: true }),
    invalidateDocumentContent(client),
  ]).then(() => undefined);
}

/** 문서 내용에서 만들어지는 데이터(검사 항목·타임라인)만 무효화 — 목록 queryFn 안에서 자기 자신을 취소하지 않도록 목록 키는 제외 */
function invalidateDocumentContent(client: QueryClient): Promise<void> {
  return Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.labCatalog }),
    client.invalidateQueries({ queryKey: queryKeys.timeline }),
  ]).then(() => undefined);
}

/** 이전 목록에서 처리 중이던 문서가 새 목록에서 완료·실패로 바뀌었는지 */
export function hasFinishedProcessing(
  prev: readonly MedicalDocument[] | undefined,
  next: readonly MedicalDocument[],
): boolean {
  if (!prev) return false;
  const wasProcessing = new Set(prev.filter((d) => isProcessing(d.status)).map((d) => d.id));
  if (wasProcessing.size === 0) return false;
  return next.some((d) => wasProcessing.has(d.id) && !isProcessing(d.status));
}

/* ------------------------------------------------------------------ */
/* 시스템                                                              */
/* ------------------------------------------------------------------ */

export function useHealth() {
  return useQuery({ queryKey: queryKeys.health, queryFn: () => api.health(), retry: 0 });
}

/* ------------------------------------------------------------------ */
/* 문서                                                                */
/* ------------------------------------------------------------------ */

/**
 * 문서 목록. 처리 중 문서가 있으면 주기적으로 갱신하고, 처리가 끝난 문서가 보이면
 * 검사 항목·타임라인 캐시를 무효화한다 (진행 화면을 닫고 기다리는 경우 목록 폴링만 남기 때문).
 */
export function useDocuments() {
  const client = useQueryClient();
  return useQuery({
    queryKey: queryKeys.documents,
    queryFn: async () => {
      const prev = client.getQueryData<MedicalDocument[]>(queryKeys.documents);
      const docs = await api.listDocuments();
      if (hasFinishedProcessing(prev, docs)) void invalidateDocumentContent(client);
      return docs;
    },
    // 처리 중 문서가 있으면 목록도 주기적으로 갱신
    refetchInterval: (query) =>
      query.state.data?.some((d) => isProcessing(d.status)) ? PROCESSING_POLL_MS * 2 : false,
  });
}

/**
 * 단일 문서. 처리 중이면 완료/실패까지 자동 폴링하고,
 * 완료되는 순간 목록·타임라인·검사 목록 캐시를 무효화한다.
 */
export function useDocument(id: string | undefined) {
  const client = useQueryClient();
  return useQuery({
    queryKey: queryKeys.document(id ?? ''),
    enabled: Boolean(id),
    queryFn: async () => {
      const prev = client.getQueryData<MedicalDocument>(queryKeys.document(id as string));
      const doc = await api.getDocument(id as string);
      if (prev && isProcessing(prev.status) && !isProcessing(doc.status)) {
        void invalidateDerived(client);
      }
      return doc;
    },
    refetchInterval: (query) =>
      query.state.data && isProcessing(query.state.data.status) ? PROCESSING_POLL_MS : false,
  });
}

export function useUploadDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      onProgress,
    }: {
      input: UploadDocumentInput;
      onProgress?: (ratio: number) => void;
    }) => api.uploadDocument(input, onProgress),
    onSuccess: (doc) => {
      client.setQueryData(queryKeys.document(doc.id), doc);
      void client.invalidateQueries({ queryKey: queryKeys.documents, exact: true });
    },
  });
}

export function useDeleteDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteDocument(id),
    onSuccess: async (_, id) => {
      // 상세 화면이 아직 마운트된 상태일 수 있으므로 캐시를 즉시 제거하지 않는다
      // (제거하면 관찰자가 다시 조회해 404 화면이 잠깐 보임). 진행 중 요청만 취소하고,
      // 관찰자가 사라지면 gcTime 경과 후 자동 정리된다.
      await Promise.all([
        client.cancelQueries({ queryKey: queryKeys.document(id), exact: true }),
        client.cancelQueries({ queryKey: queryKeys.analysis(id), exact: true }),
      ]);
      void invalidateDerived(client);
      void client.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

export function useReanalyzeDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.reanalyzeDocument(id),
    onSuccess: (doc) => {
      client.setQueryData(queryKeys.document(doc.id), doc);
      void client.invalidateQueries({ queryKey: queryKeys.documents, exact: true });
    },
  });
}

/* ------------------------------------------------------------------ */
/* 구조화 결과·해설                                                     */
/* ------------------------------------------------------------------ */

/** 문서 해설. `enabled` 로 문서가 completed 일 때만 요청하도록 제어 */
export function useAnalysis(documentId: string | undefined, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.analysis(documentId ?? ''),
    queryFn: () => api.getAnalysis(documentId as string),
    enabled: Boolean(documentId) && (options.enabled ?? true),
    staleTime: 5 * 60_000,
  });
}

/* ------------------------------------------------------------------ */
/* 검사 수치                                                            */
/* ------------------------------------------------------------------ */

export function useLabCatalog() {
  return useQuery({ queryKey: queryKeys.labCatalog, queryFn: () => api.listLabCatalog() });
}

export function useLabTrend(code: string | undefined) {
  return useQuery({
    queryKey: queryKeys.labTrend(code ?? ''),
    queryFn: () => api.getLabTrend(code as string),
    enabled: Boolean(code),
  });
}

/* ------------------------------------------------------------------ */
/* 질문 리스트                                                          */
/* ------------------------------------------------------------------ */

export function useQuestions(filter?: QuestionFilter) {
  return useQuery({
    queryKey: queryKeys.questions(filter),
    queryFn: () => api.listQuestions(filter),
  });
}

export function useCreateQuestion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuestionInput) => api.createQuestion(input),
    onSuccess: (question) => {
      void client.invalidateQueries({ queryKey: ['questions'] });
      // 서버는 질문 노트에 이미 있는 문장을 추천에서 뺀다 (API 계약 §4.8) — 캐시된 추천 목록도 맞춰 둔다.
      // (추천 카드에서 담은 질문뿐 아니라 질문 작성 화면에서 같은 문장을 쓴 경우도 포함)
      client.setQueriesData<string[]>({ queryKey: ['question-suggestions'] }, (prev) =>
        prev?.filter((text) => text !== question.text),
      );
    },
  });
}

/** 체크 토글 등은 즉시 화면에 반영(낙관적 업데이트) 후 실패 시 되돌린다 */
export function useUpdateQuestion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateQuestionInput }) =>
      api.updateQuestion(id, input),
    onMutate: async ({ id, input }) => {
      await client.cancelQueries({ queryKey: ['questions'] });
      const snapshots = client.getQueriesData<Question[]>({ queryKey: ['questions'] });
      for (const [key, data] of snapshots) {
        if (!Array.isArray(data)) continue;
        client.setQueryData<Question[]>(
          key,
          data.map((q) =>
            q.id === id
              ? {
                  ...q,
                  ...(input.text !== undefined ? { text: input.text } : {}),
                  ...(input.isAsked !== undefined ? { isAsked: input.isAsked } : {}),
                  ...(input.answerNote !== undefined ? { answerNote: input.answerNote } : {}),
                }
              : q,
          ),
        );
      }
      return { snapshots };
    },
    onError: (_error, _vars, context) => {
      context?.snapshots.forEach(([key, data]) => client.setQueryData(key, data));
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

export function useDeleteQuestion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteQuestion(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

/** AI 질문 추천 — 사용자가 버튼을 눌렀을 때만 요청 (`enabled`) */
export function useQuestionSuggestions(documentId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.questionSuggestions(documentId ?? ''),
    queryFn: () => api.suggestQuestions(documentId as string),
    enabled: Boolean(documentId) && enabled,
    staleTime: 60_000,
  });
}

/* ------------------------------------------------------------------ */
/* 타임라인                                                            */
/* ------------------------------------------------------------------ */

export function useTimeline() {
  return useQuery({ queryKey: queryKeys.timeline, queryFn: () => api.getTimeline() });
}
