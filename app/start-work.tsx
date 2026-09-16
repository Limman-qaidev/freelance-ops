import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Activity } from '@/domain/activities/activity';
import type { Project } from '@/domain/projects/project';
import type { Task } from '@/domain/tasks/task';
import { useApplication } from '@/providers/application-context';
import { ActionButton } from '@/ui/components/action-button';
import { ScreenShell } from '@/ui/components/screen-shell';
import { SelectionChip } from '@/ui/components/selection-chip';
import { colors, radii, spacing, typography } from '@/ui/theme/tokens';

function isTrackableProject(project: Project): boolean {
  return project.status === 'PLANNED' || project.status === 'ACTIVE';
}

function isTrackableTask(task: Task): boolean {
  return task.status === 'PENDING' || task.status === 'IN_PROGRESS';
}

export default function StartWorkScreen() {
  const { projectId: projectParam } = useLocalSearchParams<{
    projectId?: string | string[];
  }>();
  const { projectService, taskService, activityService, timeTrackingService } = useApplication();
  const requestedProjectId = Array.isArray(projectParam) ? projectParam[0] : projectParam;

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [conflictVisible, setConflictVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    void Promise.all([
      projectService.listActiveProjects(),
      activityService.listActive(),
    ])
      .then(async ([allProjects, activeActivities]) => {
        const trackableProjects = allProjects.filter(isTrackableProject);
        const initialProjectId =
          trackableProjects.find((project) => project.id === requestedProjectId)?.id ??
          trackableProjects[0]?.id ??
          null;
        const initialTasks = initialProjectId
          ? (await taskService.listTasksForProject(initialProjectId)).filter(isTrackableTask)
          : [];

        if (!mounted) return;
        setProjects(trackableProjects);
        setActivities(activeActivities);
        setSelectedProjectId(initialProjectId);
        setTasks(initialTasks);
      })
      .catch(() => {
        if (mounted) setError('Unable to prepare the local Start Work form.');
      });

    return () => {
      mounted = false;
    };
  }, [activityService, projectService, requestedProjectId, taskService]);

  async function selectProject(projectId: string) {
    setSelectedProjectId(projectId);
    setSelectedTaskId(null);
    try {
      const projectTasks = await taskService.listTasksForProject(projectId);
      setTasks(projectTasks.filter(isTrackableTask));
    } catch {
      setTasks([]);
      setError('Unable to load tasks for the selected project.');
    }
  }

  async function startSelected() {
    if (!selectedProjectId) return;
    await timeTrackingService.startWork({
      projectId: selectedProjectId,
      taskId: selectedTaskId,
      activityId: selectedActivityId,
      description: description.trim() || null,
    });
    router.replace('/' as never);
  }

  async function requestStart() {
    if (!selectedProjectId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const activeSession = await timeTrackingService.getActiveSession();
      if (activeSession) {
        setConflictVisible(true);
        return;
      }
      await startSelected();
    } catch {
      setError('Unable to start this work session.');
    } finally {
      setBusy(false);
    }
  }

  async function stopCurrentAndStart() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await timeTrackingService.stopWork();
      setConflictVisible(false);
      await startSelected();
    } catch {
      setError('Unable to replace the current work session.');
    } finally {
      setBusy(false);
    }
  }

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;

  return (
    <ScreenShell
      title="Start Work"
      subtitle="Project is enough to begin. Task, activity and notes can stay empty."
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Project</Text>
        {selectedProject ? (
          <View style={styles.selectedProjectCard}>
            <Text style={styles.projectName}>{selectedProject.name}</Text>
            <Text style={styles.muted}>{selectedProject.status === 'PLANNED' ? 'Planned' : 'Active'}</Text>
          </View>
        ) : (
          <Text style={styles.muted}>No trackable project is available.</Text>
        )}
        <View style={styles.chips}>
          {projects.map((project) => (
            <SelectionChip
              key={project.id}
              label={project.name}
              selected={project.id === selectedProjectId}
              accessibilityLabel={`Select project ${project.name}`}
              onPress={() => void selectProject(project.id)}
            />
          ))}
        </View>

        <Text style={styles.label}>Task (optional)</Text>
        <View style={styles.chips}>
          {tasks.map((task) => (
            <SelectionChip
              key={task.id}
              label={task.name}
              selected={task.id === selectedTaskId}
              accessibilityLabel={`Select task ${task.name}`}
              onPress={() => setSelectedTaskId(task.id === selectedTaskId ? null : task.id)}
            />
          ))}
        </View>
        {selectedProjectId && tasks.length === 0 ? (
          <Text style={styles.muted}>No open tasks. You can still start at project level.</Text>
        ) : null}

        <Text style={styles.label}>Activity (optional)</Text>
        <View style={styles.chips}>
          {activities.map((activity) => (
            <SelectionChip
              key={activity.id}
              label={activity.name}
              selected={activity.id === selectedActivityId}
              accessibilityLabel={`Select activity ${activity.name}`}
              onPress={() =>
                setSelectedActivityId(activity.id === selectedActivityId ? null : activity.id)
              }
            />
          ))}
        </View>

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="What are you working on?"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <ActionButton
          label={busy ? 'Starting…' : 'Start Work'}
          accessibilityLabel="Start Work"
          onPress={() => void requestStart()}
        />
        <ActionButton label="Back" variant="secondary" onPress={() => router.back()} />

        {conflictVisible ? (
          <View style={styles.conflictCard}>
            <Text style={styles.conflictTitle}>Timer already active</Text>
            <Text style={styles.muted}>
              Stop the current session before starting the selected project, or cancel and keep it running.
            </Text>
            <ActionButton
              label="Stop current & start selected"
              variant="danger"
              onPress={() => void stopCurrentAndStart()}
            />
            <ActionButton
              label="Cancel"
              variant="secondary"
              onPress={() => setConflictVisible(false)}
            />
          </View>
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  label: {
    color: colors.textPrimary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  selectedProjectCard: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  projectName: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle,
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  input: {
    minHeight: 88,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body,
    textAlignVertical: 'top',
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  conflictCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  conflictTitle: {
    color: '#991B1B',
    fontSize: typography.sectionTitle,
    fontWeight: '700',
  },
  error: {
    color: '#B91C1C',
    fontSize: typography.caption,
    fontWeight: '600',
  },
});
