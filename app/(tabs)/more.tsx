import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActivitiesManagement } from '@/features/activities/activities-management';
import { ActionButton } from '@/ui/components/action-button';
import { ScreenShell } from '@/ui/components/screen-shell';
import { colors, radii, spacing, typography } from '@/ui/theme/tokens';

export default function MoreScreen() {
  return (
    <ScreenShell
      title="More"
      subtitle="Review historical time and configure reusable work activities."
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time</Text>
          <View style={styles.card}>
            <Text style={styles.cardCopy}>
              Repair missed sessions, review stopped timers and edit historical records.
            </Text>
            <ActionButton
              label="Time history"
              accessibilityLabel="Open time history"
              onPress={() => router.push('/time-history' as never)}
            />
            <ActionButton
              label="Add manual time"
              accessibilityLabel="Add manual time from More"
              variant="secondary"
              onPress={() => router.push('/time-entry/new' as never)}
            />
          </View>
        </View>

        <ActivitiesManagement />
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardCopy: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 20,
  },
});
