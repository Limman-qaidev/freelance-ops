import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Project } from '@/domain/projects/project';
import { TASK_STATUSES, type Task, type TaskStatus } from '@/domain/tasks/task';
import { useApplication } from '@/providers/application-context';
import { ScreenShell } from '@/ui/components/screen-shell';
import { colors, radii, spacing, typography } from '@/ui/theme/tokens';

export function TasksManagementScreen() {
  const { projectService, taskService } = useApplication();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');
  const [status, setStatus] = useState<TaskStatus>('PENDING');
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!projectId) return;
    setTasks(await taskService.listTasksForProject(projectId));
  }, [projectId, taskService]);

  useEffect(() => {
    let active = true;
    void projectService.listActiveProjects().then((nextProjects) => {
      if (!active) return;
      setProjects(nextProjects);
      setProjectId((current) => current ?? nextProjects[0]?.id ?? null);
      if (nextProjects.length === 0) setTasks([]);
    });
    return () => {
      active = false;
    };
  }, [projectService]);

  useEffect(() => {
    if (!projectId) return undefined;
    let active = true;
    void taskService.listTasksForProject(projectId).then((nextTasks) => {
      if (active) setTasks(nextTasks);
    });
    return () => {
      active = false;
    };
  }, [projectId, taskService]);

  async function submit() {
    const trimmedName = name.trim();
    if (!trimmedName || !projectId) return;
    const parsedEstimate = estimatedMinutes.trim() ? Number(estimatedMinutes) : null;
    const estimate = parsedEstimate !== null && Number.isFinite(parsedEstimate) ? parsedEstimate : null;
    const common = {
      projectId,
      name: trimmedName,
      description: description.trim() || null,
      priority: priority.trim() || null,
      estimatedMinutes: estimate,
      plannedStartDate: plannedStartDate.trim() || null,
      plannedEndDate: plannedEndDate.trim() || null,
    };

    if (editingId) {
      const current = tasks.find((task) => task.id === editingId);
      if (!current) return;
      await taskService.update({
        id: editingId,
        ...common,
        status,
        actualStartDate: current.actualStartDate,
        actualEndDate: current.actualEndDate,
      });
    } else {
      await taskService.create(common);
    }
    reset();
    await loadTasks();
  }

  function edit(task: Task) {
    setEditingId(task.id);
    setProjectId(task.projectId);
    setName(task.name);
    setDescription(task.description ?? '');
    setPriority(task.priority ?? '');
    setEstimatedMinutes(task.estimatedMinutes?.toString() ?? '');
    setPlannedStartDate(task.plannedStartDate ?? '');
    setPlannedEndDate(task.plannedEndDate ?? '');
    setStatus(task.status);
  }

  function reset() {
    setEditingId(null);
    setName('');
    setDescription('');
    setPriority('');
    setEstimatedMinutes('');
    setPlannedStartDate('');
    setPlannedEndDate('');
    setStatus('PENDING');
  }

  async function archive(id: string) {
    await taskService.archive(id);
    if (editingId === id) reset();
    await loadTasks();
  }

  return (
    <ScreenShell title="Tasks" subtitle="Plan work items and estimates inside each active project.">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {projects.length === 0 ? (
          <Text style={styles.muted}>Create a project before adding tasks.</Text>
        ) : (
          <>
            <Text style={styles.label}>Project</Text>
            <View style={styles.chips}>
              {projects.map((project) => (
                <Chip
                  key={project.id}
                  label={project.name}
                  selected={project.id === projectId}
                  onPress={() => {
                    setProjectId(project.id);
                    reset();
                  }}
                />
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Task name" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Description (optional)" value={description} onChangeText={setDescription} multiline />
            <TextInput style={styles.input} placeholder="Priority (optional)" value={priority} onChangeText={setPriority} />
            <TextInput style={styles.input} placeholder="Estimated minutes" value={estimatedMinutes} onChangeText={setEstimatedMinutes} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Planned start YYYY-MM-DD" value={plannedStartDate} onChangeText={setPlannedStartDate} />
            <TextInput style={styles.input} placeholder="Planned end YYYY-MM-DD" value={plannedEndDate} onChangeText={setPlannedEndDate} />
            {editingId ? (
              <>
                <Text style={styles.label}>Status</Text>
                <View style={styles.chips}>
                  {TASK_STATUSES.map((taskStatus) => (
                    <Chip key={taskStatus} label={taskStatus.replace('_', ' ')} selected={status === taskStatus} onPress={() => setStatus(taskStatus)} />
                  ))}
                </View>
              </>
            ) : null}
            <View style={styles.actions}>
              <PrimaryButton label={editingId ? 'Save task' : 'Add task'} onPress={() => void submit()} />
              {editingId ? <SecondaryButton label="Cancel" onPress={reset} /> : null}
            </View>
          </>
        )}

        {tasks.map((task) => (
          <View key={task.id} style={styles.card}>
            <Text style={styles.cardTitle}>{task.name}</Text>
            <Text style={styles.muted}>
              {task.status}{task.estimatedMinutes !== null ? ` · ${task.estimatedMinutes} min` : ''}
            </Text>
            <View style={styles.actions}>
              <SecondaryButton label="Edit" accessibilityLabel={`Edit task ${task.name}`} onPress={() => edit(task)} />
              <SecondaryButton label="Archive" accessibilityLabel={`Archive task ${task.name}`} onPress={() => void archive(task.id)} />
            </View>
          </View>
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.primaryButton} onPress={onPress}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <Pressable style={styles.secondaryButton} onPress={onPress} accessibilityLabel={accessibilityLabel}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm, paddingBottom: spacing.xl },
  label: { color: colors.textMuted, fontSize: typography.caption, fontWeight: '600' },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, color: colors.textPrimary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.body },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textPrimary, fontSize: typography.caption },
  chipTextSelected: { color: colors.surface, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  primaryButton: { backgroundColor: colors.accent, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  primaryText: { color: colors.surface, fontWeight: '700' },
  secondaryButton: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  secondaryText: { color: colors.textPrimary, fontWeight: '600' },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  cardTitle: { color: colors.textPrimary, fontSize: typography.body, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: typography.caption },
});
