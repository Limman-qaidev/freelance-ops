import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Project } from '@/domain/projects/project';
import type { TimerSession } from '@/domain/time-tracking/work-interval';
import { useApplication } from '@/providers/application-context';
import { ActionButton } from '@/ui/components/action-button';
import { ScreenShell } from '@/ui/components/screen-shell';
import { colors, radii, spacing, typography } from '@/ui/theme/tokens';

type ProjectCard = {
  project: Project;
  clientName: string;
};

function isTrackable(project: Project): boolean {
  return project.status === 'PLANNED' || project.status === 'ACTIVE';
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':');
}

export default function TodayScreen() {
  const { clientService, projectService, timeTrackingService } = useApplication();
  const [projectCards, setProjectCards] = useState<ProjectCard[]>([]);
  const [activeSession, setActiveSession] = useState<TimerSession | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeClientName, setActiveClientName] = useState<string>('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void Promise.all([
      projectService.listActiveProjects(),
      timeTrackingService.getActiveSession(),
    ])
      .then(async ([projects, session]) => {
        const trackableProjects = projects.filter(isTrackable);
        const cards = await Promise.all(
          trackableProjects.map(async (project) => {
            const client = await clientService.getById(project.clientId);
            return {
              project,
              clientName: client?.name ?? 'Unknown client',
            };
          }),
        );

        let sessionProject: Project | null = null;
        let sessionClientName = '';
        let duration = 0;
        if (session) {
          sessionProject =
            projects.find((project) => project.id === session.timeEntry.projectId) ??
            (await projectService.getById(session.timeEntry.projectId));
          if (sessionProject) {
            sessionClientName =
              (await clientService.getById(sessionProject.clientId))?.name ?? 'Unknown client';
          }
          duration = await timeTrackingService.getElapsedDuration(new Date().toISOString());
        }

        if (!mounted) return;
        setProjectCards(cards);
        setActiveSession(session);
        setActiveProject(sessionProject);
        setActiveClientName(sessionClientName);
        setElapsedMs(duration);
      })
      .catch(() => {
        if (mounted) setError('Unable to load your local work state.');
      });

    return () => {
      mounted = false;
    };
  }, [clientService, projectService, timeTrackingService]);

  useEffect(() => {
    if (!activeSession || activeSession.state !== 'RUNNING') return undefined;

    let mounted = true;
    const intervalId = setInterval(() => {
      void timeTrackingService
        .getElapsedDuration(new Date().toISOString())
        .then((duration) => {
          if (mounted) setElapsedMs(duration);
        });
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [activeSession, timeTrackingService]);

  async function pause() {
    try {
      const session = await timeTrackingService.pauseWork();
      setActiveSession(session);
      setElapsedMs(await timeTrackingService.getElapsedDuration(new Date().toISOString()));
    } catch {
      setError('Unable to pause the current timer.');
    }
  }

  async function resume() {
    try {
      const session = await timeTrackingService.resumeWork();
      setActiveSession(session);
      setElapsedMs(await timeTrackingService.getElapsedDuration(new Date().toISOString()));
    } catch {
      setError('Unable to resume the current timer.');
    }
  }

  async function stop() {
    try {
      await timeTrackingService.stopWork();
      setActiveSession(null);
      setActiveProject(null);
      setActiveClientName('');
      setElapsedMs(0);
    } catch {
      setError('Unable to stop the current timer.');
    }
  }

  function openStartWork(projectId: string) {
    router.push({
      pathname: '/start-work' as never,
      params: { projectId },
    });
  }

  return (
    <ScreenShell
      title="Today"
      subtitle="Choose a project and start tracking in seconds. Add structure only when it helps."
    >
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {activeSession ? (
          <View style={styles.activeCard}>
            <Text style={styles.eyebrow}>Active session</Text>
            <Text style={styles.activeTitle}>{activeProject?.name ?? 'Current project'}</Text>
            {activeClientName ? <Text style={styles.muted}>{activeClientName}</Text> : null}
            <Text style={styles.timer}>{formatDuration(elapsedMs)}</Text>
            <Text style={styles.stateLabel}>{activeSession.state === 'PAUSED' ? 'Paused' : 'Running'}</Text>
            <View style={styles.actions}>
              {activeSession.state === 'RUNNING' ? (
                <ActionButton label="Pause" onPress={() => void pause()} />
              ) : (
                <ActionButton label="Resume" onPress={() => void resume()} />
              )}
              <ActionButton label="Stop" variant="secondary" onPress={() => void stop()} />
            </View>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active projects</Text>
          <Text style={styles.muted}>Tap one to prepare a work session.</Text>
        </View>

        {projectCards.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.cardTitle}>No trackable projects yet</Text>
            <Text style={styles.muted}>Create or reactivate a project from Projects.</Text>
          </View>
        ) : (
          projectCards.map(({ project, clientName }) => (
            <Pressable
              key={project.id}
              accessibilityRole="button"
              accessibilityLabel={`Start work on ${project.name}`}
              onPress={() => openStartWork(project.id)}
              style={styles.projectCard}
            >
              <View style={styles.projectHeader}>
                <View style={styles.projectCopy}>
                  <Text style={styles.cardTitle}>{project.name}</Text>
                  <Text style={styles.muted}>{clientName}</Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>{project.status === 'PLANNED' ? 'Planned' : 'Active'}</Text>
                </View>
              </View>
              {project.plannedEndDate ? (
                <Text style={styles.meta}>Target {project.plannedEndDate}</Text>
              ) : null}
              <Text style={styles.startHint}>Start work →</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  activeCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.success,
    fontSize: typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  activeTitle: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle,
    fontWeight: '700',
  },
  timer: {
    color: colors.textPrimary,
    fontSize: 32,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  stateLabel: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sectionHeader: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle,
    fontWeight: '700',
  },
  projectCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  projectCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: '700',
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  meta: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  statusPill: {
    backgroundColor: '#EFF6FF',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusText: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  startHint: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: '700',
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
