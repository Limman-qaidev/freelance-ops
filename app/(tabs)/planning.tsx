import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import type { Task } from '@/domain/tasks/task';
import { useI18n } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import { useApplication } from '@/providers/application-context';
import { EmptyState } from '@/ui/components/empty-state';
import { ScreenShell } from '@/ui/components/screen-shell';
import { SectionHeader } from '@/ui/components/section-header';
import { StatusPill } from '@/ui/components/status-pill';
import { useTheme } from '@/ui/theme/use-theme';

type PlannedItem = {
  id: string;
  title: string;
  projectName: string;
  start: string;
  end: string;
  status: string;
};

const day = (value: string) =>
  Math.floor(Date.parse(`${value}T00:00:00Z`) / 86_400_000);

const STATUS_KEYS: Record<string, TranslationKey> = {
  PLANNED: 'status.planned',
  ACTIVE: 'status.active',
  ON_HOLD: 'status.onHold',
  COMPLETED: 'status.completed',
  CANCELLED: 'status.cancelled',
  PENDING: 'status.pending',
  IN_PROGRESS: 'status.inProgress',
};

export default function PlanningScreen() {
  const { projectService, taskService } = useApplication();
  const { theme } = useTheme();
  const { language, t } = useI18n();
  const [items, setItems] = useState<PlannedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void projectService
      .listActiveProjects()
      .then(async (projects) => {
        const rows: PlannedItem[] = [];

        await Promise.all(
          projects.map(async (project) => {
            const tasks = await taskService.listTasksForProject(project.id);

            if (project.plannedStartDate && project.plannedEndDate) {
              rows.push({
                id: `project-${project.id}`,
                title: project.name,
                projectName: t('planning.projectLabel'),
                start: project.plannedStartDate,
                end: project.plannedEndDate,
                status: project.status,
              });
            }

            tasks.forEach((task: Task) => {
              if (task.plannedStartDate && task.plannedEndDate) {
                rows.push({
                  id: task.id,
                  title: task.name,
                  projectName: project.name,
                  start: task.plannedStartDate,
                  end: task.plannedEndDate,
                  status: task.status,
                });
              }
            });
          }),
        );

        rows.sort((a, b) => a.start.localeCompare(b.start));
        if (mounted) setItems(rows);
      })
      .catch(() => mounted && setError(t('planning.error')))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [projectService, taskService, t]);

  const range = useMemo(() => {
    if (!items.length) return null;
    const starts = items.map((item) => day(item.start));
    const ends = items.map((item) => day(item.end));
    return { first: Math.min(...starts), last: Math.max(...ends) };
  }, [items]);

  return (
    <ScreenShell title={t('planning.title')} subtitle={t('planning.subtitle')}>
      <ScrollView
        contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xxl }}
      >
        <SectionHeader
          title={t('planning.timeline')}
          metadata={items.length ? `${items.length} ${t('planning.itemsLabel')}` : undefined}
        />

        {loading ? (
          <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>
            {t('planning.loading')}
          </Text>
        ) : null}

        {error ? (
          <Text
            accessibilityRole="alert"
            style={{ ...theme.typography.caption, color: theme.colors.error }}
          >
            {error}
          </Text>
        ) : null}

        {!loading && !error && !items.length ? (
          <EmptyState
            title={t('planning.emptyTitle')}
            body={t('planning.emptyBody')}
          />
        ) : null}

        {range ? (
          <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>
            {new Date(range.first * 86_400_000).toLocaleDateString(
              language === 'es' ? 'es-ES' : 'en-US',
            )}{' '}
            —{' '}
            {new Date(range.last * 86_400_000).toLocaleDateString(
              language === 'es' ? 'es-ES' : 'en-US',
            )}
          </Text>
        ) : null}

        {range
          ? items.map((item) => {
              const total = Math.max(1, range.last - range.first + 1);
              const left = ((day(item.start) - range.first) / total) * 100;
              const width = Math.max(
                6,
                ((day(item.end) - day(item.start) + 1) / total) * 100,
              );
              const statusKey = STATUS_KEYS[item.status];
              const statusLabel = statusKey
                ? t(statusKey)
                : item.status.replace('_', ' ');

              return (
                <View
                  key={item.id}
                  style={{
                    gap: theme.spacing.xs,
                    padding: theme.spacing.md,
                    borderRadius: theme.radii.md,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      gap: theme.spacing.sm,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          ...theme.typography.bodyStrong,
                          color: theme.colors.textPrimary,
                        }}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={{
                          ...theme.typography.caption,
                          color: theme.colors.textSecondary,
                        }}
                      >
                        {item.projectName}
                      </Text>
                    </View>
                    <StatusPill label={statusLabel} />
                  </View>

                  <View
                    style={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: theme.colors.surfaceMuted,
                    }}
                  >
                    <View
                      style={{
                        marginLeft: `${left}%`,
                        width: `${Math.min(width, 100 - left)}%`,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: theme.colors.accent,
                      }}
                    />
                  </View>

                  <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>
                    {item.start} — {item.end}
                  </Text>
                </View>
              );
            })
          : null}
      </ScrollView>
    </ScreenShell>
  );
}
