import { StyleSheet, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

export function Divider({ inset = 0, spacing = 0 }: { inset?: number; spacing?: keyof typeof Spacing | 0 }) {
  const margin = spacing === 0 ? 0 : Spacing[spacing];
  return <View style={[styles.line, { marginLeft: inset, marginVertical: margin }]} />;
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
});
