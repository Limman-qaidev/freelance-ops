import { router } from 'expo-router';
import { useContext, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Project } from '@/domain/projects/project';
import type { TimerSession } from '@/domain/time-tracking/work-interval';
import { useUiCopy } from '@/i18n/use-ui-copy';
import { useApplication } from '@/providers/application-context';
import { ActionButton } from '@/ui/components/action-button';
import { AppIcon } from '@/ui/components/app-icon';
import { lightTheme, type AppTheme } from '@/ui/theme/theme';
import { ThemeContext } from '@/ui/theme/theme-provider';

type ProjectCard = {
  project: Project;
  clientName: string;
  progressPct: number | null;
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

function projectMonogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'FO';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatDate(date: string, language: 'es' | 'en'): string {
  const parsed = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function formatToday(language: 'es' | 'en'): string {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
}

export default function TodayScreen() {
  const { clientService, projectService, taskService, timeTrackingService } = useApplication();
  const { language, t } = useUiCopy();
  const theme = useContext(ThemeContext)?.theme ?? lightTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [projectCards, setProjectCards] = useState<ProjectCard[]>([]);
  const [activeSession, setActiveSession] = useState<TimerSession | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeClientName, setActiveClientName] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [pickerVisible, setPickerVisible] = useState(false);
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
            const [client, tasks] = await Promise.all([
              clientService.getById(project.clientId),
              taskService.listTasksForProject(project.id),
            ]);
            const relevantTasks = tasks.filter((task) => task.status !== 'CANCELLED');
            const completedTasks = relevantTasks.filter((task) => task.status === 'COMPLETED');
            const progressPct =
              relevantTasks.length > 0
                ? Math.round((completedTasks.length / relevantTasks.length) * 100)
                : null;

            return {
              project,
              clientName: client?.name ?? '',
              progressPct,
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
              (await clientService.getById(sessionProject.clientId))?.name ?? '';
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
        if (mounted) setError(t('today.loadError'));
      });

    return () => {
      mounted = false;
    };
  }, [clientService, projectService, taskService, timeTrackingService, t]);

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
      setError(t('today.pauseError'));
    }
  }

  async function resume() {
    try {
      const session = await timeTrackingService.resumeWork();
      setActiveSession(session);
      setElapsedMs(await timeTrackingService.getElapsedDuration(new Date().toISOString()));
    } catch {
      setError(t('today.resumeError'));
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
      setError(t('today.stopError'));
    }
  }

  function openStartWork(projectId: string) {
    setPickerVisible(false);
    router.push({
      pathname: '/start-work' as never,
      params: { projectId },
    });
  }

  const activeCountLabel =
    language === 'es'
      ? `${projectCards.length} activo${projectCards.length === 1 ? '' : 's'}`
      : `${projectCards.length} active`;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{t('nav.today')}</Text>
            <Text style={styles.date}>{formatToday(language)}</Text>
          </View>
          <View style={styles.offlineChip}>
            <AppIcon name="wifiOff" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.offlineText}>{t('common.offline')}</Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {activeSession ? (
          <View style={styles.timerCard}>
            <View style={styles.timerTopRow}>
              <View
                style={[
                  styles.timerStatus,
                  activeSession.state === 'RUNNING'
                    ? styles.timerStatusRunning
                    : styles.timerStatusPaused,
                ]}
              >
                <AppIcon
                  name={activeSession.state === 'RUNNING' ? 'play' : 'pause'}
                  size={14}
                  color={
                    activeSession.state === 'RUNNING'
                      ? theme.colors.accent
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.timerStatusText,
                    {
                      color:
                        activeSession.state === 'RUNNING'
                          ? theme.colors.accent
                          : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {activeSession.state === 'RUNNING'
                    ? t('timer.running')
                    : t('timer.paused')}
                </Text>
              </View>
            </View>
            <Text style={styles.timerProject}>
              {activeProject?.name ?? t('startWork.project')}
            </Text>
            {activeClientName ? <Text style={styles.timerClient}>{activeClientName}</Text> : null}
            <Text style={styles.timerValue}>{formatDuration(elapsedMs)}</Text>
            <View style={styles.timerActions}>
              <View style={styles.timerAction}>
                {activeSession.state === 'RUNNING' ? (
                  <ActionButton
                    label={t('timer.pause')}
                    leadingIcon="pause"
                    variant="secondary"
                    onPress={() => void pause()}
                  />
                ) : (
                  <ActionButton
                    label={t('timer.resume')}
                    leadingIcon="play"
                    onPress={() => void resume()}
                  />
                )}
              </View>
              <View style={styles.timerAction}>
                <ActionButton
                  label={t('timer.stop')}
                  leadingIcon="stop"
                  variant="danger"
                  onPress={() => void stop()}
                />
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('today.activeProjects')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('nav.projects')}
            onPress={() => router.push('/projects' as never)}
            style={styles.sectionMetaAction}
          >
            <Text style={styles.sectionMeta}>{activeCountLabel}</Text>
            <AppIcon name="chevronRight" size={17} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        {projectCards.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <AppIcon name="projects" size={22} color={theme.colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>{t('today.noActiveProjects')}</Text>
            <Text style={styles.emptyBody}>{t('today.noActiveProjectsBody')}</Text>
            <ActionButton
              label={t('common.createProject')}
              leadingIcon="add"
              onPress={() => router.push('/projects' as never)}
            />
          </View>
        ) : (
          <View style={styles.projectList}>
            {projectCards.map(({ project, clientName, progressPct }) => {
              const active = project.status === 'ACTIVE';
              return (
                <Pressable
                  key={project.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Start work on ${project.name}`}
                  onPress={() => openStartWork(project.id)}
                  style={({ pressed }) => [
                    styles.projectCard,
                    pressed && styles.projectCardPressed,
                  ]}
                >
                  <View style={styles.projectTopRow}>
                    <View style={styles.projectAvatar}>
                      <Text style={styles.projectAvatarText}>{projectMonogram(project.name)}</Text>
                    </View>
                    <View style={styles.projectMain}>
                      <Text numberOfLines={1} style={styles.projectName}>
                        {project.name}
                      </Text>
                      <Text numberOfLines={1} style={styles.projectDescription}>
                        {project.description || clientName}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: active
                            ? '#E7F8EF'
                            : theme.colors.accentSoft,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: active
                              ? theme.colors.success
                              : theme.colors.accent,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: active
                              ? theme.colors.success
                              : theme.colors.accent,
                          },
                        ]}
                      >
                        {active ? t('common.active') : t('common.planned')}
                      </Text>
                    </View>
                  </View>

                  {progressPct !== null ? (
                    <View style={styles.progressRow}>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.min(100, Math.max(0, progressPct))}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>{progressPct}%</Text>
                    </View>
                  ) : null}

                  <View style={styles.projectFooter}>
                    <AppIcon name="calendar" size={15} color={theme.colors.textMuted} />
                    <Text style={styles.dueText}>
                      {project.plannedEndDate
                        ? `${t('common.due')} ${formatDate(project.plannedEndDate, language)}`
                        : t('common.noDueDate')}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {projectCards.length > 0 ? (
          <ActionButton
            label={t('today.selectProjectToStartWork')}
            leadingIcon="play"
            onPress={() => setPickerVisible(true)}
          />
        ) : null}
      </ScrollView>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable style={styles.modalScrim} onPress={() => setPickerVisible(false)}>
          <Pressable style={styles.pickerSheet} onPress={() => undefined}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{t('today.projectPickerTitle')}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                onPress={() => setPickerVisible(false)}
                style={styles.pickerClose}
              >
                <AppIcon name="close" size={20} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            {projectCards.map(({ project }) => (
              <Pressable
                key={project.id}
                accessibilityRole="button"
                accessibilityLabel={`Choose ${project.name}`}
                onPress={() => openStartWork(project.id)}
                style={({ pressed }) => [
                  styles.pickerRow,
                  pressed && { backgroundColor: theme.colors.surfaceMuted },
                ]}
              >
                <View style={styles.pickerAvatar}>
                  <Text style={styles.pickerAvatarText}>{projectMonogram(project.name)}</Text>
                </View>
                <Text style={styles.pickerProjectName}>{project.name}</Text>
                <AppIcon name="chevronRight" size={18} color={theme.colors.textMuted} />
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 24,
      gap: 12,
    },
    header: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerCopy: {
      flex: 1,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 24,
      lineHeight: 29,
      fontWeight: '700',
    },
    date: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 1,
    },
    offlineChip: {
      minHeight: 32,
      paddingHorizontal: 10,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceMuted,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    offlineText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    error: {
      color: theme.colors.error,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600',
    },
    timerCard: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      padding: 14,
      gap: 6,
      elevation: 1,
    },
    timerTopRow: {
      flexDirection: 'row',
    },
    timerStatus: {
      minHeight: 24,
      borderRadius: 12,
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    timerStatusRunning: {
      backgroundColor: theme.colors.accentSoft,
    },
    timerStatusPaused: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    timerStatusText: {
      fontSize: 11,
      lineHeight: 15,
      fontWeight: '700',
    },
    timerProject: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      lineHeight: 21,
      fontWeight: '700',
      marginTop: 2,
    },
    timerClient: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    timerValue: {
      color: theme.colors.textPrimary,
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      marginVertical: 4,
    },
    timerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    timerAction: {
      flex: 1,
    },
    sectionHeader: {
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      lineHeight: 21,
      fontWeight: '700',
    },
    sectionMetaAction: {
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingLeft: 8,
    },
    sectionMeta: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
    },
    projectList: {
      gap: 9,
    },
    projectCard: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      padding: 12,
      gap: 10,
      elevation: 1,
    },
    projectCardPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    projectTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    projectAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    projectAvatarText: {
      color: theme.colors.accent,
      fontSize: 15,
      fontWeight: '800',
    },
    projectMain: {
      flex: 1,
      minWidth: 0,
    },
    projectName: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: '700',
    },
    projectDescription: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 1,
    },
    statusPill: {
      minHeight: 23,
      borderRadius: 12,
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '700',
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingLeft: 52,
    },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.surfaceMuted,
      flex: 1,
      overflow: 'hidden',
    },
    progressFill: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.accent,
    },
    progressText: {
      width: 34,
      textAlign: 'right',
      color: theme.colors.textSecondary,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: '600',
    },
    projectFooter: {
      paddingLeft: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dueText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      lineHeight: 15,
    },
    emptyCard: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      padding: 16,
      gap: 8,
    },
    emptyIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accentSoft,
    },
    emptyTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
    },
    emptyBody: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    modalScrim: {
      flex: 1,
      backgroundColor: theme.colors.scrim,
      justifyContent: 'flex-end',
    },
    pickerSheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 28,
      gap: 4,
    },
    pickerHeader: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pickerTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '700',
    },
    pickerClose: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },
    pickerRow: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 10,
      paddingHorizontal: 8,
    },
    pickerAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerAvatarText: {
      color: theme.colors.accent,
      fontSize: 12,
      fontWeight: '800',
    },
    pickerProjectName: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: '600',
      flex: 1,
    },
  });
}
