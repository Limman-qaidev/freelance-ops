import { router, useFocusEffect as useExpoFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { Project } from '@/domain/projects/project';
import type { TimerSession } from '@/domain/time-tracking/work-interval';
import { useApplication } from '@/providers/application-context';
import { ActiveTimerCard } from '@/ui/components/active-timer-card';
import { AppIcon } from '@/ui/components/app-icon';
import { EmptyState } from '@/ui/components/empty-state';
import { ProjectRow } from '@/ui/components/project-row';
import { ScreenShell } from '@/ui/components/screen-shell';
import { SectionHeader } from '@/ui/components/section-header';
import { useUiCopy } from '@/i18n/use-ui-copy';
import { useTheme } from '@/ui/theme/use-theme';

type ProjectCard = { project: Project; clientName: string };
const useRefreshFocus = useExpoFocusEffect ?? ((callback: () => void | (() => void)) => useEffect(callback, [callback]));
const trackable = (project: Project) => project.status === 'PLANNED' || project.status === 'ACTIVE';
const formatDuration = (milliseconds: number) => [Math.floor(milliseconds / 3_600_000), Math.floor((milliseconds % 3_600_000) / 60_000), Math.floor((milliseconds % 60_000) / 1_000)].map((part) => String(Math.max(0, part)).padStart(2, '0')).join(':');

export default function TodayScreen() {
  const { clientService, projectService, timeTrackingService } = useApplication();
  const { theme } = useTheme();
  const t = useUiCopy();
  const [cards, setCards] = useState<ProjectCard[]>([]);
  const [session, setSession] = useState<TimerSession | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeClient, setActiveClient] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const active = await timeTrackingService.getActiveSession();
      setSession(active);
      if (active) {
        setElapsed(await timeTrackingService.getElapsedDuration(new Date().toISOString()));
      }
      const projects = await projectService.listActiveProjects();
      const nextCards = await Promise.all(projects.filter(trackable).map(async (project) => ({ project, clientName: (await clientService.getById(project.clientId))?.name ?? '—' })));
      setCards(nextCards);
      if (active) {
        const project = projects.find((item) => item.id === active.timeEntry.projectId) ?? await projectService.getById(active.timeEntry.projectId);
        setActiveProject(project ?? null);
        setActiveClient(project ? (await clientService.getById(project.clientId))?.name ?? '—' : '');
      }
    } catch {
      setError('Unable to refresh local work data. Timer controls remain available.');
    } finally { setLoading(false); }
  }, [clientService, projectService, timeTrackingService]);

  useRefreshFocus(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => {
    if (!session || session.state !== 'RUNNING') return;
    const interval = setInterval(() => void timeTrackingService.getElapsedDuration(new Date().toISOString()).then(setElapsed).catch(() => undefined), 1_000);
    return () => clearInterval(interval);
  }, [session, timeTrackingService]);

  async function pause() { try { setSession(await timeTrackingService.pauseWork()); } catch { setError('Unable to pause the current timer.'); } }
  async function resume() { try { setSession(await timeTrackingService.resumeWork()); } catch { setError('Unable to resume the current timer.'); } }
  async function stop() { try { await timeTrackingService.stopWork(); setSession(null); setElapsed(0); setActiveProject(null); setActiveClient(''); } catch { setError('Unable to stop the current timer.'); } }

  const date = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
  return <ScreenShell title={t('nav.today', 'Today')} subtitle={date}><ScrollView contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xxl }} keyboardShouldPersistTaps="handled">
    {error ? <View style={{ gap: theme.spacing.xs }}><Text accessibilityRole="alert" style={{ ...theme.typography.caption, color: theme.colors.error }}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Retry" onPress={() => void refresh()} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ ...theme.typography.caption, color: theme.colors.accent }}>Retry</Text></Pressable></View> : null}
    {session ? <ActiveTimerCard projectName={activeProject?.name ?? 'Current project'} context={activeClient} elapsed={formatDuration(elapsed)} status={session.state === 'PAUSED' ? 'paused' : 'running'} statusLabel={session.state === 'PAUSED' ? t('timer.paused', 'Paused') : t('timer.running', 'Running')} pauseLabel={t('timer.pause', 'Pause')} resumeLabel={t('timer.resume', 'Resume')} stopLabel={t('timer.stop', 'Stop')} onPause={() => void pause()} onResume={() => void resume()} onStop={() => void stop()} /> : null}
    <SectionHeader title={t('today.activeProjects', 'Active projects')} metadata={cards.length ? String(cards.length) : undefined} />
    {loading ? <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>Loading projects…</Text> : null}
    {!loading && !cards.length ? <EmptyState title={t('today.noActiveProjects', 'No active projects')} body={t('today.noActiveProjectsBody', 'Create a project to start tracking time.')} actionLabel={t('common.createProject', 'Create project')} onActionPress={() => router.push('/(tabs)/projects' as never)} /> : null}
    {cards.map(({ project, clientName }) => <ProjectRow key={project.id} projectName={project.name} clientName={clientName} statusLabel={project.status === 'PLANNED' ? 'Planned' : 'Active'} metadata={project.plannedEndDate ? `Due ${project.plannedEndDate}` : undefined} trailingIcon="play" accessibilityLabel={`Start work on ${project.name}`} onPress={() => router.push({ pathname: '/start-work' as never, params: { projectId: project.id } })} />)}
    <View style={{ gap: theme.spacing.sm }}><SectionHeader title="Quick actions" /><QuickAction label={t('common.addManualTime', 'Add manual time')} icon="manualTime" onPress={() => router.push('/time-entry/new' as never)} /><QuickAction label={t('common.addExpense', 'Add expense')} icon="expense" onPress={() => router.push('/expense/edit' as never)} /></View>
  </ScrollView></ScreenShell>;
}
function QuickAction({ label, icon, onPress }: { label: string; icon: 'manualTime' | 'expense'; onPress: () => void }) { const { theme } = useTheme(); return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ minHeight: 52, backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: theme.spacing.md })}><AppIcon name={icon} color={theme.colors.accent} /><Text style={{ flex: 1, ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>{label}</Text></Pressable>; }