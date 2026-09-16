import { ScrollView, StyleSheet } from 'react-native';

import { ActivitiesManagement } from '@/features/activities/activities-management';
import { ScreenShell } from '@/ui/components/screen-shell';
import { spacing } from '@/ui/theme/tokens';

export default function MoreScreen() {
  return (
    <ScreenShell
      title="More"
      subtitle="Configure reusable work activities. Exports, backup and restore arrive in later V1 slices."
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ActivitiesManagement />
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
  },
});
