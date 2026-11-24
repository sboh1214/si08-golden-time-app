/**
 * 설정 > 정보 > 앱 버전 — '1.0.0 (7)' 처럼 버전과 빌드 번호를 함께 보여 준다.
 *
 * 베타테스트 빌드는 같은 버전(1.0.0)으로 여러 번 배포되므로, 오류를 알려 준 테스터가 어느 빌드를
 * 쓰고 있는지 빌드 번호로 구분한다 (eas.json `preview` 프로필의 autoIncrement 로 빌드마다 1씩 올라감).
 * Android 빌드 번호(versionCode)는 expo-constants 로 알 수 없어 expo-application 에서 읽는다.
 */
import * as Application from 'expo-application';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export function formatAppVersion(version: string | null | undefined, buildNumber: string | null | undefined): string {
  const name = version?.trim() || '알 수 없음';
  const build = buildNumber?.trim();
  return build ? `${name} (${build})` : name;
}

export function readAppVersion(): string {
  const version = Constants.expoConfig?.version ?? Application.nativeApplicationVersion;
  // Expo Go 에서는 Expo Go 자체의 빌드 번호가 나오므로 설치한 빌드(standalone·bare)에서만 붙인다. 웹은 null.
  const buildNumber =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ? null : Application.nativeBuildVersion;
  return formatAppVersion(version, buildNumber);
}
