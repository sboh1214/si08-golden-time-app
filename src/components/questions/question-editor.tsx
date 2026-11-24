/**
 * 질문 작성/수정 폼 (화면: `src/app/questions/edit.tsx`).
 *
 * - 작성: 질문 내용 + 예시 문장 + 관련 진료기록 선택
 * - 수정: 질문 내용 + '물어봤어요' 스위치 + 의사 답변 메모 + 삭제
 *   (API 계약상 질문의 연결 기록·관련 항목은 작성 후 바꿀 수 없어 읽기 전용으로 보여 준다)
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { getErrorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Colors, HitSize, Radius, Spacing } from '@/constants/theme';
import { useCreateQuestion, useDeleteQuestion, useDocuments, useUpdateQuestion } from '@/hooks/api';
import { confirm, notify } from '@/lib/dialog';
import { formatRelative } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import type { Question } from '@/types/domain';

import { describeLinkedDocument } from './filters';
import { FormSection, TextAreaField } from './form-fields';
import {
  ANSWER_NOTE_MAX_LENGTH,
  QUESTION_MAX_LENGTH,
  QUESTION_TEMPLATES,
  buildQuestionPatch,
  validateQuestionText,
} from './question-rules';
import { RelatedDocumentPicker } from './related-document-picker';

const QUESTION_PLACEHOLDER = '예: 이 약은 언제까지 먹어야 하나요?';
const ASKED_HINT = '켜면 ‘물어본 질문’으로 옮겨져요.';

/* ------------------------------------------------------------------ */
/* 작성                                                                */
/* ------------------------------------------------------------------ */

export interface CreateQuestionFormProps {
  /** 미리 채울 질문 문장 (다른 화면에서 넘겨받은 경우) */
  initialText?: string;
  /** 미리 연결할 문서 */
  initialDocumentId?: string;
  /** 관련 항목 라벨 (예: 당화혈색소 7.4%) — 처음 연결된 문서와 함께일 때만 저장 */
  relatedLabel?: string;
  /** 저장 후 화면 닫기 */
  onDone: () => void;
}

export function CreateQuestionForm({ initialText = '', initialDocumentId, relatedLabel, onDone }: CreateQuestionFormProps) {
  const [text, setText] = useState(initialText);
  const [documentId, setDocumentId] = useState(initialDocumentId);
  const [submitted, setSubmitted] = useState(false);
  const create = useCreateQuestion();

  const error = submitted ? validateQuestionText(text) : null;
  const label = relatedLabel && documentId === initialDocumentId ? relatedLabel : undefined;

  const applyTemplate = async (template: string) => {
    if (text.trim() && text !== template) {
      const ok = await confirm({
        title: '예시 문장으로 바꿀까요?',
        message: '지금까지 적은 내용은 지워져요.',
        confirmLabel: '바꾸기',
      });
      if (!ok) return;
    }
    haptics.selection();
    setText(template);
  };

  const save = () => {
    setSubmitted(true);
    if (validateQuestionText(text)) {
      haptics.error();
      return;
    }
    create.mutate(
      { text: text.trim(), source: 'user', documentId, relatedLabel: label },
      {
        onSuccess: () => {
          haptics.success();
          onDone();
        },
        onError: (e) => {
          haptics.error();
          notify('질문을 저장하지 못했어요', getErrorMessage(e));
        },
      },
    );
  };

  return (
    <Screen
      keyboard
      footer={
        <Button
          label="질문 저장"
          icon="checkmark"
          size="lg"
          fullWidth
          loading={create.isPending}
          onPress={save}
          testID="question-save"
        />
      }>
      <TextAreaField
        label="질문 내용"
        value={text}
        onChangeText={setText}
        maxLength={QUESTION_MAX_LENGTH}
        placeholder={QUESTION_PLACEHOLDER}
        error={error}
        testID="question-text"
      />

      <FormSection title="이렇게 시작해 보세요" description="누르면 질문 칸에 바로 채워져요.">
        <View style={styles.chips}>
          {QUESTION_TEMPLATES.map((template) => (
            <Chip
              key={template}
              label={template}
              selected={text === template}
              onPress={() => void applyTemplate(template)}
            />
          ))}
        </View>
      </FormSection>

      <FormSection
        title="관련 진료기록 (선택)"
        description="어느 기록을 보고 생긴 질문인지 연결해 두면 나중에 찾기 쉬워요.">
        {label ? <Badge label={`관련 항목 · ${label}`} tone="info" icon="pulse" size="md" /> : null}
        <RelatedDocumentPicker value={documentId} onChange={setDocumentId} />
      </FormSection>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* 수정                                                                */
/* ------------------------------------------------------------------ */

export interface EditQuestionFormProps {
  question: Question;
  /** 저장 후(또는 바뀐 것이 없을 때) 화면 닫기 */
  onDone: () => void;
  /** 삭제 완료 후 */
  onDeleted: () => void;
}

export function EditQuestionForm({ question, onDone, onDeleted }: EditQuestionFormProps) {
  const [text, setText] = useState(question.text);
  const [isAsked, setIsAsked] = useState(question.isAsked);
  const [answerNote, setAnswerNote] = useState(question.answerNote ?? '');
  const [submitted, setSubmitted] = useState(false);
  const update = useUpdateQuestion();
  const remove = useDeleteQuestion();
  const documentsQuery = useDocuments();

  const error = submitted ? validateQuestionText(text) : null;
  const linkedDocument = question.documentId
    ? documentsQuery.data?.find((d) => d.id === question.documentId)
    : undefined;
  const busy = update.isPending || remove.isPending;

  const save = () => {
    setSubmitted(true);
    if (validateQuestionText(text)) {
      haptics.error();
      return;
    }
    const patch = buildQuestionPatch(question, { text, isAsked, answerNote });
    if (!patch) {
      onDone();
      return;
    }
    update.mutate(
      { id: question.id, input: patch },
      {
        onSuccess: () => {
          haptics.success();
          onDone();
        },
        onError: (e) => {
          haptics.error();
          notify('변경 내용을 저장하지 못했어요', getErrorMessage(e));
        },
      },
    );
  };

  const deleteQuestion = async () => {
    const ok = await confirm({
      title: '이 질문을 삭제할까요?',
      message: '삭제한 질문과 답변 메모는 되돌릴 수 없어요.',
      confirmLabel: '삭제',
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(question.id, {
      onSuccess: () => {
        haptics.success();
        onDeleted();
      },
      onError: (e) => {
        haptics.error();
        notify('질문을 삭제하지 못했어요', getErrorMessage(e));
      },
    });
  };

  return (
    <Screen
      keyboard
      footer={
        <Button
          label="변경 내용 저장"
          icon="checkmark"
          size="lg"
          fullWidth
          loading={update.isPending}
          disabled={remove.isPending}
          onPress={save}
          testID="question-save"
        />
      }>
      <View style={styles.meta}>
        <View style={styles.badges}>
          <Badge
            label={question.source === 'ai' ? 'AI 추천' : '직접 작성'}
            tone={question.source === 'ai' ? 'primary' : 'neutral'}
            icon={question.source === 'ai' ? 'sparkles' : 'create-outline'}
          />
          {question.relatedLabel ? <Badge label={question.relatedLabel} tone="info" icon="pulse" /> : null}
          <AppText variant="caption" color="textTertiary">
            {formatRelative(question.createdAt)} 작성
          </AppText>
        </View>
        {linkedDocument ? (
          <View style={styles.linked}>
            <Icon name="document-text-outline" size={16} color="textSecondary" />
            <AppText variant="caption" color="textSecondary" style={styles.flex}>
              {describeLinkedDocument(linkedDocument)}
            </AppText>
          </View>
        ) : null}
      </View>

      <TextAreaField
        label="질문 내용"
        value={text}
        onChangeText={setText}
        maxLength={QUESTION_MAX_LENGTH}
        placeholder={QUESTION_PLACEHOLDER}
        error={error}
        testID="question-text"
      />

      <Card variant="outlined" padding={0}>
        {/* 작은 스위치 대신 행 전체를 눌러 바꿀 수 있게 해 터치 영역을 넓혔다 (설정 화면 스위치 행과 같은 방식) */}
        <Pressable
          onPress={() => {
            haptics.selection();
            setIsAsked((prev) => !prev);
          }}
          accessibilityRole="switch"
          accessibilityState={{ checked: isAsked }}
          accessibilityLabel="진료 때 물어봤어요"
          accessibilityHint={ASKED_HINT}
          style={({ pressed }) => [styles.switchRow, pressed && styles.switchRowPressed]}
          testID="question-asked-switch">
          <View style={styles.flex}>
            <AppText variant="bodyStrong">진료 때 물어봤어요</AppText>
            <AppText variant="caption" color="textTertiary">
              {ASKED_HINT}
            </AppText>
          </View>
          {/* 스위치는 표시용 — 웹에서 클릭이 두 번 처리되지 않도록 포인터 이벤트를 막고 스크린리더에서는 숨긴다 */}
          <View
            style={styles.switchDisplay}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            <Switch
              value={isAsked}
              trackColor={{ false: Colors.borderStrong, true: Colors.primary }}
              thumbColor={Colors.surface}
              ios_backgroundColor={Colors.borderStrong}
            />
          </View>
        </Pressable>
      </Card>

      <TextAreaField
        label="의사 답변 메모"
        helper="진료 때 들은 답변을 적어 두면 다음 진료 때 도움이 돼요."
        value={answerNote}
        onChangeText={setAnswerNote}
        maxLength={ANSWER_NOTE_MAX_LENGTH}
        placeholder="예: 혈당이 안정되면 3개월 뒤 약을 줄여 보기로 했어요."
        minHeight={104}
        testID="question-answer-note"
      />

      <Button
        label="질문 삭제"
        icon="trash-outline"
        variant="danger"
        loading={remove.isPending}
        disabled={busy && !remove.isPending}
        onPress={() => void deleteQuestion()}
        testID="question-delete"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  meta: { gap: Spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.xs },
  linked: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: HitSize,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  switchRowPressed: { backgroundColor: Colors.surfaceMuted },
  switchDisplay: { pointerEvents: 'none' },
  flex: { flex: 1 },
});
