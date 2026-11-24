/**
 * 설정 화면 — 빌드 환경별 표시(정식 빌드에서 개발용 정보 숨김)와 문의 메일 동작.
 * (라우트 파일은 src/app 에 두면 화면으로 인식되므로 테스트는 이 폴더에 둔다)
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

import type { ApiConfig } from '@/api/config';
import SettingsScreen from '@/app/(tabs)/settings';
import { useHealth } from '@/hooks/api';

let mockApiConfig: ApiConfig;

jest.mock('@/api', () => ({
  get apiConfig() {
    return mockApiConfig;
  },
}));
jest.mock('@/hooks/api', () => ({ useHealth: jest.fn() }));
jest.mock('@/components/settings/developer-tools', () => ({ DeveloperToolsGroup: () => null }));
jest.mock('@/components/settings/support-contact', () => ({
  ...jest.requireActual<object>('@/components/settings/support-contact'),
  readSupportEmail: () => 'help@example.com',
}));
jest.mock('expo-linking', () => ({ openURL: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);

function setConfig(overrides: Partial<ApiConfig>) {
  mockApiConfig = { mode: 'http', baseUrl: 'https://api.test', timeoutMs: 20_000, appEnv: 'beta', ...overrides };
}

beforeEach(() => {
  jest.mocked(useHealth).mockReturnValue({
    isPending: false,
    isError: false,
    isFetching: false,
    data: { ok: true, version: '2.3.4', modelVersion: 'note-explainer-7' },
    error: null,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useHealth>);
  jest.mocked(Linking.openURL).mockReset();
});

describe('SettingsScreen', () => {
  it('정식 빌드에서는 API 모드·서버 주소·버전을 숨기고 연결 상태만 쉬운 말로 보여 준다', async () => {
    setConfig({ appEnv: 'production' });
    await render(<SettingsScreen />);

    expect(screen.queryByText('API 모드')).toBeNull();
    expect(screen.queryByText(/api\.test/)).toBeNull();
    expect(screen.queryByText(/2\.3\.4|note-explainer/)).toBeNull();
    expect(screen.getByText('서비스를 문제없이 이용할 수 있어요')).toBeOnTheScreen();
    expect(screen.getByText('정상')).toBeOnTheScreen();
  });

  it('베타 빌드에서는 오류 확인용으로 API 모드와 서버·AI 모델 버전을 보여 준다', async () => {
    setConfig({ appEnv: 'beta' });
    await render(<SettingsScreen />);

    expect(screen.getByText('API 모드')).toBeOnTheScreen();
    expect(screen.getByText('실서버 · https://api.test')).toBeOnTheScreen();
    expect(screen.getByText('서버 2.3.4\nAI 모델 note-explainer-7')).toBeOnTheScreen();
  });

  it('정식 빌드라도 내장 데모 서버로 동작하면 API 모드를 보여 준다', async () => {
    setConfig({ mode: 'mock', baseUrl: '', appEnv: 'production' });
    await render(<SettingsScreen />);
    expect(screen.getByText('API 모드')).toBeOnTheScreen();
  });

  it("안내 다시 보기는 외래어 대신 '처음 안내'라고 부른다", async () => {
    setConfig({});
    await render(<SettingsScreen />);
    expect(screen.getByRole('button', { name: '처음 안내 다시 보기' })).toBeOnTheScreen();
    expect(screen.queryByText(/온보딩/)).toBeNull();
  });

  it('문의하기를 누르면 앱 버전이 적힌 메일을 열고, 메일 앱이 없으면 주소를 안내한다', async () => {
    setConfig({ appEnv: 'beta' });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(<SettingsScreen />);

    const contact = screen.getByRole('button', { name: '메일로 문의하기' });
    jest.mocked(Linking.openURL).mockResolvedValueOnce(true);
    await fireEvent.press(contact);
    const url = jest.mocked(Linking.openURL).mock.calls[0][0];
    expect(url.startsWith('mailto:help@example.com?')).toBe(true);
    expect(decodeURIComponent(url)).toContain('· 베타테스트');
    expect(alert).not.toHaveBeenCalled();

    jest.mocked(Linking.openURL).mockRejectedValueOnce(new Error('no mail app'));
    await fireEvent.press(contact);
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith('메일 앱을 열지 못했어요', expect.stringContaining('help@example.com')),
    );
    alert.mockRestore();
  });
});
