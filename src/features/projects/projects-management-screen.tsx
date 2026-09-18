import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import type { Client } from '@/domain/clients/client';
import {
  PROJECT_STATUSES,
  type Project,
  type ProjectStatus,
} from '@/domain/projects/project';
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

export function ProjectsManagementScreen() {
  const { clientService, projectService, taskService, expenseService, manualTimeService, workspace } = useApplication();
  const { theme } = useTheme();
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [mode, setMode] = useState<Mode>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
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
  const [detailTasks, setDetailTasks] = useState<string[]>([]);

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
      setLoadError('Projects could not be loaded. Try again.');
    } finally {
      setLoading(false);
    }
  }, [clientService, projectService]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const openProjectForm = (project?: Project) => {
    setSelectedProject(project ?? null);
    setProjectName(project?.name ?? '');
    setProjectClientId(project?.clientId ?? clients[0]?.id ?? null);
    setProjectStatus(project?.status ?? 'PLANNED');
    setCurrency(project?.projectCurrency ?? workspace.defaultCurrency);
    setDescription(project?.description ?? '');
    setPlannedStartDate(project?.plannedStartDate ?? '');
    setPlannedEndDate(project?.plannedEndDate ?? '');
    setMode('project');
  };

  const openClientForm = (client?: Client) => {
    setSelectedClient(client ?? null);
    setClientName(client?.name ?? '');
    setClientLegalName(client?.legalName ?? '');
    setClientNotes(client?.notes ?? '');
    setMode('client');
  };

  const saveClient = async () => {
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
      await clientService.create({ name, legalName: clientLegalName.trim() || null, notes: clientNotes.trim() || null });
    }
    setMode(null);
    await load();
  };

  const saveProject = async () => {
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
  };

  const visibleProjects = useMemo(
    () => projects.filter((project) => {
      const client = clients.find((candidate) => candidate.id === project.clientId);
      const matchesText = `${project.name} ${client?.name ?? ''}`
        .toLowerCase()
        .includes(query.trim().toLowerCase());
      return matchesText && (filter === 'ALL' || project.status === filter);
    }),
    [clients, filter, projects, query],
  );

  const cardStyle = {
    minHeight: 56,
    justifyContent: 'center' as const,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
  };

  return (
    <ScreenShell title="Projects" subtitle="Projects and client context">
      <ScrollView contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xxl }}>
        <TextField
          label="Search projects"
          placeholder="Project or client"
          value={query}
          onChangeText={setQuery}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {(['ALL', ...PROJECT_STATUSES] as const).map((item) => (
            <Pressable key={item} onPress={() => setFilter(item)} style={{ minHeight: 44 }}>
              <StatusPill
                label={item === 'ALL' ? 'All' : item.replace('_', ' ')}
                tone={filter === item ? 'accent' : 'neutral'}
              />
            </Pressable>
          ))}
        </View>
        <SectionHeader
          title="Projects"
          metadata={String(visibleProjects.length)}
          actionLabel="Add project"
          onActionPress={() => openProjectForm()}
        />
        {loading ? <Text style={{ color: theme.colors.textSecondary }}>Loading projects…</Text> : null}
        {loadError ? (
          <EmptyState title="Could not load projects" body={loadError} actionLabel="Retry" onActionPress={() => void load()} />
        ) : null}
        {!loading && !loadError && !visibleProjects.length ? (
          <EmptyState
            title="No matching projects"
            body="Create a project or change the filters."
            actionLabel="Create project"
            onActionPress={() => openProjectForm()}
          />
        ) : null}
        {visibleProjects.map((project) => (
          <ProjectRow
            key={project.id}
            projectName={project.name}
            clientName={clients.find((client) => client.id === project.clientId)?.name ?? 'Client'}
            statusLabel={project.status.replace('_', ' ')}
            metadata={project.plannedEndDate ? `Due ${project.plannedEndDate}` : 'Unscheduled'}
            accessibilityLabel={`Open project ${project.name}`}
            onPress={() => {
              setSelectedProject(project);
              setMode('detail');
              void taskService.listTasksForProject(project.id).then((tasks) => setDetailTasks(tasks.map((task) => task.name)));
            }}
          />
        ))}
        <SectionHeader title="Clients" actionLabel="Add client" onActionPress={() => openClientForm()} />
        {!clients.length && !loading ? (
          <EmptyState title="No clients" body="Create a client before adding a project." actionLabel="Add client" onActionPress={() => openClientForm()} />
        ) : null}
        {clients.map((client) => (
          <View key={client.id} style={{ ...cardStyle, gap: theme.spacing.sm }}>
            <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>{client.name}</Text>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Edit client ${client.name}`} onPress={() => openClientForm(client)} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: theme.colors.accent }}>Edit</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Archive client ${client.name}`} onPress={() => void clientService.archive(client.id).then(load)} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: theme.colors.error }}>Archive</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={mode === 'client'} animationType="slide">
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md, backgroundColor: theme.colors.surface }}>
          <SectionHeader title={selectedClient ? 'Edit client' : 'New client'} />
          <TextField label="Client name" placeholder="Client name" value={clientName} onChangeText={setClientName} />
          <TextField label="Legal name" placeholder="Legal name" value={clientLegalName} onChangeText={setClientLegalName} />
          <TextField label="Notes" placeholder="Notes" value={clientNotes} onChangeText={setClientNotes} multiline />
          <ActionButton label={selectedClient ? 'Save client' : 'Add client'} onPress={() => void saveClient()} />
          <ActionButton label="Cancel" variant="secondary" onPress={() => setMode(null)} />
        </ScrollView>
      </Modal>

      <Modal visible={mode === 'project'} animationType="slide">
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md, backgroundColor: theme.colors.surface }}>
          <SectionHeader title={selectedProject ? 'Edit project' : 'New project'} />
          <TextField label="Project name" placeholder="Project name" value={projectName} onChangeText={setProjectName} />
          <TextField label="Description" placeholder="Description" value={description} onChangeText={setDescription} multiline />
          <TextField label="Currency" placeholder="EUR" value={currency} onChangeText={setCurrency} />
          <TextField label="Start date" placeholder="YYYY-MM-DD" value={plannedStartDate} onChangeText={setPlannedStartDate} />
          <TextField label="Due date" placeholder="YYYY-MM-DD" value={plannedEndDate} onChangeText={setPlannedEndDate} />
          <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>Client</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {clients.map((client) => (
              <Pressable key={client.id} onPress={() => setProjectClientId(client.id)} style={{ minHeight: 44 }}>
                <StatusPill label={client.name} tone={projectClientId === client.id ? 'accent' : 'neutral'} />
              </Pressable>
            ))}
          </View>
          <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>Status</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {PROJECT_STATUSES.map((item) => (
              <Pressable key={item} onPress={() => setProjectStatus(item)} style={{ minHeight: 44 }}>
                <StatusPill label={item.replace('_', ' ')} tone={projectStatus === item ? 'accent' : 'neutral'} />
              </Pressable>
            ))}
          </View>
          <ActionButton label="Save project" onPress={() => void saveProject()} disabled={!projectName.trim() || !projectClientId} />
          <ActionButton label="Cancel" variant="secondary" onPress={() => setMode(null)} />
        </ScrollView>
      </Modal>

      <Modal visible={mode === 'detail'} animationType="slide">
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md, backgroundColor: theme.colors.surface }}>
          <SectionHeader title={selectedProject?.name ?? 'Project'} />
          <View style={{ gap: theme.spacing.sm }}>
            <SectionHeader title="Overview" />
            <Text style={{ ...theme.typography.body, color: theme.colors.textSecondary }}>{selectedProject?.description || 'No project description.'}</Text>
            <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>Planned: {selectedProject?.plannedStartDate ?? 'Unscheduled'} — {selectedProject?.plannedEndDate ?? 'Unscheduled'}</Text>
            <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>Client: {clients.find((client) => client.id === selectedProject?.clientId)?.name ?? 'Client'} · Currency: {selectedProject?.projectCurrency ?? workspace.defaultCurrency}</Text>
          </View>
          <View style={{ gap: theme.spacing.xs }}><SectionHeader title="Tasks" metadata={String(detailTasks.length)} />{detailTasks.length ? detailTasks.map((taskName) => <Text key={taskName} style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>{taskName}</Text>) : <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>No tasks yet.</Text>}</View>
          <View style={{ gap: theme.spacing.xs }}><SectionHeader title="Time" /><Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>Open Time history for recorded entries.</Text></View>
          <View style={{ gap: theme.spacing.xs }}><SectionHeader title="Expenses" /><Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>Open Expenses for project costs.</Text></View>
          <View style={{ gap: theme.spacing.xs }}><SectionHeader title="Economics" /><Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>Currency: {selectedProject?.projectCurrency ?? workspace.defaultCurrency}</Text></View>

          {selectedProject ? <ActionButton label="Add expense" accessibilityLabel={`Add expense for ${selectedProject.name}`} onPress={() => router.push({ pathname: '/expense/edit', params: { projectId: selectedProject.id } })} /> : null}
          <ActionButton label="Edit project" onPress={() => selectedProject && openProjectForm(selectedProject)} />
          {selectedProject ? <ActionButton label="Archive project" accessibilityLabel={`Archive project ${selectedProject.name}`} variant="danger" onPress={() => void projectService.archive(selectedProject.id).then(async () => { setMode(null); await load(); })} /> : null}
          <ActionButton label="Close" variant="secondary" onPress={() => setMode(null)} />
        </ScrollView>
      </Modal>
    </ScreenShell>
  );
}