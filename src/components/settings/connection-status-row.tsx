import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { getErrorMessage } from '@/api/errors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ListRow } from '@/components/ui/list-row';
import { Colors, Spacing } from '@/constants/theme';
import { useHealth } from '@/hooks/api';

import { CONTENT_INSET } from './settings-row';

export interface ConnectionStatusRowProps {
  /** 서버·AI 모델 버전을 함께 보여 줄지 (개발·베타 빌드의 오류 확인용 — 정식 빌드에서는 숨긴다) */
  showVersions?: boolean;
}

/** 서버 연결 상태 (GET /health) — 정상·연결 안 됨·점검 중, 다시 확인 */
export function ConnectionStatusRow({ showVersions = false }: ConnectionStatusRowProps) {
  const health = useHealth();

  if (health.isPending) {
    return (
      <ListRow
        icon="pulse"
        title="연결 상태"
        subtitle="연결 상태를 확인하는 중이에요…"
        right={<ActivityIndicator color={Colors.primary} accessibilityLabel="연결 확인 중" />}
      />
    );
  }

  const status = health.isError
    ? {
        subtitle: getErrorMessage(health.error),
        badge: <Badge label="연결 안 됨" tone="danger" icon="cloud-offline-outline" />,
      }
    : health.data.ok
      ? {
          subtitle: showVersions
            ? [`서버 ${health.data.version}`, health.data.modelVersion ? `AI 모델 ${health.data.modelVersion}` : null]
                .filter(Boolean)
                .join('\n')
            : '서비스를 문제없이 이용할 수 있어요',
          badge: <Badge label="정상" tone="normal" icon="checkmark-circle" />,
        }
      : {
          subtitle: '서버가 점검 중이에요. 잠시 후 다시 확인해 주세요.',
          badge: <Badge label="점검 중" tone="caution" icon="construct-outline" />,
        };

  return (
    <View testID="settings-connection">
      <ListRow icon="pulse" title="연결 상태" subtitle={status.subtitle} right={status.badge} />
      <View style={styles.action}>
        <Button
          label="다시 확인"
          icon="refresh"
          variant={health.isError ? 'secondary' : 'ghost'}
          loading={health.isFetching}
          onPress={() => void health.refetch()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'flex-start',
    paddingLeft: CONTENT_INSET,
    paddingRight: Spacing.lg,
    paddingBottom: Spacing.md,
    marginTop: -Spacing.sm,
  },
});
