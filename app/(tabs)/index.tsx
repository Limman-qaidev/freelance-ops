import { StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/ui/components/screen-shell';
import { colors, radii, spacing, typography } from '@/ui/theme/tokens';

export default function TodayScreen() {
  return (
    <ScreenShell
      title="Today"
      subtitle="Start fast. Track the work now; structure and analyse it as the product grows."
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Active projects</Text>
        <Text style={styles.cardBody}>
          Project launch cards will be implemented in UX-001 after the local domain and timer services exist.
        </Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle,
    fontWeight: '700',
  },
  cardBody: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 24,
  },
});
