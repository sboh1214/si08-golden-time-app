import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  fill?: boolean;
}

/** 데이터 없음 */
export function EmptyState({
  icon = 'document-text-outline',
  title,
  description,
  actionLabel,
  onAction,
  fill = false,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, fill && styles.fill]} testID="empty-state">
      <View style={styles.iconWrap}>
        <Icon name={icon} size={30} color="primary" />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {description ? (
        <AppText variant="callout" color="textSecondary" align="center">
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={styles.button} icon="add" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xxl,
  },
  fill: { flex: 1, backgroundColor: Colors.background },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  button: { marginTop: Spacing.md, minWidth: 160 },
});
