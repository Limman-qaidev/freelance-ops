import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Activity } from '@/domain/activities/activity';
import type { Project } from '@/domain/projects/project';
import type { Task } from '@/domain/tasks/task';
import { useI18n } from '@/i18n/use-i18n';
import { useApplication } from '@/providers/application-context';
import { ActionButton } from '@/ui/components/action-button';
import { AppIcon } from '@/ui/components/app-icon';
import { IconButton } from '@/ui/components/icon-button';
import { SectionHeader } from '@/ui/components/section-header';
import { useTheme } from '@/ui/theme/use-theme';

function isTrackableProject(project: Project): boolean {
  return project.status === 'PLANNED' || project.status === 'ACTIVE';
}

function isTrackableTask(task: Task): boolean {
  return task.status === 'PENDING' || task.status === 'IN_PROGRESS';
}

type SelectOption = {
  id: string | null;
  label: string;
  accessibilityLabel: string;
};

type SelectionRowProps = {
  label: string;
  value: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
};

function SelectionRow({
  label,
  value,
  accessibilityLabel,
  onPress,
  disabled = false,
}: SelectionRowProps) {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 52,
          paddingHorizontal: 14,
          borderRadius: theme.radii.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: disabled
            ? theme.colors.disabledSurface
            : pressed
              ? theme.colors.surfaceMuted
              : theme.colors.surface,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.sm,
        })}
      >
        <Text
          numberOfLines={2}
          style={{
            ...theme.typography.body,
            color: disabled ? theme.colors.disabledText : theme.colors.textPrimary,
            flex: 1,
          }}
        >
          {value}
        </Text>
        <AppIcon
          name="chevronRight"
          size={theme.sizing.inlineIcon}
          color={disabled ? theme.colors.disabledText : theme.colors.textMuted}
        />
      </Pressable>
    </View>
  );
}

type PickerSheetProps = {
  visible: boolean;
  title: string;
  cancelLabel: string;
  options: SelectOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
};

function PickerSheet({
  visible,
  title,
  cancelLabel,
  options,
  selectedId,
  onSelect,
  onClose,
}: PickerSheetProps) {
  const { theme } = useTheme();

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessible={false}
          onPress={onClose}
          style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.scrim }]}
        />
        <SafeAreaView
          edges={['bottom', 'left', 'right']}
          style={{
            maxHeight: '72%',
            backgroundColor: theme.colors.surfaceElevated,
            borderTopLeftRadius: theme.radii.lg,
            borderTopRightRadius: theme.radii.lg,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
          }}
        >
          <SectionHeader title={title} actionLabel={cancelLabel} onActionPress={onClose} />
          <ScrollView contentContainerStyle={{ paddingVertical: theme.spacing.sm }}>
            {options.map((option) => {
              const selected = option.id === selectedId;
              return (
                <Pressable
                  key={option.id ?? '__none__'}
                  accessibilityRole="button"
                  accessibilityLabel={option.accessibilityLabel}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onSelect(option.id);
                    onClose();
                  }}
                  style={({ pressed }) => ({
                    minHeight: 52,
                    justifyContent: 'center',
                    paddingHorizontal: 14,
                    borderRadius: theme.radii.md,
                    backgroundColor: selected
                      ? theme.colors.accentSoft
                      : pressed
                        ? theme.colors.surfaceMuted
                        : theme.colors.surfaceElevated,
                  })}
                >
                  <Text
                    style={{
                      ...theme.typography.bodyStrong,
                      color: selected ? theme.colors.accent : theme.colors.textPrimary,
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export default function StartWorkScreen() {
  const { projectId: projectParam } = useLocalSearchParams<{
    projectId?: string | string[];
  }>();
  const {
    clientService,
    projectService,
    taskService,
    activityService,
    timeTrackingService,
  } = useApplication();
  const { t } = useI18n();
  const { theme } = useTheme();
  const requestedProjectId = Array.isArray(projectParam) ? projectParam[0] : projectParam;

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [projectPickerVisible, setProjectPickerVisible] = useState(false);
  const [taskPickerVisible, setTaskPickerVisible] = useState(false);
  const [activityPickerVisible, setActivityPickerVisible] = useState(false);
  const [conflictVisible, setConflictVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    void Promise.all([projectService.listActiveProjects(), activityService.listActive()])
      .then(async ([allProjects, activeActivities]) => {
        const trackableProjects = allProjects.filter(isTrackableProject);
        const initialProjectId =
          trackableProjects.find((project) => project.id === requestedProjectId)?.id ??
          trackableProjects[0]?.id ??
          null;
        const initialProject =
          trackableProjects.find((project) => project.id === initialProjectId) ?? null;
        const initialTasks = initialProjectId
          ? (await taskService.listTasksForProject(initialProjectId)).filter(isTrackableTask)
          : [];
        const initialClient = initialProject
          ? await clientService.getById(initialProject.clientId)
          : null;

        if (!mounted) return;
        setProjects(trackableProjects);
        setActivities(activeActivities);
        setSelectedProjectId(initialProjectId);
        setSelectedClientName(initialClient?.name ?? '');
        setTasks(initialTasks);
      })
      .catch(() => {
        if (mounted) setError(t('startWork.errorPrepare'));
      });

    return () => {
      mounted = false;
    };
  }, [activityService, clientService, projectService, requestedProjectId, t, taskService]);

  async function selectProject(projectId: string) {
    setSelectedProjectId(projectId);
    setSelectedTaskId(null);
    setError(null);
    try {
      const selectedProject = projects.find((project) => project.id === projectId) ?? null;
      const [projectTasks, client] = await Promise.all([
        taskService.listTasksForProject(projectId),
        selectedProject ? clientService.getById(selectedProject.clientId) : Promise.resolve(null),
      ]);
      setTasks(projectTasks.filter(isTrackableTask));
      setSelectedClientName(client?.name ?? '');
    } catch {
      setTasks([]);
      setError(t('startWork.errorTasks'));
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
      setError(t('startWork.errorStart'));
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
      setError(t('startWork.errorReplace'));
    } finally {
      setBusy(false);
    }
  }

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const selectedActivity = activities.find((item) => item.id === selectedActivityId) ?? null;
  const alternativeProjects = projects.filter((project) => project.id !== selectedProjectId);

  const projectOptions: SelectOption[] = alternativeProjects.map((project) => ({
    id: project.id,
    label: project.name,
    accessibilityLabel: `${t('startWork.selectProject')} ${project.name}`,
  }));
  const taskOptions: SelectOption[] = [
    {
      id: null,
      label: t('common.none'),
      accessibilityLabel: `${t('startWork.selectTask')} ${t('common.none')}`,
    },
    ...tasks.map((task) => ({
      id: task.id,
      label: task.name,
      accessibilityLabel: `${t('startWork.selectTask')} ${task.name}`,
    })),
  ];
  const activityOptions: SelectOption[] = [
    {
      id: null,
      label: t('common.none'),
      accessibilityLabel: `${t('startWork.selectActivity')} ${t('common.none')}`,
    },
    ...activities.map((activity) => ({
      id: activity.id,
      label: activity.name,
      accessibilityLabel: `${t('startWork.selectActivity')} ${activity.name}`,
    })),
  ];

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <View
        style={{
          minHeight: 52,
          paddingHorizontal: theme.spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
        }}
      >
        <IconButton
          icon="back"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
        />
        <Text style={{ ...theme.typography.title, color: theme.colors.textPrimary, flex: 1 }}>
          {t('startWork.title')}
        </Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
          gap: theme.spacing.lg,
        }}
      >
        {error ? (
          <Text accessibilityRole="alert" style={{ ...theme.typography.caption, color: theme.colors.error }}>
            {error}
          </Text>
        ) : null}

        <View style={{ gap: theme.spacing.xs }}>
          <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
            {t('startWork.project')}
          </Text>
          {selectedProject ? (
            <View
              style={{
                paddingVertical: theme.spacing.md,
                paddingHorizontal: 14,
                borderRadius: theme.radii.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surfaceMuted,
                gap: theme.spacing.xs,
              }}
            >
              <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>
                {selectedProject.name}
              </Text>
              {selectedClientName ? (
                <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
                  {selectedClientName}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
              {t('startWork.noProject')}
            </Text>
          )}
          {alternativeProjects.length > 0 ? (
            <View style={{ alignSelf: 'flex-start', marginTop: theme.spacing.xs }}>
              <ActionButton
                label={t('startWork.changeProject')}
                accessibilityLabel={t('startWork.changeProject')}
                variant="secondary"
                onPress={() => setProjectPickerVisible(true)}
              />
            </View>
          ) : null}
        </View>

        <SelectionRow
          label={t('startWork.taskOptional')}
          value={selectedTask?.name ?? t('common.none')}
          accessibilityLabel={t('startWork.selectTask')}
          disabled={!selectedProjectId || tasks.length === 0}
          onPress={() => setTaskPickerVisible(true)}
        />
        {selectedProjectId && tasks.length === 0 ? (
          <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted, marginTop: -12 }}>
            {t('startWork.noOpenTasks')}
          </Text>
        ) : null}

        <SelectionRow
          label={t('startWork.activityOptional')}
          value={selectedActivity?.name ?? t('common.none')}
          accessibilityLabel={t('startWork.selectActivity')}
          disabled={activities.length === 0}
          onPress={() => setActivityPickerVisible(true)}
        />

        <View style={{ gap: theme.spacing.xs }}>
          <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
            {t('startWork.descriptionOptional')}
          </Text>
          <TextInput
            accessibilityLabel={t('startWork.descriptionOptional')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('startWork.descriptionPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            multiline
            textAlignVertical="top"
            style={{
              minHeight: 96,
              paddingHorizontal: 14,
              paddingVertical: theme.spacing.md,
              borderRadius: theme.radii.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              color: theme.colors.textPrimary,
              ...theme.typography.body,
            }}
          />
        </View>

        <View style={{ marginTop: theme.spacing.sm }}>
          <ActionButton
            label={busy ? t('startWork.starting') : t('startWork.action')}
            accessibilityLabel={t('startWork.action')}
            disabled={!selectedProjectId || busy}
            onPress={() => void requestStart()}
          />
        </View>
      </ScrollView>

      <PickerSheet
        visible={projectPickerVisible}
        title={t('startWork.changeProject')}
        cancelLabel={t('common.cancel')}
        options={projectOptions}
        selectedId={null}
        onSelect={(projectId) => {
          if (projectId) void selectProject(projectId);
        }}
        onClose={() => setProjectPickerVisible(false)}
      />
      <PickerSheet
        visible={taskPickerVisible}
        title={t('startWork.task')}
        cancelLabel={t('common.cancel')}
        options={taskOptions}
        selectedId={selectedTaskId}
        onSelect={setSelectedTaskId}
        onClose={() => setTaskPickerVisible(false)}
      />
      <PickerSheet
        visible={activityPickerVisible}
        title={t('startWork.activity')}
        cancelLabel={t('common.cancel')}
        options={activityOptions}
        selectedId={selectedActivityId}
        onSelect={setSelectedActivityId}
        onClose={() => setActivityPickerVisible(false)}
      />

      <Modal transparent animationType="slide" visible={conflictVisible} onRequestClose={() => setConflictVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            accessible={false}
            onPress={() => setConflictVisible(false)}
            style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.scrim }]}
          />
          <SafeAreaView
            edges={['bottom', 'left', 'right']}
            style={{
              backgroundColor: theme.colors.surfaceElevated,
              borderTopLeftRadius: theme.radii.lg,
              borderTopRightRadius: theme.radii.lg,
              padding: theme.spacing.lg,
              gap: theme.spacing.md,
            }}
          >
            <Text style={{ ...theme.typography.section, color: theme.colors.textPrimary }}>
              {t('startWork.conflictTitle')}
            </Text>
            <Text style={{ ...theme.typography.body, color: theme.colors.textSecondary }}>
              {t('startWork.conflictBody')}
            </Text>
            <ActionButton
              label={t('startWork.stopAndStart')}
              variant="danger"
              onPress={() => void stopCurrentAndStart()}
            />
            <ActionButton
              label={t('common.cancel')}
              variant="secondary"
              onPress={() => setConflictVisible(false)}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
