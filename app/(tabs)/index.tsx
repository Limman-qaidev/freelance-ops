import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Project } from '@/domain/projects/project';
import type { TimerSession } from '@/domain/time-tracking/work-interval';
import { useI18n } from '@/i18n/use-i18n';
import { useApplication } from '@/providers/application-context';
import { ActionButton } from '@/ui/components/action-button';
import { ActiveTimerCard } from '@/ui/components/active-timer-card';
import { AppHeader } from '@/ui/components/app-header';
import { EmptyState } from '@/ui/components/empty-state';
import { ProjectRow } from '@/ui/components/project-row';
import { SectionHeader } from '@/ui/components/section-header';
import { useTheme } from '@/ui/theme/use-theme';

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

function localeFor(language: 'es' | 'en'): string {
  return language === 'es' ? 'es-ES' : 'en-US';
}

function formatToday(language: 'es' | 'en'): string {
  return new Intl.DateTimeFormat(localeFor(language), {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(new Date());
}

function formatProjectDate(value: string, language: 'es' | 'en'): string {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat(localeFor(language), {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export default function TodayScreen() {
  const { clientService, projectService, timeTrackingService } = useApplication();
  const { language, t } = useI18n();
  const { theme } = useTheme();
  const [projectCards, setProjectCards] = useState<ProjectCard[]>([]);
  const [activeSession, setActiveSession] = useState<TimerSession | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeClientName, setActiveClientName] = useState('');
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
              clientName: client?.name ?? t('common.unknownClient'),
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
              (await clientService.getById(sessionProject.clientId))?.name ??
              t('common.unknownClient');
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
        if (mounted) setError(t('today.errorLoad'));
      });

    return () => {
      mounted = false;
    };
  }, [clientService, projectService, t, timeTrackingService]);

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
      setError(null);
    } catch {
      setError(t('today.errorPause'));
    }
  }

  async function resume() {
    try {
      const session = await timeTrackingService.resumeWork();
      setActiveSession(session);
      setElapsedMs(await timeTrackingService.getElapsedDuration(new Date().toISOString()));
      setError(null);
    } catch {
      setError(t('today.errorResume'));
    }
  }

  async function stop() {
    try {
      await timeTrackingService.stopWork();
      setActiveSession(null);
      setActiveProject(null);
      setActiveClientName('');
      setElapsedMs(0);
      setError(null);
    } catch {
      setError(t('today.errorStop'));
    }
  }

  function openStartWork(projectId: string) {
    router.push({
      pathname: '/start-work' as never,
      params: { projectId },
    });
  }

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
        }}
      >
        <AppHeader title={t('nav.today')} subtitle={formatToday(language)} />

        {error ? (
          <Text
            accessibilityRole="alert"
            style={{
              ...theme.typography.caption,
              color: theme.colors.error,
              marginTop: theme.spacing.sm,
            }}
          >
            {error}
          </Text>
        ) : null}

        {activeSession ? (
          <View style={{ marginTop: theme.spacing.lg }}>
            <ActiveTimerCard
              projectName={activeProject?.name ?? t('today.currentProject')}
              context={activeClientName || undefined}
              elapsed={formatDuration(elapsedMs)}
              status={activeSession.state === 'PAUSED' ? 'paused' : 'running'}
              statusLabel={
                activeSession.state === 'PAUSED' ? t('timer.paused') : t('timer.running')
              }
              pauseLabel={t('timer.pause')}
              resumeLabel={t('timer.resume')}
              stopLabel={t('timer.stop')}
              onPause={() => void pause()}
              onResume={() => void resume()}
              onStop={() => void stop()}
            />
          </View>
        ) : null}

        <View style={{ marginTop: activeSession ? theme.spacing.xl : theme.spacing.lg }}>
          <SectionHeader title={t('today.activeProjects')} />
          <View style={{ marginTop: theme.spacing.sm, gap: theme.spacing.sm }}>
            {projectCards.length === 0 ? (
              <EmptyState
                title={t('today.noActiveProjects')}
                body={t('today.noActiveProjectsBody')}
                actionLabel={t('common.createProject')}
                onActionPress={() => router.push('/projects' as never)}
              />
            ) : (
              projectCards.map(({ project, clientName }) => {
                const statusLabel =
                  project.status === 'PLANNED' ? t('project.planned') : t('project.active');
                const metadata = project.plannedEndDate
                  ? `${t('today.target')} ${formatProjectDate(project.plannedEndDate, language)}`
                  : undefined;

                return (
                  <ProjectRow
                    key={project.id}
                    projectName={project.name}
                    clientName={clientName}
                    statusLabel={statusLabel}
                    metadata={metadata}
                    trailingIcon="play"
                    accessibilityLabel={`${t('today.startWorkOn')} ${project.name}`}
                    onPress={() => openStartWork(project.id)}
                  />
                );
              })
            )}
          </View>
        </View>

        <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.sm }}>
          <ActionButton
            label={t('common.addManualTime')}
            accessibilityLabel={t('common.addManualTime')}
            variant="secondary"
            onPress={() => router.push('/time-entry/new' as never)}
          />
          <ActionButton
            label={t('common.addExpense')}
            accessibilityLabel={t('common.addExpense')}
            variant="secondary"
            onPress={() => router.push('/expense/edit' as never)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
