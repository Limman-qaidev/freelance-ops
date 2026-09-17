import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  formatLocalDateTime,
  localDateTimeToUtc,
  systemTimezoneId,
} from '@/application/time-tracking/local-time';
import type { Activity } from '@/domain/activities/activity';
import type { Project } from '@/domain/projects/project';
import type { Task } from '@/domain/tasks/task';
import type { TimeHistoryRecord } from '@/domain/time-tracking/time-history';
import { useApplication } from '@/providers/application-context';
import { ActionButton } from '@/ui/components/action-button';
import { ScreenShell } from '@/ui/components/screen-shell';
import { SelectionChip } from '@/ui/components/selection-chip';
import { colors, radii, spacing, typography } from '@/ui/theme/tokens';

type TimingMode = 'DURATION' | 'RANGE';

export default function TimeEntryEditorScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const entryId = Array.isArray(rawId) ? rawId[0] : rawId;
  const isNew = !entryId || entryId === 'new';
  const {
    projectService,
    taskService,
    activityService,
    manualTimeService,
  } = useApplication();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [billable, setBillable] = useState(true);
  const [timezoneId, setTimezoneId] = useState(systemTimezoneId());
  const [timingMode, setTimingMode] = useState<TimingMode>('DURATION');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [timingLocked, setTimingLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedWarning, setSavedWarning] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const [activeProjects, activeActivities] = await Promise.all([
          projectService.listActiveProjects(),
          activityService.listActive(),
        ]);

        if (isNew) {
          const timezone = systemTimezoneId();
          const now = formatLocalDateTime(new Date().toISOString(), timezone);
          const initialProject = activeProjects[0] ?? null;
          const initialTasks = initialProject
            ? await taskService.listTasksForProject(initialProject.id)
            : [];

          if (!mounted) return;
          setProjects(activeProjects);
          setActivities(activeActivities);
          setSelectedProjectId(initialProject?.id ?? null);
          setTasks(initialTasks);
          setTimezoneId(timezone);
          setStartDate(now.date);
          setStartTime(now.time);
          setEndDate(now.date);
          setEndTime(now.time);
          return;
        }

        const record = await manualTimeService.getById(entryId);
        if (!record) throw new Error('Time entry was not found.');

        const historicalProject = await projectService.getById(record.timeEntry.projectId);
        const availableProjects = historicalProject
          ? mergeById(activeProjects, historicalProject)
          : activeProjects;

        const activeTasks = await taskService.listTasksForProject(record.timeEntry.projectId);
        const historicalTask = record.timeEntry.taskId
          ? await taskService.getById(record.timeEntry.taskId)
          : null;
        const availableTasks = historicalTask ? mergeById(activeTasks, historicalTask) : activeTasks;

        const historicalActivity = record.timeEntry.activityId
          ? await activityService.getById(record.timeEntry.activityId)
          : null;
        const availableActivities = historicalActivity
          ? mergeById(activeActivities, historicalActivity)
          : activeActivities;

        const timing = timingPresentation(record);

        if (!mounted) return;
        setProjects(availableProjects);
        setTasks(availableTasks);
        setActivities(availableActivities);
        setSelectedProjectId(record.timeEntry.projectId);
        setSelectedTaskId(record.timeEntry.taskId);
        setSelectedActivityId(record.timeEntry.activityId);
        setDescription(record.timeEntry.description ?? '');
        setBillable(record.timeEntry.billable);
        setTimingLocked(record.intervals.length !== 1);
        setTimingMode('RANGE');
        setTimezoneId(timing.timezoneId);
        setStartDate(timing.start.date);
        setStartTime(timing.start.time);
        setEndDate(timing.end.date);
        setEndTime(timing.end.time);
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load this time entry.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [
    activityService,
    entryId,
    isNew,
    manualTimeService,
    projectService,
    taskService,
  ]);

  async function selectProject(projectId: string) {
    setSelectedProjectId(projectId);
    setSelectedTaskId(null);
    setError(null);
    try {
      setTasks(await taskService.listTasksForProject(projectId));
    } catch {
      setTasks([]);
      setError('Unable to load tasks for the selected project.');
    }
  }

  async function save() {
    if (!selectedProjectId || busy) {
      if (!selectedProjectId) setError('Choose a project before saving time.');
      return;
    }

    setBusy(true);
    setError(null);
    setSavedWarning(null);

    try {
      if (isNew) {
        const startedAtUtc = localDateTimeToUtc(startDate, startTime, timezoneId);
        const timing =
          timingMode === 'DURATION'
            ? {
                kind: 'DURATION' as const,
                startedAtUtc,
                durationMinutes: parseDuration(durationMinutes),
              }
            : {
                kind: 'RANGE' as const,
                startedAtUtc,
                endedAtUtc: localDateTimeToUtc(endDate, endTime, timezoneId),
              };

        const result = await manualTimeService.create({
          projectId: selectedProjectId,
          taskId: selectedTaskId,
          activityId: selectedActivityId,
          description: description.trim() || null,
          billable,
          timezoneId,
          timing,
        });
        if (result.warnings.includes('OVERLAP')) {
          setSavedWarning(
            'Saved. This entry overlaps existing recorded time; review both entries in history.',
          );
          return;
        }
      } else {
        const timing = timingLocked
          ? undefined
          : {
              timezoneId,
              startedAtUtc: localDateTimeToUtc(startDate, startTime, timezoneId),
              endedAtUtc: localDateTimeToUtc(endDate, endTime, timezoneId),
            };
        const result = await manualTimeService.update(entryId, {
          projectId: selectedProjectId,
          taskId: selectedTaskId,
          activityId: selectedActivityId,
          description: description.trim() || null,
          billable,
          ...(timing ? { timing } : {}),
        });
        if (result.warnings.includes('OVERLAP')) {
          setSavedWarning(
            'Saved. This entry overlaps existing recorded time; review both entries in history.',
          );
          return;
        }
      }

      router.replace('/time-history' as never);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this time entry.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteEntry() {
    if (isNew || !entryId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await manualTimeService.delete(entryId);
      router.replace('/time-history' as never);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'Unable to delete this time entry.',
      );
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <ScreenShell title={isNew ? 'Add manual time' : 'Edit time'} subtitle="Loading local data…" />
    );
  }

  return (
    <ScreenShell
      title={isNew ? 'Add manual time' : 'Edit time'}
      subtitle={
        isNew
          ? 'Project is required. Task, activity and description are optional.'
          : 'Correct historical work without changing live timer state.'
      }
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {savedWarning ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>Overlap warning</Text>
            <Text style={styles.warningText}>{savedWarning}</Text>
            <ActionButton
              label="Back to history"
              onPress={() => router.replace('/time-history' as never)}
            />
          </View>
        ) : null}

        <Text style={styles.label}>Project</Text>
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
        {projects.length === 0 ? <Text style={styles.muted}>No project is available.</Text> : null}

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

        <Text style={styles.label}>Billing</Text>
        <View style={styles.chips}>
          <SelectionChip
            label="Billable"
            selected={billable}
            onPress={() => setBillable(true)}
          />
          <SelectionChip
            label="Non-billable"
            selected={!billable}
            onPress={() => setBillable(false)}
          />
        </View>

        {timingLocked ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Timing protected</Text>
            <Text style={styles.muted}>
              Timing is locked because this session contains pauses. You can edit project, task,
              activity, billing and description without flattening the original intervals.
            </Text>
          </View>
        ) : (
          <>
            {isNew ? (
              <>
                <Text style={styles.label}>Time input</Text>
                <View style={styles.chips}>
                  <SelectionChip
                    label="Duration"
                    selected={timingMode === 'DURATION'}
                    onPress={() => setTimingMode('DURATION')}
                  />
                  <SelectionChip
                    label="End time"
                    selected={timingMode === 'RANGE'}
                    onPress={() => setTimingMode('RANGE')}
                  />
                </View>
              </>
            ) : null}

            <Text style={styles.label}>Work date</Text>
            <TextInput
              accessibilityLabel="Work date"
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Start time</Text>
            <TextInput
              accessibilityLabel="Start time"
              style={styles.input}
              value={startTime}
              onChangeText={setStartTime}
              placeholder="HH:MM"
              autoCapitalize="none"
            />

            {isNew && timingMode === 'DURATION' ? (
              <>
                <Text style={styles.label}>Duration minutes</Text>
                <TextInput
                  accessibilityLabel="Duration minutes"
                  style={styles.input}
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                  placeholder="60"
                  keyboardType="number-pad"
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>End date</Text>
                <TextInput
                  accessibilityLabel="End date"
                  style={styles.input}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                />
                <Text style={styles.label}>End time</Text>
                <TextInput
                  accessibilityLabel="End time"
                  style={styles.input}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="HH:MM"
                  autoCapitalize="none"
                />
              </>
            )}
            <Text style={styles.timezone}>Timezone: {timezoneId}</Text>
          </>
        )}

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          accessibilityLabel="Description"
          style={[styles.input, styles.descriptionInput]}
          value={description}
          onChangeText={setDescription}
          placeholder="What work was done?"
          multiline
        />

        {!savedWarning ? (
          <ActionButton
            label={busy ? 'Saving…' : 'Save'}
            accessibilityLabel="Save time entry"
            onPress={() => void save()}
          />
        ) : null}
        <ActionButton label="Back" variant="secondary" onPress={() => router.back()} />

        {!isNew ? (
          confirmDelete ? (
            <View style={styles.dangerCard}>
              <Text style={styles.dangerTitle}>Delete this time entry?</Text>
              <Text style={styles.muted}>This removes the historical entry and its intervals.</Text>
              <ActionButton
                label="Delete permanently"
                accessibilityLabel="Confirm delete time entry"
                variant="danger"
                onPress={() => void deleteEntry()}
              />
              <ActionButton
                label="Cancel"
                variant="secondary"
                onPress={() => setConfirmDelete(false)}
              />
            </View>
          ) : (
            <ActionButton
              label="Delete entry"
              accessibilityLabel="Delete time entry"
              variant="danger"
              onPress={() => setConfirmDelete(true)}
            />
          )
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}

function timingPresentation(record: TimeHistoryRecord): {
  timezoneId: string;
  start: { date: string; time: string };
  end: { date: string; time: string };
} {
  const first = record.intervals[0];
  const last = record.intervals.at(-1);
  if (!first || !last?.endedAtUtc) {
    throw new Error('Historical time entry does not contain a complete closed interval.');
  }
  const timezoneId = first.timezoneId;
  return {
    timezoneId,
    start: formatLocalDateTime(first.startedAtUtc, timezoneId),
    end: formatLocalDateTime(last.endedAtUtc, timezoneId),
  };
}

function mergeById<T extends { id: string }>(items: T[], historical: T): T[] {
  return items.some((item) => item.id === historical.id) ? items : [...items, historical];
}

function parseDuration(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Duration must be a positive whole number of minutes.');
  }
  return parsed;
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    color: colors.textPrimary,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body,
  },
  descriptionInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  timezone: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 20,
  },
  error: {
    color: '#B91C1C',
    fontSize: typography.caption,
    fontWeight: '600',
  },
  warningCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  warningTitle: {
    color: '#92400E',
    fontSize: typography.body,
    fontWeight: '700',
  },
  warningText: {
    color: '#92400E',
    fontSize: typography.caption,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  infoTitle: {
    color: colors.accent,
    fontSize: typography.body,
    fontWeight: '700',
  },
  dangerCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  dangerTitle: {
    color: '#991B1B',
    fontSize: typography.body,
    fontWeight: '700',
  },
});