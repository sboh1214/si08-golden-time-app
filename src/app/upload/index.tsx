import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import type { IconName } from '@/components/ui/icon';
import { HeaderButton } from '@/components/ui/header-button';
import { Screen } from '@/components/ui/screen';
import { CaptureTipsCard } from '@/components/upload/capture-tips-card';
import { PrivacyNote } from '@/components/upload/privacy-note';
import { SourceOptionCard, type SourceOptionCardProps } from '@/components/upload/source-option-card';
import { useCloseUploadFlow } from '@/components/upload/use-close-upload-flow';
import { recoverPendingPick, useFilePicker } from '@/components/upload/use-file-picker';
import { Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { DOCUMENT_SOURCE_ICON } from '@/lib/icons';
import { MAX_PAGES, useUploadDraft } from '@/store/upload-draft';
import type { DocumentSource } from '@/types/domain';

interface SourceOption {
  source: DocumentSource;
  icon: IconName;
  title: string;
  description: string;
  tone: NonNullable<SourceOptionCardProps['tone']>;
}

const SOURCE_OPTIONS: SourceOption[] = [
  {
    source: 'camera',
    icon: DOCUMENT_SOURCE_ICON.camera,
    title: '카메라로 촬영',
    description:
      Platform.OS === 'web'
        ? '사진 파일을 고르거나 휴대폰에서 바로 찍어요.'
        : '종이 진료기록을 바로 찍어요. 한 장씩 이어서 찍을 수 있어요.',
    tone: { color: 'primary', background: 'primarySoft' },
  },
  {
    source: 'gallery',
    icon: DOCUMENT_SOURCE_ICON.gallery,
    title: '사진에서 선택',
    description: `찍어 둔 사진을 골라요. 여러 장 가능 (최대 ${MAX_PAGES}장)`,
    tone: { color: 'info', background: 'infoSoft' },
  },
  {
    source: 'pdf',
    icon: DOCUMENT_SOURCE_ICON.pdf,
    title: 'PDF 파일 선택',
    description: '병원 앱·이메일로 받은 PDF 결과지를 올려요.',
    tone: { color: 'caution', background: 'cautionSoft' },
  },
];

/** 문서 등록 ① 등록 방법 선택 (카메라 촬영 · 사진 선택 · PDF) */
export default function UploadSourceScreen() {
  const router = useRouter();
  const closeFlow = useCloseUploadFlow();
  const { picking, pick } = useFilePicker();

  // 등록 흐름이 끝나 이 화면이 사라지면(모달 닫힘 · 분석 진행 화면으로 전환)
  // 메모리에 남아 있는 의료 사진 경로를 비운다.
  useEffect(() => () => useUploadDraft.getState().reset(), []);

  // Android: 촬영·사진 선택 중 메모리 부족으로 앱 화면이 종료됐다가 다시 열렸다면,
  // 그때 고른 사진을 되찾아 바로 정보 입력 화면으로 이어 간다.
  useEffect(() => {
    let active = true;
    void recoverPendingPick().then((recovered) => {
      if (!active || !recovered) return;
      useUploadDraft.getState().start(recovered.source, recovered.files);
      router.push('/upload/review');
    });
    return () => {
      active = false;
    };
  }, [router]);

  const choose = async (source: DocumentSource) => {
    haptics.light();
    const files = await pick(source);
    if (!files) return;
    useUploadDraft.getState().start(source, files);
    router.push('/upload/review');
  };

  return (
    <Screen safeBottom testID="upload-source-screen">
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderButton icon="close" accessibilityLabel="닫기" color="text" onPress={closeFlow} testID="upload-close" />
          ),
        }}
      />

      <View style={styles.intro}>
        <AppText variant="title" accessibilityRole="header">
          진료기록을 올려 주세요
        </AppText>
        <AppText variant="body" color="textSecondary">
          진료기록·검사 결과지·처방전을 올리면 AI가 진단명, 검사 수치, 처방 약을 정리하고 쉬운 말로
          풀어 드려요.
        </AppText>
      </View>

      <View style={styles.options}>
        {SOURCE_OPTIONS.map((option) => (
          <SourceOptionCard
            key={option.source}
            icon={option.icon}
            title={option.title}
            description={option.description}
            tone={option.tone}
            loading={picking === option.source}
            disabled={picking !== null && picking !== option.source}
            onPress={() => void choose(option.source)}
            testID={`upload-source-${option.source}`}
          />
        ))}
      </View>

      <CaptureTipsCard />
      <PrivacyNote />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.sm },
  options: { gap: Spacing.md },
});
