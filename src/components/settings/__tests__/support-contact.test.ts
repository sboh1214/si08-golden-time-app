import { formatAppVersion } from '../app-version';
import { buildSupportMailto, readSupportEmail } from '../support-contact';

const saved = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

function setSupportEmail(value: string | undefined): void {
  if (value === undefined) delete process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
  else process.env.EXPO_PUBLIC_SUPPORT_EMAIL = value;
}

afterEach(() => setSupportEmail(saved));

describe('readSupportEmail', () => {
  it('설정하지 않았거나 메일 주소 형식이 아니면 null (문의 행을 숨긴다)', () => {
    setSupportEmail(undefined);
    expect(readSupportEmail()).toBeNull();
    for (const value of ['', '   ', 'support', 'a@b', 'a b@example.com', 'a@example.com?cc=x', 'a&b@example.com']) {
      setSupportEmail(value);
      expect(readSupportEmail()).toBeNull();
    }
  });

  it('앞뒤 공백을 지운 메일 주소를 돌려준다', () => {
    setSupportEmail('  help.desk+beta@example.co.kr ');
    expect(readSupportEmail()).toBe('help.desk+beta@example.co.kr');
  });
});

describe('buildSupportMailto', () => {
  it('제목과 본문(앱 버전·기기)을 인코딩해 mailto 주소를 만든다', () => {
    const url = buildSupportMailto('help@example.com', { appVersion: '1.0.0 · 베타테스트', device: 'ios 26.1' });
    const [address, query] = url.split('?');
    expect(address).toBe('mailto:help@example.com');

    const params = new URLSearchParams(query);
    expect(params.get('subject')).toBe('[건강수첩] 문의');
    const body = params.get('body') ?? '';
    expect(body).toContain('앱 버전: 1.0.0 · 베타테스트');
    expect(body).toContain('기기: ios 26.1');
    // 공백은 '+' 가 아닌 %20 으로 인코딩해야 메일 앱에서 그대로 보인다
    expect(query).not.toContain('+');
  });
});

describe('formatAppVersion', () => {
  it("빌드 번호가 있으면 '버전 (빌드 번호)', 없으면 버전만 보여 준다", () => {
    expect(formatAppVersion('1.0.0', '7')).toBe('1.0.0 (7)');
    expect(formatAppVersion('1.0.0', null)).toBe('1.0.0');
    expect(formatAppVersion('1.0.0', ' ')).toBe('1.0.0');
    expect(formatAppVersion(undefined, '7')).toBe('알 수 없음 (7)');
  });
});
