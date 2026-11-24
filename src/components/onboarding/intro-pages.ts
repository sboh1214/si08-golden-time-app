import type { OnboardingIllustrationProps } from './onboarding-illustration';

export interface IntroPage {
  key: string;
  title: string;
  description: string;
  illustration: OnboardingIllustrationProps;
}

/** 온보딩 소개 3쪽 (마지막 동의 쪽은 화면에서 따로 구성) */
export const INTRO_PAGES: readonly IntroPage[] = [
  {
    key: 'upload',
    title: '진료기록을 찍어 올리면',
    description: '병원에서 받은 진료기록·검사 결과지·처방전을\n촬영하거나 사진·PDF로 올려 주세요.',
    illustration: {
      icon: 'camera',
      satellites: ['document-text', 'images', 'document-attach'],
      color: 'primary',
      background: 'primarySoft',
    },
  },
  {
    key: 'explain',
    title: 'AI가 진단·검사·약을 정리하고\n쉬운 말로 풀어 줘요',
    description: '원문 문장과 쉬운 해설을 나란히 보며 이해하고,\n검사 수치는 참고치와 비교해 확인해요.',
    illustration: {
      icon: 'sparkles',
      satellites: ['medkit', 'flask', 'chatbubble-ellipses'],
      color: 'caution',
      background: 'accentSoft',
    },
  },
  {
    key: 'prepare',
    title: '질문을 준비하고\n건강 흐름을 한눈에',
    description: '다음 진료 때 물어볼 질문을 모아 두고,\n여러 기록을 시간순 타임라인으로 살펴봐요.',
    illustration: {
      icon: 'analytics',
      satellites: ['chatbubbles', 'calendar', 'time'],
      color: 'info',
      background: 'infoSoft',
    },
  },
];
