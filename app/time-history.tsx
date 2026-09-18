import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { TimeHistoryRecord } from '@/domain/time-tracking/time-history';
import { useI18n } from '@/i18n/use-i18n';
import { useApplication } from '@/providers/application-context';
import { ActionButton } from '@/ui/components/action-button';
import { ScreenShell } from '@/ui/components/screen-shell';
import { useTheme } from '@/ui/theme/use-theme';

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
  const { t } = useI18n();
  const { theme } = useTheme();
  const [groups, setGroups] = useState<DisplayGroup[]>([]);
  const [error, setError] = useState(false);

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
            projectNames.set(projectId, project?.name ?? t('timeHistory.unknownProject'));
          }),
        );

        if (!mounted) return;
        setGroups(
          historyGroups.map((group) => ({
            localWorkDate: group.localWorkDate,
            entries: group.entries.map((record) => ({
              record,
              projectName:
                projectNames.get(record.timeEntry.projectId) ?? t('timeHistory.unknownProject'),
            })),
          })),
        );
      })
      .catch(() => {
        if (mounted) setError(true);
      });

    return () => {
      mounted = false;
    };
  }, [manualTimeService, projectService, t]);

  return (
    <ScreenShell title={t('timeHistory.title')} subtitle={t('timeHistory.subtitle')}>
      <ScrollView
        contentContainerStyle={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}
      >
        <View style={{ gap: theme.spacing.sm }}>
          <ActionButton
            label={t('common.addManualTime')}
            accessibilityLabel={t('common.addManualTime')}
            onPress={() => router.push('/time-entry/new' as never)}
          />
          <ActionButton
            label={t('common.back')}
            variant="secondary"
            onPress={() => router.back()}
          />
        </View>

        {error ? (
          <Text
            accessibilityRole="alert"
            style={{ ...theme.typography.caption, color: theme.colors.error }}
          >
            {t('timeHistory.error')}
          </Text>
        ) : null}

        {groups.length === 0 && !error ? (
          <View
            style={{
              padding: theme.spacing.lg,
              gap: theme.spacing.xs,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.lg,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>
              {t('timeHistory.emptyTitle')}
            </Text>
            <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
              {t('timeHistory.emptyBody')}
            </Text>
          </View>
        ) : null}

        {groups.map((group) => (
          <View key={group.localWorkDate} style={{ gap: theme.spacing.sm }}>
            <Text style={{ ...theme.typography.section, color: theme.colors.textPrimary }}>
              {group.localWorkDate}
            </Text>
            {group.entries.map(({ record, projectName }) => {
              const label = record.timeEntry.description || t('timeHistory.trackedSession');
              return (
                <Pressable
                  key={record.timeEntry.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('timeHistory.editLabel')} ${label}`}
                  onPress={() => router.push(`/time-entry/${record.timeEntry.id}` as never)}
                  style={({ pressed }) => ({
                    minHeight: theme.sizing.rowMinHeight,
                    padding: theme.spacing.md,
                    gap: theme.spacing.sm,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.lg,
                    backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
                  })}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: theme.spacing.md,
                    }}
                  >
                    <View style={{ flex: 1, gap: theme.spacing.xs }}>
                      <Text
                        style={{ ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}
                      >
                        {projectName}
                      </Text>
                      <Text
                        style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}
                      >
                        {label}
                      </Text>
                    </View>
                    <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.accent }}>
                      {formatDuration(record.durationMs)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                    <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>
                      {record.timeEntry.source === 'MANUAL'
                        ? t('timeHistory.manual')
                        : t('timeHistory.timer')}
                    </Text>
                    <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>
                      {record.timeEntry.billable
                        ? t('common.billable')
                        : t('common.nonBillable')}
                    </Text>
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
