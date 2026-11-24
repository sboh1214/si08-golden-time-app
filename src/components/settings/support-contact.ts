/**
 * 설정 > 정보 > 문의 — 운영사 문의 메일.
 *
 * 주소는 빌드 환경변수 `EXPO_PUBLIC_SUPPORT_EMAIL` 로 지정한다 (eas.json build profile `env` 또는 `.env`).
 * 비어 있거나 형식이 맞지 않으면 '문의' 행을 숨긴다 — 연락할 곳 없는 안내를 띄우지 않기 위해서다.
 */

/** 메일 주소로 쓸 수 있는 값만 허용 (mailto URL 을 깨뜨리는 ?·&·% 등은 제외) */
const EMAIL_PATTERN = /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/;

export function readSupportEmail(): string | null {
  const email = (process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '').trim();
  return EMAIL_PATTERN.test(email) ? email : null;
}

export interface SupportMailInfo {
  /** 예: '1.0.0 · 베타테스트' */
  appVersion: string;
  /** 예: 'ios 26.1', 'android 35' */
  device: string;
}

/** 앱 버전·기기 정보를 미리 적어 둔 문의 메일 주소 (mailto:) */
export function buildSupportMailto(email: string, { appVersion, device }: SupportMailInfo): string {
  const subject = '[건강수첩] 문의';
  const body = [
    '불편한 점이나 오류를 적어 주세요.',
    '(진료기록 사진을 첨부할 때는 이름·주민등록번호 등을 가려 주세요)',
    '',
    '',
    '---',
    `앱 버전: ${appVersion}`,
    `기기: ${device}`,
  ].join('\n');
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
