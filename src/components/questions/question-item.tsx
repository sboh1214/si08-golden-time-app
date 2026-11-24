import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Colors, HitSize, Radius, Spacing } from '@/constants/theme';
import type { MedicalDocument, Question } from '@/types/domain';

import { describeLinkedDocument } from './filters';
import { QuestionCheckbox } from './question-checkbox';
import { useToggleAsked } from './use-toggle-asked';

export interface QuestionItemProps {
  question: Question;
  /** 질문이 나온 문서 (목록에서 찾지 못하면 표시하지 않음) */
  document?: MedicalDocument;
  onEdit: (question: Question) => void;
  onOpenDocument: (documentId: string) => void;
}

/**
 * 질문 노트 한 줄.
 * [체크박스] [질문 문장 · 출처/관련 항목 배지 · 의사 답변 미리보기 → 수정 화면] / [관련 기록 → 문서 화면]
 * 누를 수 있는 영역을 서로 겹치지 않게 나눠 스크린리더에서도 각각 선택할 수 있다.
 */
export function QuestionItem({ question, document, onEdit, onOpenDocument }: QuestionItemProps) {
  const toggleAsked = useToggleAsked();
  const { isAsked, answerNote, relatedLabel } = question;
  const isAi = question.source === 'ai';
  const documentCaption = document ? describeLinkedDocument(document) : null;
  const showAnswer = isAsked && Boolean(answerNote);
  // 본문 버튼은 하나의 요소로 읽히므로 배지·답변 내용까지 라벨에 담는다
  const bodyLabel = [
    question.text,
    isAsked ? '물어본 질문' : null,
    isAi ? 'AI 추천 질문' : '직접 쓴 질문',
    relatedLabel ? `관련 항목 ${relatedLabel}` : null,
    showAnswer ? `의사 답변: ${answerNote}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Card padding="md" variant={isAsked ? 'muted' : 'elevated'} testID={`question-${question.id}`}>
      <View style={styles.row}>
        <QuestionCheckbox
          checked={isAsked}
          onToggle={() => toggleAsked(question)}
          questionText={question.text}
        />
        <Pressable
          onPress={() => onEdit(question)}
          accessibilityRole="button"
          accessibilityLabel={bodyLabel}
          accessibilityHint="질문을 고치거나 의사 답변을 적을 수 있어요"
          style={({ pressed }) => [styles.body, pressed && styles.pressed]}>
          <View style={styles.texts}>
            <AppText variant="body" color={isAsked ? 'textSecondary' : 'text'} scalable>
              {question.text}
            </AppText>
            <View style={styles.badges}>
              {isAsked ? <Badge label="물어봤어요" tone="normal" icon="checkmark-circle" /> : null}
              <Badge
                label={isAi ? 'AI 추천' : '직접 작성'}
                tone={isAi ? 'primary' : 'neutral'}
                icon={isAi ? 'sparkles' : 'create-outline'}
              />
              {relatedLabel ? <Badge label={relatedLabel} tone="info" icon="pulse" /> : null}
            </View>
            {showAnswer ? (
              <View style={styles.answer}>
                <AppText variant="callout" color="textSecondary" numberOfLines={2} scalable>
                  <AppText variant="calloutStrong" color="text">
                    의사 답변:{' '}
                  </AppText>
                  {answerNote}
                </AppText>
              </View>
            ) : null}
          </View>
          <Icon name="chevron-forward" size={18} color="textTertiary" />
        </Pressable>
      </View>

      {document && documentCaption ? (
        <Pressable
          onPress={() => onOpenDocument(document.id)}
          accessibilityRole="link"
          accessibilityLabel={`관련 기록: ${documentCaption}`}
          accessibilityHint="기록 해설 화면으로 이동해요"
          style={({ pressed }) => [styles.documentLink, pressed && styles.pressed]}>
          <Icon name="document-text-outline" size={16} color="primary" />
          <AppText variant="captionStrong" color="primary" numberOfLines={1} style={styles.documentText}>
            {documentCaption}
          </AppText>
          <Icon name="chevron-forward" size={14} color="primary" />
        </Pressable>
      ) : null}
    </Card>
  );
}

/** 체크박스 터치 영역 + 간격만큼 들여 써서 질문 문장과 줄을 맞춘다 */
const CONTENT_INSET = HitSize + Spacing.sm;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: HitSize,
    borderRadius: Radius.sm,
  },
  texts: { flex: 1, gap: Spacing.sm, paddingVertical: Spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  answer: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: Colors.normal,
  },
  documentLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: HitSize,
    marginLeft: CONTENT_INSET,
    marginTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  documentText: { flex: 1 },
  pressed: { opacity: 0.7 },
});
