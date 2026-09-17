import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TimeHistoryRecord } from '@/domain/time-tracking/time-history';
import { useApplication } from '@/providers/application-context';
import { ActionButton } from '@/ui/components/action-button';
import { ScreenShell } from '@/ui/components/screen-shell';
import { colors, radii, spacing, typography } from '@/ui/theme/tokens';

type DisplayEntry = {
  record: TimeHistoryRecord;
  projectName: string;
};

type DisplayGroup = {
  localWorkDate: string;
  entries: DisplayEntry[];
};

export default function TimeHistoryScreen() {
  const { manualTimeService, projectService } = useApplication();
  const [groups, setGroups] = useState<DisplayGroup[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void manualTimeService
      .listRecentGrouped(100)
      .then(async (historyGroups) => {
        const projectNames = new Map<string, string>();
        const projectIds = Array.from(
          new Set(
            historyGroups.flatMap((group) =>
              group.entries.map((entry) => entry.timeEntry.projectId),
            ),
          ),
        );

        await Promise.all(
          projectIds.map(async (projectId) => {
            const project = await projectService.getById(projectId);
            projectNames.set(projectId, project?.name ?? 'Unknown project');
          }),
        );

        if (!mounted) return;
        setGroups(
          historyGroups.map((group) => ({
            localWorkDate: group.localWorkDate,
            entries: group.entries.map((record) => ({
              record,
              projectName: projectNames.get(record.timeEntry.projectId) ?? 'Unknown project',
            })),
          })),
        );
      })
      .catch(() => {
        if (mounted) setError('Unable to load local time history.');
      });

    return () => {
      mounted = false;
    };
  }, [manualTimeService, projectService]);

  return (
    <ScreenShell
      title="Time history"
      subtitle="Review stopped timer sessions and manual corrections by their original local work date."
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.actions}>
          <ActionButton
            label="Add manual time"
            accessibilityLabel="Add manual time"
            onPress={() => router.push('/time-entry/new' as never)}
          />
          <ActionButton label="Back" variant="secondary" onPress={() => router.back()} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {groups.length === 0 && !error ? (
          <View style={styles.emptyCard}>
            <Text style={styles.entryTitle}>No historical time yet</Text>
            <Text style={styles.muted}>Stopped timers and manual entries will appear here.</Text>
          </View>
        ) : null}

        {groups.map((group) => (
          <View key={group.localWorkDate} style={styles.group}>
            <Text style={styles.dateTitle}>{group.localWorkDate}</Text>
            {group.entries.map(({ record, projectName }) => {
              const label = record.timeEntry.description || 'Tracked session';
              return (
                <Pressable
                  key={record.timeEntry.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit time entry ${label}`}
                  onPress={() => router.push(`/time-entry/${record.timeEntry.id}` as never)}
                  style={styles.entryCard}
                >
                  <View style={styles.entryHeader}>
                    <View style={styles.entryCopy}>
                      <Text style={styles.entryTitle}>{projectName}</Text>
                      <Text style={styles.muted}>{label}</Text>
                    </View>
                    <Text style={styles.duration}>{formatDuration(record.durationMs)}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>
                      {record.timeEntry.source === 'MANUAL' ? 'Manual' : 'Timer'}
                    </Text>
                    <Text style={styles.meta}>{record.timeEntry.billable ? 'Billable' : 'Non-billable'}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

function formatDuration(milliseconds: number): string {
  const totalMinutes = Math.max(0, Math.round(milliseconds / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  actions: {
    gap: spacing.sm,
  },
  group: {
    gap: spacing.sm,
  },
  dateTitle: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle,
    fontWeight: '700',
  },
  entryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  entryCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  entryTitle: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: '700',
  },
  duration: {
    color: colors.accent,
    fontSize: typography.body,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  meta: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  error: {
    color: '#B91C1C',
    fontSize: typography.caption,
    fontWeight: '600',
  },
});
