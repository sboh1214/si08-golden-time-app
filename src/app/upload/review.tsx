import { Stack, usePreventRemove, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard, StyleSheet, View, type TextInputInstance } from 'react-native';

import { EmptyState } from '@/components/states/empty-state';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceChips, type ChoiceOption } from '@/components/ui/choice-chips';
import type { IconName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { TextField } from '@/components/ui/text-field';
import { DateField } from '@/components/upload/date-field';
import { DepartmentField } from '@/components/upload/department-field';
import { FormField } from '@/components/upload/form-field';
import { InlineErrorBanner } from '@/components/upload/inline-error-banner';
import { PageThumbnails, type PageThumbnailsProps } from '@/components/upload/page-thumbnails';
import { PrivacyNote } from '@/components/upload/privacy-note';
import {
  FIELD_MAX_LENGTH,
  INITIAL_UPLOAD_FORM,
  autoTitle,
  hasErrors,
  toUploadInput,
  validateUploadForm,
  type UploadFormField,
  type UploadFormValues,
} from '@/components/upload/upload-form';
import { UploadProgressPanel } from '@/components/upload/upload-progress-panel';
import { useFilePicker } from '@/components/upload/use-file-picker';
import { Spacing } from '@/constants/theme';
import { useUploadDocument } from '@/hooks/api';
import { useToday } from '@/hooks/use-today';
import { confirm, notify } from '@/lib/dialog';
import { formatDateLong, isValidDateString } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { DOCUMENT_SOURCE_ICON, outlineIcon } from '@/lib/icons';
import { DOCUMENT_TYPE_LABEL, DOCUMENT_TYPE_OPTIONS } from '@/lib/labels';
import { MAX_PAGES, useUploadDraft } from '@/store/upload-draft';
import type { DocumentSource, DocumentType } from '@/types/domain';

const DOCUMENT_TYPE_CHOICES: readonly ChoiceOption<DocumentType>[] = DOCUMENT_TYPE_OPTIONS.map((type) => ({
  value: type,
  label: DOCUMENT_TYPE_LABEL[type],
}));

/** 페이지 추가 버튼 — 사진은 등록 방법 아이콘, PDF 는 파일 1개를 바꾸는 동작이라 교체 모양 */
const ADD_ICON: Record<DocumentSource, IconName> = {
  camera: outlineIcon(DOCUMENT_SOURCE_ICON.camera),
  gallery: outlineIcon(DOCUMENT_SOURCE_ICON.gallery),
  pdf: 'swap-horizontal',
};

/** 입력하다 떠나면 바로 오류를 보여줄 필수 항목 */
type TouchableField = Extract<UploadFormField, 'hospitalName' | 'visitDate'>;

/** 진료기록 등록 ② 미리보기 · 기록 정보 입력 → 업로드 */
export default function UploadReviewScreen() {
  const router = useRouter();
  const files = useUploadDraft((s) => s.files);
  const source = useUploadDraft((s) => s.source);
  const { picking, pick } = useFilePicker();
  const upload = useUploadDocument();

  const [values, setValues] = useState<UploadFormValues>(INITIAL_UPLOAD_FORM);
  const [touched, setTouched] = useState<Partial<Record<TouchableField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [uploadRatio, setUploadRatio] = useState(0);
  const hospitalRef = useRef<TextInputInstance>(null);
  const visitDateRef = useRef<TextInputInstance>(null);
  const titleRef = useRef<TextInputInstance>(null);
  // 진료일 '오늘 이후' 검사 기준 — 자정이 지나도 새 날짜로 바뀌는 값을 쓴다
  const today = useToday();

  const uploading = upload.isPending;

  // 업로드 중에는 화면을 떠날 수 없다 (뒤로 가기 · 모달 닫기 · 하드웨어 뒤로 가기)
  const disablePrevention = usePreventRemove(uploading, () => {
    notify('업로드 중이에요', '파일을 보내고 있어요. 끝날 때까지 잠시만 기다려 주세요.');
  });

  if (!source || files.length === 0) {
    return (
      <EmptyState
        fill
        icon="images-outline"
        title="선택한 파일이 없어요"
        description="진료기록을 촬영하거나 사진·PDF 파일을 먼저 골라 주세요."
        actionLabel="등록 방법 고르기"
        onAction={() => router.dismissTo('/upload')}
      />
    );
  }

  const errors = validateUploadForm(values, today);
  const visibleError = (field: TouchableField) => (submitAttempted || touched[field] ? errors[field] : undefined);
  const setField = <K extends UploadFormField>(field: K, value: UploadFormValues[K]) =>
    setValues((prev) => ({ ...prev, [field]: value }));
  const markTouched = (field: TouchableField) => setTouched((prev) => ({ ...prev, [field]: true }));

  const remaining = MAX_PAGES - files.length;
  const isPdf = source === 'pdf';

  const addPages = async () => {
    const picked = await pick(source, isPdf ? 1 : remaining);
    if (!picked) return;
    // PDF 는 문서 하나에 파일 1개 → 다른 파일로 교체
    if (isPdf) useUploadDraft.getState().start('pdf', picked);
    else useUploadDraft.getState().addFiles(picked);
  };

  const removePage = async (index: number) => {
    const file = files[index];
    if (!file) return;
    const ok = await confirm({
      title: `${index + 1}쪽을 뺄까요?`,
      message: files.length === 1 ? '남은 페이지가 없으면 등록 방법부터 다시 골라야 해요.' : undefined,
      confirmLabel: '빼기',
      destructive: true,
    });
    if (!ok) return;
    haptics.selection();
    useUploadDraft.getState().removeFile(file.uri);
  };

  const movePage = (from: number, to: number) => {
    haptics.selection();
    useUploadDraft.getState().moveFile(from, to);
  };

  const addAction: PageThumbnailsProps['addAction'] = isPdf
    ? { label: '다른 PDF 선택', icon: ADD_ICON.pdf, onPress: () => void addPages(), loading: picking !== null }
    : remaining > 0
      ? {
          label: '페이지 추가',
          caption: `${files.length}/${MAX_PAGES}장`,
          icon: ADD_ICON[source],
          onPress: () => void addPages(),
          loading: picking !== null,
        }
      : undefined;

  const submit = () => {
    if (uploading) return;
    setSubmitAttempted(true);
    if (hasErrors(errors)) {
      haptics.error();
      // 첫 번째 잘못된 항목으로 커서를 옮겨 바로 고칠 수 있게 한다
      if (errors.hospitalName) hospitalRef.current?.focus();
      else if (errors.visitDate) visitDateRef.current?.focus();
      return;
    }
    Keyboard.dismiss();
    setUploadRatio(0);
    upload.mutate(
      { input: toUploadInput(values, files, source), onProgress: setUploadRatio },
      {
        onSuccess: (document) => {
          haptics.success();
          // 업로드가 끝났으므로 이동을 막지 않는다 (상태 반영 전에 이동하므로 직접 해제)
          disablePrevention();
          // 진행 화면을 등록 스택의 유일한 화면으로 만든다 → '닫기'가 모달 전체를 닫는다.
          // 임시 선택(draft)은 등록 방법 화면이 사라질 때 비워진다(여기서 비우면 전환 중 빈 화면이 깜빡인다).
          router.dismissAll();
          router.replace({ pathname: '/upload/progress', params: { documentId: document.id } });
        },
        onError: () => haptics.error(),
      },
    );
  };

  const formIncomplete = submitAttempted && hasErrors(errors);

  return (
    <Screen
      keyboard
      testID="upload-review-screen"
      footer={
        <>
          {uploading ? (
            <UploadProgressPanel ratio={uploadRatio} />
          ) : upload.isError ? (
            <InlineErrorBanner error={upload.error} />
          ) : formIncomplete ? (
            <AppText variant="caption" color="danger" align="center" accessibilityLiveRegion="polite">
              입력하지 않았거나 잘못된 필수 항목이 있어요.
            </AppText>
          ) : null}
          <Button
            label={upload.isError ? '다시 시도' : 'AI 해설 받기'}
            icon={upload.isError ? 'refresh' : 'sparkles'}
            size="lg"
            fullWidth
            loading={uploading}
            onPress={submit}
            accessibilityHint="선택한 파일을 올리고 AI 해설을 만들기 시작해요."
            testID="upload-submit"
          />
        </>
      }>
      <Stack.Screen options={{ headerBackVisible: !uploading, gestureEnabled: !uploading }} />

      <View>
        <SectionHeader
          title={isPdf ? '선택한 파일' : '선택한 페이지'}
          count={isPdf ? undefined : files.length}
          subtitle={
            isPdf
              ? 'PDF는 진료기록 1건에 파일 1개를 올릴 수 있어요.'
              : files.length > 1
                ? '사진 아래 ‹ › 버튼으로 페이지 순서를 바꿀 수 있어요.'
                : '여러 장이면 페이지를 추가해 주세요.'
          }
        />
        <PageThumbnails
          files={files}
          disabled={uploading}
          onRemove={(index) => void removePage(index)}
          onMove={movePage}
          addAction={addAction}
        />
      </View>

      <View>
        <SectionHeader title="기록 정보" subtitle="타임라인에서 기록을 날짜·병원별로 정리하는 데 쓰여요." />
        <Card style={styles.form}>
          <FormField label="기록 종류" required>
            <ChoiceChips
              options={DOCUMENT_TYPE_CHOICES}
              selected={values.documentType}
              onSelect={(type) => setField('documentType', type)}
              disabled={uploading}
              testID="upload-document-type"
            />
          </FormField>

          <FormField label="병원 이름" required error={visibleError('hospitalName')}>
            <TextField
              ref={hospitalRef}
              value={values.hospitalName}
              onChangeText={(text) => setField('hospitalName', text)}
              onBlur={() => markTouched('hospitalName')}
              onSubmitEditing={() => visitDateRef.current?.focus()}
              placeholder="예: 바른숲내과의원"
              maxLength={FIELD_MAX_LENGTH.hospitalName}
              returnKeyType="next"
              submitBehavior="submit"
              autoCorrect={false}
              editable={!uploading}
              invalid={Boolean(visibleError('hospitalName'))}
              accessibilityLabel="병원 이름 (필수)"
              testID="upload-hospital"
            />
          </FormField>

          <FormField
            label="진료일"
            required
            error={visibleError('visitDate')}
            hint={
              isValidDateString(values.visitDate)
                ? formatDateLong(values.visitDate)
                : '숫자 8자리를 입력하면 자동으로 맞춰져요. (예: 20260312)'
            }>
            <DateField
              ref={visitDateRef}
              value={values.visitDate}
              onChange={(value) => setField('visitDate', value)}
              onBlur={() => markTouched('visitDate')}
              onSubmitEditing={() => titleRef.current?.focus()}
              invalid={Boolean(visibleError('visitDate'))}
              disabled={uploading}
              testID="upload-visit-date"
            />
          </FormField>

          <FormField label="진료과">
            <DepartmentField
              value={values.department}
              onChange={(value) => setField('department', value)}
              disabled={uploading}
              testID="upload-department"
            />
          </FormField>

          <FormField label="제목" hint="비워 두면 '병원 이름 · 기록 종류'로 자동으로 만들어져요.">
            <TextField
              ref={titleRef}
              value={values.title}
              onChangeText={(text) => setField('title', text)}
              placeholder={autoTitle(values)}
              maxLength={FIELD_MAX_LENGTH.title}
              returnKeyType="done"
              editable={!uploading}
              accessibilityLabel="제목 (선택)"
              testID="upload-title"
            />
          </FormField>
        </Card>
      </View>

      <PrivacyNote />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.xxl },
});
