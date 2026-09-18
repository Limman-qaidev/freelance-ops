import { router, useLocalSearchParams } from 'expo-router';
import { useContext, useEffect, useMemo, useState } from 'react';
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
import { useUiCopy } from '@/i18n/use-ui-copy';
import { useApplication } from '@/providers/application-context';
import { ActionButton } from '@/ui/components/action-button';
import { AppIcon } from '@/ui/components/app-icon';
import { SelectionField } from '@/ui/components/selection-field';
import { lightTheme, type AppTheme } from '@/ui/theme/theme';
import { ThemeContext } from '@/ui/theme/theme-provider';

type SelectorKind = 'task' | 'activity' | null;

function isTrackableProject(project: Project): boolean {
  return project.status === 'PLANNED' || project.status === 'ACTIVE';
}

function isTrackableTask(task: Task): boolean {
  return task.status === 'PENDING' || task.status === 'IN_PROGRESS';
}

function projectMonogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'FO';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
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
  const { t } = useUiCopy();
  const theme = useContext(ThemeContext)?.theme ?? lightTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const requestedProjectId = Array.isArray(projectParam) ? projectParam[0] : projectParam;

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [clientName, setClientName] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [selector, setSelector] = useState<SelectorKind>(null);
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
        const project =
          trackableProjects.find((item) => item.id === requestedProjectId) ??
          trackableProjects[0] ??
          null;

        const [projectTasks, client] = project
          ? await Promise.all([
              taskService.listTasksForProject(project.id),
              clientService.getById(project.clientId),
            ])
          : [[], null];

        if (!mounted) return;
        setSelectedProject(project);
        setTasks(projectTasks.filter(isTrackableTask));
        setActivities(activeActivities);
        setClientName(client?.name ?? '');
      })
      .catch(() => {
        if (mounted) setError(t('startWork.prepareError'));
      });

    return () => {
      mounted = false;
    };
  }, [
    activityService,
    clientService,
    projectService,
    requestedProjectId,
    taskService,
    t,
  ]);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const selectedActivity =
    activities.find((activity) => activity.id === selectedActivityId) ?? null;

  async function startSelected() {
    if (!selectedProject) return;

    await timeTrackingService.startWork({
      projectId: selectedProject.id,
      taskId: selectedTaskId,
      activityId: selectedActivityId,
      description: description.trim() || null,
    });
    router.replace('/' as never);
  }

  async function requestStart() {
    if (!selectedProject || busy) return;

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
      setError(t('startWork.startError'));
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
      setError(t('startWork.replaceError'));
    } finally {
      setBusy(false);
    }
  }

  function selectTask(taskId: string | null) {
    setSelectedTaskId(taskId);
    setSelector(null);
  }

  function selectActivity(activityId: string | null) {
    setSelectedActivityId(activityId);
    setSelector(null);
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { backgroundColor: theme.colors.surfaceMuted },
          ]}
        >
          <AppIcon name="back" size={21} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('startWork.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {selectedProject ? (
          <View style={styles.projectCard}>
            <View style={styles.projectAvatar}>
              <Text style={styles.projectAvatarText}>
                {projectMonogram(selectedProject.name)}
              </Text>
            </View>
            <View style={styles.projectCopy}>
              <View style={styles.projectNameRow}>
                <Text numberOfLines={1} style={styles.projectName}>
                  {selectedProject.name}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor:
                        selectedProject.status === 'ACTIVE'
                          ? '#E7F8EF'
                          : theme.colors.accentSoft,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          selectedProject.status === 'ACTIVE'
                            ? theme.colors.success
                            : theme.colors.accent,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          selectedProject.status === 'ACTIVE'
                            ? theme.colors.success
                            : theme.colors.accent,
                      },
                    ]}
                  >
                    {selectedProject.status === 'ACTIVE'
                      ? t('common.active')
                      : t('common.planned')}
                  </Text>
                </View>
              </View>
              <Text numberOfLines={1} style={styles.projectDescription}>
                {selectedProject.description || clientName}
              </Text>
              {clientName && selectedProject.description ? (
                <Text numberOfLines={1} style={styles.projectClient}>
                  {clientName}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.projectCard}>
            <Text style={styles.error}>{t('today.noActiveProjects')}</Text>
          </View>
        )}

        <SelectionField
          label={t('startWork.taskOptional')}
          value={selectedTask?.name ?? t('common.none')}
          accessibilityLabel={t('startWork.taskOptional')}
          onPress={() => setSelector('task')}
        />

        <SelectionField
          label={t('startWork.activityOptional')}
          value={selectedActivity?.name ?? t('common.none')}
          accessibilityLabel={t('startWork.activityOptional')}
          onPress={() => setSelector('activity')}
        />

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('startWork.descriptionOptional')}</Text>
          <View style={styles.descriptionBox}>
            <TextInput
              accessibilityLabel={t('startWork.description')}
              value={description}
              onChangeText={setDescription}
              placeholder={t('startWork.descriptionPlaceholder')}
              placeholderTextColor={theme.colors.textMuted}
              multiline
              maxLength={500}
              textAlignVertical="top"
              style={styles.descriptionInput}
            />
            <Text style={styles.counter}>{description.length}/500</Text>
          </View>
        </View>

        <View style={styles.actionArea}>
          <ActionButton
            label={busy ? t('startWork.starting') : t('startWork.action')}
            accessibilityLabel="Start Work"
            leadingIcon="play"
            disabled={!selectedProject || busy}
            onPress={() => void requestStart()}
          />
        </View>
      </ScrollView>

      <Modal
        visible={selector !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelector(null)}
      >
        <Pressable style={styles.modalScrim} onPress={() => setSelector(null)}>
          <Pressable style={styles.pickerSheet} onPress={() => undefined}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {selector === 'task'
                  ? t('startWork.taskOptional')
                  : t('startWork.activityOptional')}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                style={styles.closeButton}
                onPress={() => setSelector(null)}
              >
                <AppIcon name="close" size={20} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                selector === 'task' ? 'Select no task' : 'Select no activity'
              }
              onPress={() =>
                selector === 'task' ? selectTask(null) : selectActivity(null)
              }
              style={({ pressed }) => [
                styles.choiceRow,
                pressed && { backgroundColor: theme.colors.surfaceMuted },
              ]}
            >
              <Text style={styles.choiceText}>{t('common.none')}</Text>
            </Pressable>

            {selector === 'task'
              ? tasks.map((task) => (
                  <Pressable
                    key={task.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Select task ${task.name}`}
                    onPress={() => selectTask(task.id)}
                    style={({ pressed }) => [
                      styles.choiceRow,
                      pressed && { backgroundColor: theme.colors.surfaceMuted },
                    ]}
                  >
                    <Text style={styles.choiceText}>{task.name}</Text>
                    {selectedTaskId === task.id ? (
                      <AppIcon
                        name="checkCircle"
                        size={18}
                        color={theme.colors.accent}
                      />
                    ) : null}
                  </Pressable>
                ))
              : activities.map((activity) => (
                  <Pressable
                    key={activity.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Select activity ${activity.name}`}
                    onPress={() => selectActivity(activity.id)}
                    style={({ pressed }) => [
                      styles.choiceRow,
                      pressed && { backgroundColor: theme.colors.surfaceMuted },
                    ]}
                  >
                    <Text style={styles.choiceText}>{activity.name}</Text>
                    {selectedActivityId === activity.id ? (
                      <AppIcon
                        name="checkCircle"
                        size={18}
                        color={theme.colors.accent}
                      />
                    ) : null}
                  </Pressable>
                ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={conflictVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConflictVisible(false)}
      >
        <View style={styles.modalScrimCentered}>
          <View style={styles.conflictCard}>
            <Text style={styles.conflictTitle}>{t('startWork.conflictTitle')}</Text>
            <Text style={styles.conflictBody}>{t('startWork.conflictBody')}</Text>
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
          </View>
        </View>
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
    header: {
      minHeight: 58,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 19,
      lineHeight: 24,
      fontWeight: '700',
    },
    headerSpacer: {
      width: 44,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 24,
      gap: 16,
    },
    error: {
      color: theme.colors.error,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600',
    },
    projectCard: {
      minHeight: 78,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    projectAvatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: theme.colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    projectAvatarText: {
      color: theme.colors.accent,
      fontSize: 15,
      fontWeight: '800',
    },
    projectCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    projectNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    projectName: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: '700',
    },
    projectDescription: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    projectClient: {
      color: theme.colors.textMuted,
      fontSize: 11,
      lineHeight: 15,
    },
    statusPill: {
      minHeight: 22,
      borderRadius: 11,
      paddingHorizontal: 7,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
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
    fieldGroup: {
      gap: 4,
    },
    fieldLabel: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600',
    },
    descriptionBox: {
      minHeight: 118,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },
    descriptionInput: {
      minHeight: 88,
      paddingHorizontal: 12,
      paddingTop: 11,
      paddingBottom: 6,
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
    },
    counter: {
      color: theme.colors.textMuted,
      fontSize: 11,
      lineHeight: 15,
      textAlign: 'right',
      paddingHorizontal: 10,
      paddingBottom: 7,
    },
    actionArea: {
      marginTop: 4,
    },
    modalScrim: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: theme.colors.scrim,
    },
    modalScrimCentered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: theme.colors.scrim,
    },
    pickerSheet: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 28,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      backgroundColor: theme.colors.surface,
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
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    choiceRow: {
      minHeight: 52,
      paddingHorizontal: 8,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    choiceText: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 19,
      flex: 1,
    },
    conflictCard: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      padding: 18,
      gap: 12,
    },
    conflictTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '700',
    },
    conflictBody: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
  });
}
