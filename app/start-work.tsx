import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { Activity } from '@/domain/activities/activity';
import type { Project } from '@/domain/projects/project';
import type { Task } from '@/domain/tasks/task';
import { useUiCopy } from '@/i18n/use-ui-copy';
import { useApplication } from '@/providers/application-context';
import { ActionButton } from '@/ui/components/action-button';
import { IconButton } from '@/ui/components/icon-button';
import { SelectionRow, TextField } from '@/ui/components/form-fields';
import { ScreenShell } from '@/ui/components/screen-shell';
import { useTheme } from '@/ui/theme/use-theme';

const trackableProject = (project: Project) =>
  project.status === 'PLANNED' || project.status === 'ACTIVE';

const trackableTask = (task: Task) =>
  task.status === 'PENDING' || task.status === 'IN_PROGRESS';

export default function StartWorkScreen() {
  const { projectId: rawProjectId } = useLocalSearchParams<{
    projectId?: string | string[];
  }>();
  const requestedProjectId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId;
  const { projectService, taskService, activityService, timeTrackingService } = useApplication();
  const { theme } = useTheme();
  const t = useUiCopy();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [chooser, setChooser] = useState<'task' | 'activity' | 'project' | null>(null);
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([projectService.listActiveProjects(), activityService.listActive()])
      .then(async ([allProjects, activeActivities]) => {
        const availableProjects = allProjects.filter(trackableProject);
        const nextProjectId =
          availableProjects.find((project) => project.id === requestedProjectId)?.id ??
          availableProjects[0]?.id ??
          null;

        setProjects(availableProjects);
        setActivities(activeActivities);
        setProjectId(nextProjectId);
        setTasks(
          nextProjectId
            ? (await taskService.listTasksForProject(nextProjectId)).filter(trackableTask)
            : [],
        );
      })
      .catch(() =>
        setError(
          t(
            'startWork.prepareError',
            'Unable to prepare the local Start Work form.',
          ),
        ),
      );
  }, [activityService, projectService, requestedProjectId, taskService, t]);

  async function selectProject(id: string) {
    setProjectId(id);
    setTaskId(null);
    setTasks((await taskService.listTasksForProject(id)).filter(trackableTask));
    setChooser(null);
  }

  const selectedProject = projects.find((project) => project.id === projectId);
  const selectedTask = tasks.find((task) => task.id === taskId);
  const selectedActivity = activities.find((activity) => activity.id === activityId);

  async function start() {
    if (!projectId) return;
    await timeTrackingService.startWork({
      projectId,
      taskId,
      activityId,
      description: description.trim() || null,
    });
    router.replace('/' as never);
  }

  async function requestStart() {
    if (!projectId || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (await timeTrackingService.getActiveSession()) {
        setConflict(true);
      } else {
        await start();
      }
    } catch {
      setError(t('startWork.startError', 'Unable to start this work session.'));
    } finally {
      setBusy(false);
    }
  }

  async function replaceCurrent() {
    setBusy(true);
    setError(null);
    try {
      await timeTrackingService.stopWork();
      await start();
    } catch {
      setError(
        t(
          'startWork.replaceError',
          'Unable to replace the current work session.',
        ),
      );
      setBusy(false);
    }
  }

  const itemList =
    chooser === 'project' ? projects : chooser === 'task' ? tasks : activities;

  return (
    <ScreenShell
      title={t('startWork.title', 'Start Work')}
      subtitle={t(
        'startWork.subtitle',
        'Project is required; task, activity and description are optional.',
      )}
    >
      <ScrollView
        contentContainerStyle={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <IconButton
            icon="back"
            accessibilityLabel={t('startWork.back', 'Back')}
            onPress={() => router.back()}
          />
          <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
            {t('startWork.contextHelp', 'Choose the context for this work session')}
          </Text>
        </View>

        {error ? (
          <Text
            accessibilityRole="alert"
            style={{ ...theme.typography.caption, color: theme.colors.error }}
          >
            {error}
          </Text>
        ) : null}

        <View
          style={{
            padding: theme.spacing.md,
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.border,
            borderWidth: 1,
            gap: theme.spacing.xs,
          }}
        >
          <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
            {t('startWork.project', 'Project')}
          </Text>
          <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>
            {selectedProject?.name ??
              t('startWork.noTrackableProject', 'No trackable project')}
          </Text>
          <Pressable
            onPress={() => setChooser(chooser === 'project' ? null : 'project')}
            accessibilityRole="button"
            accessibilityLabel={t('startWork.changeProject', 'Change project')}
            style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}
          >
            <Text style={{ ...theme.typography.caption, color: theme.colors.accent }}>
              {t('startWork.changeProject', 'Change project')}
            </Text>
          </Pressable>
        </View>

        <SelectionRow
          label={t('startWork.taskOptional', 'Task (optional)')}
          accessibilityLabel={t('startWork.task', 'Task')}
          value={selectedTask?.name ?? t('common.none', 'None')}
          onPress={() => setChooser(chooser === 'task' ? null : 'task')}
        />
        <SelectionRow
          label={t('startWork.activityOptional', 'Activity (optional)')}
          accessibilityLabel={t('startWork.activity', 'Activity')}
          value={selectedActivity?.name ?? t('common.none', 'None')}
          onPress={() => setChooser(chooser === 'activity' ? null : 'activity')}
        />

        {chooser ? (
          <View
            style={{
              gap: theme.spacing.sm,
              padding: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.surface,
            }}
          >
            {itemList.length === 0 ? (
              <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>
                {t('startWork.noOptions', 'No available options.')}
              </Text>
            ) : (
              itemList.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  onPress={() => {
                    if (chooser === 'project') {
                      void selectProject(item.id);
                    } else if (chooser === 'task') {
                      setTaskId(taskId === item.id ? null : item.id);
                      setChooser(null);
                    } else {
                      setActivityId(activityId === item.id ? null : item.id);
                      setChooser(null);
                    }
                  }}
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <Text style={{ ...theme.typography.body, color: theme.colors.textPrimary }}>
                    {item.name}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ) : null}

        <TextField
          label={t('startWork.descriptionOptional', 'Description (optional)')}
          accessibilityLabel={t('startWork.description', 'Description')}
          placeholder={t(
            'startWork.descriptionPlaceholder',
            'Add an optional note',
          )}
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <ActionButton
          label={
            busy
              ? t('startWork.starting', 'Starting…')
              : t('startWork.action', 'Start Work')
          }
          accessibilityLabel={t('startWork.action', 'Start Work')}
          disabled={!projectId || busy}
          onPress={() => void requestStart()}
        />

        {conflict ? (
          <View
            style={{
              padding: theme.spacing.lg,
              gap: theme.spacing.sm,
              borderRadius: theme.radii.lg,
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.borderStrong,
              borderWidth: 1,
            }}
          >
            <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>
              {t('startWork.timerActiveTitle', 'Timer already active')}
            </Text>
            <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
              {t(
                'startWork.timerActiveBody',
                'Stop the current session before starting this project, or cancel and keep it running.',
              )}
            </Text>
            <ActionButton
              label={t(
                'startWork.replaceAction',
                'Stop current & start selected',
              )}
              variant="danger"
              disabled={busy}
              onPress={() => void replaceCurrent()}
            />
            <ActionButton
              label={t('more.cancel', 'Cancel')}
              variant="secondary"
              disabled={busy}
              onPress={() => setConflict(false)}
            />
          </View>
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}
