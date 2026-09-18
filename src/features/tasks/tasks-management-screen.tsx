import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import type { Project } from '@/domain/projects/project';
import { TASK_STATUSES, type Task, type TaskStatus } from '@/domain/tasks/task';
import { useUiCopy } from '@/i18n/use-ui-copy';
import { useApplication } from '@/providers/application-context';
import { ActionButton } from '@/ui/components/action-button';
import { EmptyState } from '@/ui/components/empty-state';
import { TextField } from '@/ui/components/form-fields';
import { ScreenShell } from '@/ui/components/screen-shell';
import { SectionHeader } from '@/ui/components/section-header';
import { StatusPill } from '@/ui/components/status-pill';
import { useTheme } from '@/ui/theme/use-theme';

export function TasksManagementScreen() {
  const { projectService, taskService } = useApplication();
  const { theme } = useTheme();
  const t = useUiCopy();

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('');
  const [estimate, setEstimate] = useState('');
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedEnd, setPlannedEnd] = useState('');
  const [status, setStatus] = useState<TaskStatus>('PENDING');

  const statusLabel = useCallback(
    (value: TaskStatus) => {
      switch (value) {
        case 'PENDING':
          return t('status.pending', 'Pending');
        case 'IN_PROGRESS':
          return t('status.inProgress', 'In progress');
        case 'COMPLETED':
          return t('status.completed', 'Completed');
        case 'CANCELLED':
          return t('status.cancelled', 'Cancelled');
      }
    },
    [t],
  );

  const load = useCallback(async () => {
    const nextProjects = await projectService.listActiveProjects();
    setProjects(nextProjects);
    const nextProjectId = projectId ?? nextProjects[0]?.id ?? null;
    setProjectId(nextProjectId);
    setTasks(nextProjectId ? await taskService.listTasksForProject(nextProjectId) : []);
  }, [projectId, projectService, taskService]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  function reset() {
    setEditing(null);
    setName('');
    setDescription('');
    setPriority('');
    setEstimate('');
    setPlannedStart('');
    setPlannedEnd('');
    setStatus('PENDING');
    setShowForm(false);
  }

  async function save() {
    if (!projectId || !name.trim()) return;

    const common = {
      projectId,
      name: name.trim(),
      description: description.trim() || null,
      priority: priority.trim() || null,
      estimatedMinutes: estimate.trim() ? Number(estimate) : null,
      plannedStartDate: plannedStart.trim() || null,
      plannedEndDate: plannedEnd.trim() || null,
    };

    if (editing) {
      const current = tasks.find((item) => item.id === editing);
      if (!current) return;
      await taskService.update({
        id: editing,
        ...common,
        status,
        actualStartDate: current.actualStartDate,
        actualEndDate: current.actualEndDate,
      });
    } else {
      await taskService.create(common);
    }

    reset();
    await load();
  }

  function edit(task: Task) {
    setEditing(task.id);
    setName(task.name);
    setDescription(task.description ?? '');
    setPriority(task.priority ?? '');
    setEstimate(task.estimatedMinutes?.toString() ?? '');
    setPlannedStart(task.plannedStartDate ?? '');
    setPlannedEnd(task.plannedEndDate ?? '');
    setStatus(task.status);
    setShowForm(true);
  }

  return (
    <ScreenShell title={t('tasks.title', 'Tasks')} subtitle={t('tasks.subtitle', 'Work items grouped by project')}>
      <ScrollView
        contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <SectionHeader title={t('tasks.project', 'Project')} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {projects.map((project) => (
            <Pressable
              key={project.id}
              accessibilityRole="button"
              accessibilityState={{ selected: projectId === project.id }}
              accessibilityLabel={project.name}
              onPress={() => setProjectId(project.id)}
              style={({ pressed }) => ({
                minHeight: 44,
                paddingHorizontal: theme.spacing.md,
                justifyContent: 'center',
                borderRadius: theme.radii.md,
                borderWidth: 1,
                borderColor: projectId === project.id ? theme.colors.accent : theme.colors.border,
                backgroundColor: pressed
                  ? theme.colors.surfaceMuted
                  : projectId === project.id
                    ? theme.colors.accentSoft
                    : theme.colors.surface,
              })}
            >
              <Text style={{ ...theme.typography.caption, color: theme.colors.textPrimary }}>
                {project.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <SectionHeader
          title={t('tasks.title', 'Tasks')}
          metadata={String(tasks.length)}
          actionLabel={t('tasks.add', 'Add task')}
          onActionPress={() => setShowForm(true)}
        />

        {!projects.length ? (
          <EmptyState
            title={t('tasks.createProjectFirstTitle', 'Create a project first')}
            body={t(
              'tasks.createProjectFirstBody',
              'Tasks belong to a project and appear here when you add them.',
            )}
          />
        ) : tasks.length === 0 ? (
          <EmptyState
            title={t('tasks.emptyTitle', 'No tasks for this project')}
            body={t('tasks.emptyBody', 'Add a task to plan work and dates.')}
            actionLabel={t('tasks.add', 'Add task')}
            onActionPress={() => setShowForm(true)}
          />
        ) : (
          tasks.map((task) => (
            <View
              key={task.id}
              style={{
                padding: theme.spacing.md,
                gap: theme.spacing.sm,
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
                  alignItems: 'flex-start',
                  gap: theme.spacing.sm,
                }}
              >
                <Text style={{ flex: 1, ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>
                  {task.name}
                </Text>
                <StatusPill
                  label={statusLabel(task.status)}
                  tone={
                    task.status === 'COMPLETED'
                      ? 'success'
                      : task.status === 'IN_PROGRESS'
                        ? 'accent'
                        : 'neutral'
                  }
                />
              </View>

              {task.plannedStartDate || task.plannedEndDate ? (
                <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>
                  {task.plannedStartDate ?? t('tasks.unscheduled', 'Unscheduled')} —{' '}
                  {task.plannedEndDate ?? t('tasks.unscheduled', 'Unscheduled')}
                </Text>
              ) : null}

              <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('tasks.editA11y', 'Edit task')} ${task.name}`}
                  onPress={() => edit(task)}
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <Text style={{ ...theme.typography.caption, color: theme.colors.accent }}>
                    {t('tasks.edit', 'Edit')}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('tasks.archiveA11y', 'Archive task')} ${task.name}`}
                  onPress={() => void taskService.archive(task.id).then(load)}
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <Text style={{ ...theme.typography.caption, color: theme.colors.error }}>
                    {t('tasks.archive', 'Archive')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showForm} animationType="slide">
        <ScreenShell
          title={editing ? t('tasks.editTitle', 'Edit task') : t('tasks.newTitle', 'New task')}
          subtitle={projects.find((project) => project.id === projectId)?.name}
        >
          <ScrollView
            contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xxl }}
            keyboardShouldPersistTaps="handled"
          >
            <TextField
              label={t('tasks.name', 'Task name')}
              accessibilityLabel={t('tasks.name', 'Task name')}
              placeholder={t('tasks.namePlaceholder', 'Task name')}
              value={name}
              onChangeText={setName}
            />
            <TextField
              label={t('tasks.descriptionOptional', 'Description · optional')}
              accessibilityLabel={t('tasks.descriptionOptional', 'Description · optional')}
              placeholder={t('tasks.descriptionPlaceholder', 'Description (optional)')}
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <TextField
              label={t('tasks.priorityOptional', 'Priority · optional')}
              accessibilityLabel={t('tasks.priorityOptional', 'Priority · optional')}
              placeholder={t('tasks.priorityPlaceholder', 'Priority (optional)')}
              value={priority}
              onChangeText={setPriority}
            />
            <TextField
              label={t('tasks.estimateOptional', 'Estimated effort (minutes) · optional')}
              accessibilityLabel={t('tasks.estimateOptional', 'Estimated effort (minutes) · optional')}
              placeholder={t('tasks.estimatePlaceholder', 'Estimated minutes')}
              value={estimate}
              keyboardType="numeric"
              onChangeText={setEstimate}
            />
            <TextField
              label={t('tasks.startOptional', 'Start date · optional')}
              accessibilityLabel={t('tasks.startOptional', 'Start date · optional')}
              helperText="YYYY-MM-DD"
              placeholder={t('tasks.startPlaceholder', 'Planned start YYYY-MM-DD')}
              value={plannedStart}
              onChangeText={setPlannedStart}
            />
            <TextField
              label={t('tasks.dueOptional', 'Due date · optional')}
              accessibilityLabel={t('tasks.dueOptional', 'Due date · optional')}
              helperText="YYYY-MM-DD"
              placeholder={t('tasks.duePlaceholder', 'Planned end YYYY-MM-DD')}
              value={plannedEnd}
              onChangeText={setPlannedEnd}
            />

            {editing ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                {TASK_STATUSES.map((next) => (
                  <Pressable
                    key={next}
                    accessibilityRole="button"
                    accessibilityState={{ selected: status === next }}
                    accessibilityLabel={statusLabel(next)}
                    onPress={() => setStatus(next)}
                    style={{ minHeight: 44, justifyContent: 'center' }}
                  >
                    <StatusPill
                      label={statusLabel(next)}
                      tone={status === next ? 'accent' : 'neutral'}
                    />
                  </Pressable>
                ))}
              </View>
            ) : null}

            <ActionButton
              label={editing ? t('tasks.save', 'Save task') : t('tasks.add', 'Add task')}
              disabled={!name.trim() || !projectId}
              onPress={() => void save()}
            />
            <ActionButton
              label={t('more.cancel', 'Cancel')}
              variant="secondary"
              onPress={reset}
            />
          </ScrollView>
        </ScreenShell>
      </Modal>
    </ScreenShell>
  );
}
