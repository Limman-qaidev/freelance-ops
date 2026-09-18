import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import {
  formatLocalDateTime,
  localDateTimeToUtc,
  systemTimezoneId,
} from '@/application/time-tracking/local-time';
import type { Activity } from '@/domain/activities/activity';
import type { Project } from '@/domain/projects/project';
import type { Task } from '@/domain/tasks/task';
import type { TimeHistoryRecord } from '@/domain/time-tracking/time-history';
import { useI18n } from '@/i18n/use-i18n';
import { useApplication } from '@/providers/application-context';
import { ActionButton } from '@/ui/components/action-button';
import { TextField } from '@/ui/components/form-fields';
import { ScreenShell } from '@/ui/components/screen-shell';
import { SelectionChip } from '@/ui/components/selection-chip';
import { useTheme } from '@/ui/theme/use-theme';

type TimingMode = 'DURATION' | 'RANGE';

export default function TimeEntryEditorScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const entryId = Array.isArray(rawId) ? rawId[0] : rawId;
  const isNew = !entryId || entryId === 'new';
  const { projectService, taskService, activityService, manualTimeService } = useApplication();
  const { t } = useI18n();
  const { theme } = useTheme();

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
        if (!record) throw new Error(t('timeEntry.loadError'));

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
      } catch {
        if (mounted) setError(t('timeEntry.loadError'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [activityService, entryId, isNew, manualTimeService, projectService, taskService, t]);

  async function selectProject(projectId: string) {
    setSelectedProjectId(projectId);
    setSelectedTaskId(null);
    setError(null);
    try {
      setTasks(await taskService.listTasksForProject(projectId));
    } catch {
      setTasks([]);
      setError(t('timeEntry.taskLoadError'));
    }
  }

  async function save() {
    if (!selectedProjectId || busy) {
      if (!selectedProjectId) setError(t('timeEntry.projectRequired'));
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
          setSavedWarning(t('timeEntry.overlapBody'));
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
          setSavedWarning(t('timeEntry.overlapBody'));
          return;
        }
      }
      router.replace('/time-history' as never);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('timeEntry.saveError'));
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
    } catch {
      setError(t('timeEntry.deleteError'));
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <ScreenShell
        title={isNew ? t('timeEntry.addTitle') : t('timeEntry.editTitle')}
        subtitle={t('timeEntry.loading')}
      />
    );
  }

  return (
    <ScreenShell
      title={isNew ? t('timeEntry.addTitle') : t('timeEntry.editTitle')}
      subtitle={isNew ? t('timeEntry.addSubtitle') : t('timeEntry.editSubtitle')}
    >
      <ScrollView
        contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <Text accessibilityRole="alert" style={{ ...theme.typography.caption, color: theme.colors.error }}>
            {error}
          </Text>
        ) : null}

        {savedWarning ? (
          <View
            style={{
              padding: theme.spacing.lg,
              gap: theme.spacing.sm,
              borderRadius: theme.radii.lg,
              borderWidth: 1,
              borderColor: theme.colors.warning,
              backgroundColor: theme.colors.surfaceElevated,
            }}
          >
            <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.warning }}>
              {t('timeEntry.overlapTitle')}
            </Text>
            <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
              {savedWarning}
            </Text>
            <ActionButton
              label={t('timeEntry.backToHistory')}
              onPress={() => router.replace('/time-history' as never)}
            />
          </View>
        ) : null}

        <FieldGroup label={t('timeEntry.project')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {projects.map((project) => (
              <SelectionChip
                key={project.id}
                label={project.name}
                selected={project.id === selectedProjectId}
                accessibilityLabel={`${t('timeEntry.selectProject')} ${project.name}`}
                onPress={() => void selectProject(project.id)}
              />
            ))}
          </View>
          {projects.length === 0 ? (
            <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>
              {t('timeEntry.noProject')}
            </Text>
          ) : null}
        </FieldGroup>

        <FieldGroup label={t('timeEntry.taskOptional')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {tasks.map((task) => (
              <SelectionChip
                key={task.id}
                label={task.name}
                selected={task.id === selectedTaskId}
                accessibilityLabel={`${t('timeEntry.selectTask')} ${task.name}`}
                onPress={() => setSelectedTaskId(task.id === selectedTaskId ? null : task.id)}
              />
            ))}
          </View>
        </FieldGroup>

        <FieldGroup label={t('timeEntry.activityOptional')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {activities.map((activity) => (
              <SelectionChip
                key={activity.id}
                label={activity.name}
                selected={activity.id === selectedActivityId}
                accessibilityLabel={`${t('timeEntry.selectActivity')} ${activity.name}`}
                onPress={() =>
                  setSelectedActivityId(activity.id === selectedActivityId ? null : activity.id)
                }
              />
            ))}
          </View>
        </FieldGroup>

        <FieldGroup label={t('timeEntry.billing')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <SelectionChip
              label={t('common.billable')}
              selected={billable}
              onPress={() => setBillable(true)}
            />
            <SelectionChip
              label={t('common.nonBillable')}
              selected={!billable}
              onPress={() => setBillable(false)}
            />
          </View>
        </FieldGroup>

        {timingLocked ? (
          <View
            style={{
              padding: theme.spacing.md,
              gap: theme.spacing.xs,
              borderRadius: theme.radii.lg,
              borderWidth: 1,
              borderColor: theme.colors.borderStrong,
              backgroundColor: theme.colors.surfaceElevated,
            }}
          >
            <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.accent }}>
              {t('timeEntry.timingProtectedTitle')}
            </Text>
            <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
              {t('timeEntry.timingProtectedBody')}
            </Text>
          </View>
        ) : (
          <>
            {isNew ? (
              <FieldGroup label={t('timeEntry.inputMode')}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                  <SelectionChip
                    label={t('timeEntry.duration')}
                    selected={timingMode === 'DURATION'}
                    onPress={() => setTimingMode('DURATION')}
                  />
                  <SelectionChip
                    label={t('timeEntry.endTimeMode')}
                    selected={timingMode === 'RANGE'}
                    onPress={() => setTimingMode('RANGE')}
                  />
                </View>
              </FieldGroup>
            ) : null}

            <TextField
              label={t('timeEntry.workDate')}
              accessibilityLabel={t('timeEntry.workDate')}
              helperText="YYYY-MM-DD"
              value={startDate}
              onChangeText={setStartDate}
              autoCapitalize="none"
            />
            <TextField
              label={t('timeEntry.startTime')}
              accessibilityLabel={t('timeEntry.startTime')}
              helperText="HH:MM"
              value={startTime}
              onChangeText={setStartTime}
              autoCapitalize="none"
            />

            {isNew && timingMode === 'DURATION' ? (
              <TextField
                label={t('timeEntry.durationMinutes')}
                accessibilityLabel={t('timeEntry.durationMinutes')}
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                keyboardType="number-pad"
              />
            ) : (
              <>
                <TextField
                  label={t('timeEntry.endDate')}
                  accessibilityLabel={t('timeEntry.endDate')}
                  helperText="YYYY-MM-DD"
                  value={endDate}
                  onChangeText={setEndDate}
                  autoCapitalize="none"
                />
                <TextField
                  label={t('timeEntry.endTime')}
                  accessibilityLabel={t('timeEntry.endTime')}
                  helperText="HH:MM"
                  value={endTime}
                  onChangeText={setEndTime}
                  autoCapitalize="none"
                />
              </>
            )}

            <TextField
              label={t('timeEntry.timezone')}
              accessibilityLabel={t('timeEntry.timezone')}
              value={timezoneId}
              onChangeText={setTimezoneId}
              placeholder="Europe/Madrid"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </>
        )}

        <TextField
          label={t('timeEntry.descriptionOptional')}
          accessibilityLabel="Descripción"
          placeholder={t('timeEntry.descriptionPlaceholder')}
          multiline
          value={description}
          onChangeText={setDescription}
        />

        {!savedWarning ? (
          <ActionButton
            label={busy ? t('timeEntry.saving') : t('timeEntry.save')}
            accessibilityLabel={t('timeEntry.saveA11y')}
            disabled={busy || !selectedProjectId}
            onPress={() => void save()}
          />
        ) : null}
        <ActionButton label={t('common.back')} variant="secondary" onPress={() => router.back()} />

        {!isNew ? (
          confirmDelete ? (
            <View
              style={{
                padding: theme.spacing.md,
                gap: theme.spacing.sm,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                borderColor: theme.colors.error,
                backgroundColor: theme.colors.surfaceElevated,
              }}
            >
              <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.error }}>
                {t('timeEntry.deleteTitle')}
              </Text>
              <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
                {t('timeEntry.deleteBody')}
              </Text>
              <ActionButton
                label={t('timeEntry.deletePermanent')}
                accessibilityLabel={t('timeEntry.confirmDeleteA11y')}
                variant="danger"
                disabled={busy}
                onPress={() => void deleteEntry()}
              />
              <ActionButton
                label={t('more.cancel')}
                variant="secondary"
                disabled={busy}
                onPress={() => setConfirmDelete(false)}
              />
            </View>
          ) : (
            <ActionButton
              label={t('timeEntry.deleteEntry')}
              accessibilityLabel={t('timeEntry.deleteEntry')}
              variant="danger"
              onPress={() => setConfirmDelete(true)}
            />
          )
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>{label}</Text>
      {children}
    </View>
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
