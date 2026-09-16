import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Client } from '@/domain/clients/client';
import { PROJECT_STATUSES, type Project, type ProjectStatus } from '@/domain/projects/project';
import { useApplication } from '@/providers/application-context';
import { ScreenShell } from '@/ui/components/screen-shell';
import { colors, radii, spacing, typography } from '@/ui/theme/tokens';

export function ProjectsManagementScreen() {
  const { clientService, projectService, workspace } = useApplication();
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientLegalName, setClientLegalName] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectCurrency, setProjectCurrency] = useState(workspace.defaultCurrency);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>('PLANNED');
  const [projectStart, setProjectStart] = useState('');
  const [projectEnd, setProjectEnd] = useState('');
  const [projectClientId, setProjectClientId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [nextClients, nextProjects] = await Promise.all([
      clientService.listActive(),
      projectService.listActiveProjects(),
    ]);
    setClients(nextClients);
    setProjects(nextProjects);
    setProjectClientId((current) => current ?? nextClients[0]?.id ?? null);
  }, [clientService, projectService]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      clientService.listActive(),
      projectService.listActiveProjects(),
    ]).then(([nextClients, nextProjects]) => {
      if (!active) return;
      setClients(nextClients);
      setProjects(nextProjects);
      setProjectClientId((current) => current ?? nextClients[0]?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, [clientService, projectService]);

  async function submitClient() {
    const name = clientName.trim();
    if (!name) return;

    const input = {
      name,
      legalName: clientLegalName.trim() || null,
      notes: clientNotes.trim() || null,
    };
    if (editingClientId) {
      await clientService.update({ id: editingClientId, ...input });
    } else {
      await clientService.create(input);
    }
    resetClientForm();
    await load();
  }

  function resetClientForm() {
    setEditingClientId(null);
    setClientName('');
    setClientLegalName('');
    setClientNotes('');
  }

  function editClient(client: Client) {
    setEditingClientId(client.id);
    setClientName(client.name);
    setClientLegalName(client.legalName ?? '');
    setClientNotes(client.notes ?? '');
  }

  async function archiveClient(id: string) {
    await clientService.archive(id);
    if (editingClientId === id) resetClientForm();
    await load();
  }

  async function submitProject() {
    const name = projectName.trim();
    if (!name || !projectClientId) return;

    const common = {
      clientId: projectClientId,
      name,
      description: projectDescription.trim() || null,
      status: projectStatus,
      plannedStartDate: projectStart.trim() || null,
      plannedEndDate: projectEnd.trim() || null,
      projectCurrency: projectCurrency.trim().toUpperCase() || workspace.defaultCurrency,
    };

    if (editingProjectId) {
      const current = projects.find((item) => item.id === editingProjectId);
      if (!current) return;
      await projectService.update({
        id: editingProjectId,
        ...common,
        actualStartDate: current.actualStartDate,
        actualEndDate: current.actualEndDate,
      });
    } else {
      await projectService.create(common);
    }
    resetProjectForm();
    await load();
  }

  function resetProjectForm() {
    setEditingProjectId(null);
    setProjectName('');
    setProjectDescription('');
    setProjectCurrency(workspace.defaultCurrency);
    setProjectStatus('PLANNED');
    setProjectStart('');
    setProjectEnd('');
  }

  function editProject(project: Project) {
    setEditingProjectId(project.id);
    setProjectClientId(project.clientId);
    setProjectName(project.name);
    setProjectDescription(project.description ?? '');
    setProjectCurrency(project.projectCurrency);
    setProjectStatus(project.status);
    setProjectStart(project.plannedStartDate ?? '');
    setProjectEnd(project.plannedEndDate ?? '');
  }

  async function archiveProject(id: string) {
    await projectService.archive(id);
    if (editingProjectId === id) resetProjectForm();
    await load();
  }

  return (
    <ScreenShell
      title="Projects"
      subtitle="Manage clients and the projects you deliver for them."
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionTitle>Clients</SectionTitle>
        <TextInput style={styles.input} placeholder="Client name" value={clientName} onChangeText={setClientName} />
        <TextInput style={styles.input} placeholder="Legal name (optional)" value={clientLegalName} onChangeText={setClientLegalName} />
        <TextInput style={styles.input} placeholder="Client notes (optional)" value={clientNotes} onChangeText={setClientNotes} multiline />
        <View style={styles.actionRow}>
          <PrimaryButton label={editingClientId ? 'Save client' : 'Add client'} onPress={() => void submitClient()} />
          {editingClientId ? <SecondaryButton label="Cancel" onPress={resetClientForm} /> : null}
        </View>
        {clients.map((client) => (
          <EntityCard key={client.id} title={client.name} detail={client.legalName ?? 'Client'}>
            <SecondaryButton label="Edit" accessibilityLabel={`Edit client ${client.name}`} onPress={() => editClient(client)} />
            <SecondaryButton label="Archive" accessibilityLabel={`Archive client ${client.name}`} onPress={() => void archiveClient(client.id)} />
          </EntityCard>
        ))}

        <SectionTitle>Projects</SectionTitle>
        {clients.length === 0 ? (
          <Text style={styles.muted}>Create a client before adding a project.</Text>
        ) : (
          <>
            <Text style={styles.label}>Client</Text>
            <View style={styles.chips}>
              {clients.map((client) => (
                <Chip
                  key={client.id}
                  label={client.name}
                  selected={projectClientId === client.id}
                  onPress={() => setProjectClientId(client.id)}
                />
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Project name" value={projectName} onChangeText={setProjectName} />
            <TextInput style={styles.input} placeholder="Description (optional)" value={projectDescription} onChangeText={setProjectDescription} multiline />
            <TextInput style={styles.input} placeholder="Currency" autoCapitalize="characters" value={projectCurrency} onChangeText={setProjectCurrency} />
            <TextInput style={styles.input} placeholder="Planned start YYYY-MM-DD" value={projectStart} onChangeText={setProjectStart} />
            <TextInput style={styles.input} placeholder="Planned end YYYY-MM-DD" value={projectEnd} onChangeText={setProjectEnd} />
            <Text style={styles.label}>Status</Text>
            <View style={styles.chips}>
              {PROJECT_STATUSES.map((status) => (
                <Chip key={status} label={status.replace('_', ' ')} selected={projectStatus === status} onPress={() => setProjectStatus(status)} />
              ))}
            </View>
            <View style={styles.actionRow}>
              <PrimaryButton label={editingProjectId ? 'Save project' : 'Add project'} onPress={() => void submitProject()} />
              {editingProjectId ? <SecondaryButton label="Cancel" onPress={resetProjectForm} /> : null}
            </View>
          </>
        )}
        {projects.map((project) => {
          const owner = clients.find((client) => client.id === project.clientId);
          return (
            <EntityCard key={project.id} title={project.name} detail={`${owner?.name ?? 'Unknown client'} · ${project.status} · ${project.projectCurrency}`}>
              <SecondaryButton label="Edit" accessibilityLabel={`Edit project ${project.name}`} onPress={() => editProject(project)} />
              <SecondaryButton label="Archive" accessibilityLabel={`Archive project ${project.name}`} onPress={() => void archiveProject(project.id)} />
            </EntityCard>
          );
        })}
      </ScrollView>
    </ScreenShell>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function EntityCard({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.muted}>{detail}</Text>
      <View style={styles.actionRow}>{children}</View>
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.primaryButton} onPress={onPress}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <Pressable style={styles.secondaryButton} onPress={onPress} accessibilityLabel={accessibilityLabel}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
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
  sectionTitle: { color: colors.textPrimary, fontSize: typography.sectionTitle, fontWeight: '700', marginTop: spacing.md },
  label: { color: colors.textMuted, fontSize: typography.caption, fontWeight: '600' },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, color: colors.textPrimary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.body },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  primaryButton: { backgroundColor: colors.accent, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  primaryButtonText: { color: colors.surface, fontWeight: '700' },
  secondaryButton: { borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  secondaryButtonText: { color: colors.textPrimary, fontWeight: '600' },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  cardTitle: { color: colors.textPrimary, fontSize: typography.body, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: typography.caption },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textPrimary, fontSize: typography.caption },
  chipTextSelected: { color: colors.surface, fontWeight: '700' },
});
