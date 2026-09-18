import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import type { Client } from '@/domain/clients/client';
import {
  PROJECT_STATUSES,
  type Project,
  type ProjectStatus,
} from '@/domain/projects/project';
import { useUiCopy } from '@/i18n/use-ui-copy';
import { useApplication } from '@/providers/application-context';
import { ActionButton } from '@/ui/components/action-button';
import { EmptyState } from '@/ui/components/empty-state';
import { TextField } from '@/ui/components/form-fields';
import { ProjectRow } from '@/ui/components/project-row';
import { ScreenShell } from '@/ui/components/screen-shell';
import { SectionHeader } from '@/ui/components/section-header';
import { StatusPill } from '@/ui/components/status-pill';
import { useTheme } from '@/ui/theme/use-theme';

type Mode = 'project' | 'detail' | 'client' | null;
type DetailTab = 'overview' | 'tasks' | 'time' | 'expenses' | 'economics';

export function ProjectsManagementScreen() {
  const { clientService, projectService, taskService, workspace } = useApplication();
  const { theme } = useTheme();
  const t = useUiCopy();

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [mode, setMode] = useState<Mode>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [detailTasks, setDetailTasks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | ProjectStatus>('ALL');

  const [projectName, setProjectName] = useState('');
  const [projectClientId, setProjectClientId] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>('PLANNED');
  const [currency, setCurrency] = useState(workspace.defaultCurrency);
  const [description, setDescription] = useState('');
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');

  const [clientName, setClientName] = useState('');
  const [clientLegalName, setClientLegalName] = useState('');
  const [clientNotes, setClientNotes] = useState('');

  const statusLabel = useCallback(
    (status: ProjectStatus) => {
      switch (status) {
        case 'PLANNED':
          return t('status.planned', 'Planned');
        case 'ACTIVE':
          return t('status.active', 'Active');
        case 'ON_HOLD':
          return t('status.onHold', 'On hold');
        case 'COMPLETED':
          return t('status.completed', 'Completed');
        case 'CANCELLED':
          return t('status.cancelled', 'Cancelled');
      }
    },
    [t],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [nextClients, nextProjects] = await Promise.all([
        clientService.listActive(),
        projectService.listActiveProjects(),
      ]);
      setClients(nextClients);
      setProjects(nextProjects);
      setProjectClientId((value) => value ?? nextClients[0]?.id ?? null);
    } catch {
      setLoadError(t('projects.loadErrorBody', 'Try again.'));
    } finally {
      setLoading(false);
    }
  }, [clientService, projectService, t]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  function openProjectForm(project?: Project) {
    setSelectedProject(project ?? null);
    setProjectName(project?.name ?? '');
    setProjectClientId(project?.clientId ?? clients[0]?.id ?? null);
    setProjectStatus(project?.status ?? 'PLANNED');
    setCurrency(project?.projectCurrency ?? workspace.defaultCurrency);
    setDescription(project?.description ?? '');
    setPlannedStartDate(project?.plannedStartDate ?? '');
    setPlannedEndDate(project?.plannedEndDate ?? '');
    setMode('project');
  }

  function openClientForm(client?: Client) {
    setSelectedClient(client ?? null);
    setClientName(client?.name ?? '');
    setClientLegalName(client?.legalName ?? '');
    setClientNotes(client?.notes ?? '');
    setMode('client');
  }

  async function openProjectDetail(project: Project) {
    setSelectedProject(project);
    setDetailTab('overview');
    setDetailTasks([]);
    setMode('detail');
    try {
      const tasks = await taskService.listTasksForProject(project.id);
      setDetailTasks(tasks.map((task) => task.name));
    } catch {
      setDetailTasks([]);
    }
  }

  async function saveClient() {
    const name = clientName.trim();
    if (!name) return;

    if (selectedClient) {
      await clientService.update({
        id: selectedClient.id,
        name,
        legalName: clientLegalName.trim() || null,
        notes: clientNotes.trim() || null,
      });
    } else {
      await clientService.create({
        name,
        legalName: clientLegalName.trim() || null,
        notes: clientNotes.trim() || null,
      });
    }

    setMode(null);
    await load();
  }

  async function saveProject() {
    const name = projectName.trim();
    if (!name || !projectClientId) return;

    const input = {
      clientId: projectClientId,
      name,
      description: description.trim() || null,
      status: projectStatus,
      projectCurrency: currency.trim().toUpperCase(),
      plannedStartDate: plannedStartDate || null,
      plannedEndDate: plannedEndDate || null,
    };

    if (selectedProject) {
      await projectService.update({
        id: selectedProject.id,
        ...input,
        actualStartDate: selectedProject.actualStartDate,
        actualEndDate: selectedProject.actualEndDate,
      });
    } else {
      await projectService.create(input);
    }

    setMode(null);
    await load();
  }

  const visibleProjects = useMemo(
    () =>
      projects.filter((project) => {
        const client = clients.find((candidate) => candidate.id === project.clientId);
        const matchesText = `${project.name} ${client?.name ?? ''}`
          .toLowerCase()
          .includes(query.trim().toLowerCase());
        return matchesText && (filter === 'ALL' || project.status === filter);
      }),
    [clients, filter, projects, query],
  );

  const selectedProjectClient = clients.find(
    (client) => client.id === selectedProject?.clientId,
  );

  return (
    <ScreenShell
      title={t('nav.projects', 'Projects')}
      subtitle={t('projects.subtitle', 'Projects and client context')}
    >
      <ScrollView
        contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          label={t('projects.search', 'Search projects')}
          accessibilityLabel={t('projects.search', 'Search projects')}
          placeholder={t('projects.searchPlaceholder', 'Project or client')}
          value={query}
          onChangeText={setQuery}
        />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {(['ALL', ...PROJECT_STATUSES] as const).map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === item }}
              onPress={() => setFilter(item)}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <StatusPill
                label={
                  item === 'ALL'
                    ? t('projects.all', 'All')
                    : statusLabel(item)
                }
                tone={filter === item ? 'accent' : 'neutral'}
              />
            </Pressable>
          ))}
        </View>

        <SectionHeader
          title={t('nav.projects', 'Projects')}
          metadata={String(visibleProjects.length)}
          actionLabel={t('projects.addProject', 'Add project')}
          onActionPress={() => openProjectForm()}
        />

        {loading ? (
          <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
            {t('projects.loading', 'Loading projects…')}
          </Text>
        ) : null}

        {loadError ? (
          <EmptyState
            title={t('projects.loadErrorTitle', 'Could not load projects')}
            body={loadError}
            actionLabel={t('projects.retry', 'Retry')}
            onActionPress={() => void load()}
          />
        ) : null}

        {!loading && !loadError && !visibleProjects.length ? (
          <EmptyState
            title={t('projects.noMatchingTitle', 'No matching projects')}
            body={t(
              'projects.noMatchingBody',
              'Create a project or change the filters.',
            )}
            actionLabel={t('common.createProject', 'Create project')}
            onActionPress={() => openProjectForm()}
          />
        ) : null}

        {visibleProjects.map((project) => (
          <ProjectRow
            key={project.id}
            projectName={project.name}
            clientName={
              clients.find((client) => client.id === project.clientId)?.name ??
              t('projects.clientFallback', 'Client')
            }
            statusLabel={statusLabel(project.status)}
            metadata={
              project.plannedEndDate
                ? `${t('projects.due', 'Due')} ${project.plannedEndDate}`
                : t('projects.unscheduled', 'Unscheduled')
            }
            accessibilityLabel={`${t('projects.openProject', 'Open project')} ${project.name}`}
            onPress={() => void openProjectDetail(project)}
          />
        ))}

        <SectionHeader
          title={t('projects.clients', 'Clients')}
          actionLabel={t('projects.addClient', 'Add client')}
          onActionPress={() => openClientForm()}
        />

        {!clients.length && !loading ? (
          <EmptyState
            title={t('projects.noClientsTitle', 'No clients')}
            body={t(
              'projects.noClientsBody',
              'Create a client before adding a project.',
            )}
            actionLabel={t('projects.addClient', 'Add client')}
            onActionPress={() => openClientForm()}
          />
        ) : null}

        {clients.map((client) => (
          <View
            key={client.id}
            style={{
              minHeight: theme.sizing.rowMinHeight,
              padding: theme.spacing.md,
              gap: theme.spacing.sm,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>
              {client.name}
            </Text>
            <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('projects.editClient', 'Edit client')} ${client.name}`}
                onPress={() => openClientForm(client)}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={{ ...theme.typography.caption, color: theme.colors.accent }}>
                  {t('projects.edit', 'Edit')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('projects.archiveClient', 'Archive client')} ${client.name}`}
                onPress={() => void clientService.archive(client.id).then(load)}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={{ ...theme.typography.caption, color: theme.colors.error }}>
                  {t('projects.archive', 'Archive')}
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={mode === 'client'} animationType="slide">
        <ScreenShell
          title={
            selectedClient
              ? t('projects.editClientTitle', 'Edit client')
              : t('projects.newClient', 'New client')
          }
        >
          <ScrollView
            contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xxl }}
            keyboardShouldPersistTaps="handled"
          >
            <TextField
              label={t('projects.clientName', 'Client name')}
              placeholder={t('projects.clientName', 'Client name')}
              value={clientName}
              onChangeText={setClientName}
            />
            <TextField
              label={t('projects.legalName', 'Legal name')}
              placeholder={t('projects.legalName', 'Legal name')}
              value={clientLegalName}
              onChangeText={setClientLegalName}
            />
            <TextField
              label={t('projects.notes', 'Notes')}
              placeholder={t('projects.notes', 'Notes')}
              value={clientNotes}
              onChangeText={setClientNotes}
              multiline
            />
            <ActionButton
              label={
                selectedClient
                  ? t('projects.saveClient', 'Save client')
                  : t('projects.addClient', 'Add client')
              }
              disabled={!clientName.trim()}
              onPress={() => void saveClient()}
            />
            <ActionButton
              label={t('more.cancel', 'Cancel')}
              variant="secondary"
              onPress={() => setMode(null)}
            />
          </ScrollView>
        </ScreenShell>
      </Modal>

      <Modal visible={mode === 'project'} animationType="slide">
        <ScreenShell
          title={
            selectedProject
              ? t('projects.editProjectTitle', 'Edit project')
              : t('projects.newProject', 'New project')
          }
        >
          <ScrollView
            contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xxl }}
            keyboardShouldPersistTaps="handled"
          >
            <TextField
              label={t('projects.projectName', 'Project name')}
              placeholder={t('projects.projectName', 'Project name')}
              value={projectName}
              onChangeText={setProjectName}
            />
            <TextField
              label={t('projects.description', 'Description')}
              placeholder={t('projects.description', 'Description')}
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <TextField
              label={t('projects.currency', 'Currency')}
              placeholder="EUR"
              value={currency}
              autoCapitalize="characters"
              onChangeText={(value) => setCurrency(value.toUpperCase())}
            />
            <TextField
              label={t('projects.startDate', 'Start date')}
              helperText="YYYY-MM-DD"
              value={plannedStartDate}
              onChangeText={setPlannedStartDate}
            />
            <TextField
              label={t('projects.dueDate', 'Due date')}
              helperText="YYYY-MM-DD"
              value={plannedEndDate}
              onChangeText={setPlannedEndDate}
            />

            <View style={{ gap: theme.spacing.sm }}>
              <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
                {t('projects.client', 'Client')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                {clients.map((client) => (
                  <Pressable
                    key={client.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: projectClientId === client.id }}
                    onPress={() => setProjectClientId(client.id)}
                    style={{ minHeight: 44, justifyContent: 'center' }}
                  >
                    <StatusPill
                      label={client.name}
                      tone={projectClientId === client.id ? 'accent' : 'neutral'}
                    />
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ gap: theme.spacing.sm }}>
              <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
                {t('projects.status', 'Status')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                {PROJECT_STATUSES.map((item) => (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: projectStatus === item }}
                    onPress={() => setProjectStatus(item)}
                    style={{ minHeight: 44, justifyContent: 'center' }}
                  >
                    <StatusPill
                      label={statusLabel(item)}
                      tone={projectStatus === item ? 'accent' : 'neutral'}
                    />
                  </Pressable>
                ))}
              </View>
            </View>

            <ActionButton
              label={t('projects.saveProject', 'Save project')}
              onPress={() => void saveProject()}
              disabled={!projectName.trim() || !projectClientId}
            />
            <ActionButton
              label={t('more.cancel', 'Cancel')}
              variant="secondary"
              onPress={() => setMode(null)}
            />
          </ScrollView>
        </ScreenShell>
      </Modal>

      <Modal visible={mode === 'detail'} animationType="slide">
        <ScreenShell
          title={selectedProject?.name ?? t('nav.projects', 'Projects')}
          subtitle={selectedProjectClient?.name}
        >
          <View style={{ flex: 1, gap: theme.spacing.md }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: theme.spacing.sm }}
              style={{ flexGrow: 0 }}
            >
              <DetailTabButton
                label={t('projects.tabOverview', 'Overview')}
                selected={detailTab === 'overview'}
                onPress={() => setDetailTab('overview')}
              />
              <DetailTabButton
                label={t('projects.tabTasks', 'Tasks')}
                selected={detailTab === 'tasks'}
                onPress={() => setDetailTab('tasks')}
              />
              <DetailTabButton
                label={t('projects.tabTime', 'Time')}
                selected={detailTab === 'time'}
                onPress={() => setDetailTab('time')}
              />
              <DetailTabButton
                label={t('projects.tabExpenses', 'Expenses')}
                selected={detailTab === 'expenses'}
                onPress={() => setDetailTab('expenses')}
              />
              <DetailTabButton
                label={t('projects.tabEconomics', 'Economics')}
                selected={detailTab === 'economics'}
                onPress={() => setDetailTab('economics')}
              />
            </ScrollView>

            <ScrollView
              contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xxl }}
            >
              {detailTab === 'overview' ? (
                <View style={{ gap: theme.spacing.sm }}>
                  <Text style={{ ...theme.typography.body, color: theme.colors.textSecondary }}>
                    {selectedProject?.description ||
                      t('projects.noDescription', 'No project description.')}
                  </Text>
                  <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>
                    {t('projects.planned', 'Planned')}: {selectedProject?.plannedStartDate ?? t('projects.unscheduled', 'Unscheduled')} — {selectedProject?.plannedEndDate ?? t('projects.unscheduled', 'Unscheduled')}
                  </Text>
                  <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>
                    {t('projects.client', 'Client')}: {selectedProjectClient?.name ?? t('projects.clientFallback', 'Client')}
                  </Text>
                  <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>
                    {t('projects.projectCurrency', 'Project currency')}: {selectedProject?.projectCurrency ?? workspace.defaultCurrency}
                  </Text>
                </View>
              ) : null}

              {detailTab === 'tasks' ? (
                <View style={{ gap: theme.spacing.sm }}>
                  <SectionHeader
                    title={t('projects.tabTasks', 'Tasks')}
                    metadata={String(detailTasks.length)}
                  />
                  {detailTasks.length ? (
                    detailTasks.map((taskName) => (
                      <View
                        key={taskName}
                        style={{
                          minHeight: 44,
                          justifyContent: 'center',
                          paddingHorizontal: theme.spacing.md,
                          borderRadius: theme.radii.md,
                          backgroundColor: theme.colors.surface,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                        }}
                      >
                        <Text style={{ ...theme.typography.body, color: theme.colors.textPrimary }}>
                          {taskName}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>
                      {t('projects.noTasks', 'No tasks yet.')}
                    </Text>
                  )}
                </View>
              ) : null}

              {detailTab === 'time' ? (
                <ActionButton
                  label={t('projects.openTimeHistory', 'Open time history')}
                  onPress={() => router.push('/time-history' as never)}
                />
              ) : null}

              {detailTab === 'expenses' ? (
                <View style={{ gap: theme.spacing.sm }}>
                  {selectedProject ? (
                    <ActionButton
                      label={t('common.addExpense', 'Add expense')}
                      accessibilityLabel={`${t('common.addExpense', 'Add expense')} for ${selectedProject.name}`}
                      onPress={() =>
                        router.push({
                          pathname: '/expense/edit',
                          params: { projectId: selectedProject.id },
                        } as never)
                      }
                    />
                  ) : null}
                  <ActionButton
                    label={t('projects.openExpenses', 'Open expenses')}
                    variant="secondary"
                    onPress={() => router.push('/expenses' as never)}
                  />
                </View>
              ) : null}

              {detailTab === 'economics' ? (
                <View
                  style={{
                    padding: theme.spacing.md,
                    borderRadius: theme.radii.md,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  }}
                >
                  <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>
                    {t('projects.projectCurrency', 'Project currency')}
                  </Text>
                  <Text style={{ ...theme.typography.body, color: theme.colors.textSecondary }}>
                    {selectedProject?.projectCurrency ?? workspace.defaultCurrency}
                  </Text>
                </View>
              ) : null}

              <ActionButton
                label={t('projects.editProject', 'Edit project')}
                onPress={() => selectedProject && openProjectForm(selectedProject)}
              />
              {selectedProject ? (
                <ActionButton
                  label={t('projects.archiveProject', 'Archive project')}
                  accessibilityLabel={`${t('projects.archiveProject', 'Archive project')} ${selectedProject.name}`}
                  variant="danger"
                  onPress={() =>
                    void projectService.archive(selectedProject.id).then(async () => {
                      setMode(null);
                      await load();
                    })
                  }
                />
              ) : null}
              <ActionButton
                label={t('projects.close', 'Close')}
                variant="secondary"
                onPress={() => setMode(null)}
              />
            </ScrollView>
          </View>
        </ScreenShell>
      </Modal>
    </ScreenShell>
  );
}

function DetailTabButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radii.md,
        borderWidth: 1,
        borderColor: selected ? theme.colors.accent : theme.colors.border,
        backgroundColor: pressed
          ? theme.colors.surfaceMuted
          : selected
            ? theme.colors.accentSoft
            : theme.colors.surface,
      })}
    >
      <Text
        style={{
          ...theme.typography.caption,
          fontWeight: '600',
          color: selected ? theme.colors.accent : theme.colors.textPrimary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
