import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { I18nProvider } from '../../src/i18n/i18n-provider';
import { ApplicationContextProvider } from '../../src/providers/application-context';
import { ThemeProvider } from '../../src/ui/theme/theme-provider';
import { darkTheme } from '../../src/ui/theme/theme';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

const client = {
  id: 'client-1',
  workspaceId: 'workspace-1',
  name: 'Maubank',
  legalName: null,
  notes: null,
  archivedAt: null,
  createdAt: '2026-09-16T00:00:00.000Z',
  updatedAt: '2026-09-16T00:00:00.000Z',
};
const project = {
  id: 'project-1',
  clientId: 'client-1',
  name: 'Mailing tool',
  description: null,
  status: 'ACTIVE',
  plannedStartDate: null,
  plannedEndDate: null,
  actualStartDate: null,
  actualEndDate: null,
  projectCurrency: 'EUR',
  archivedAt: null,
  createdAt: '2026-09-16T00:00:00.000Z',
  updatedAt: '2026-09-16T00:00:00.000Z',
};
const task = {
  id: 'task-1',
  projectId: 'project-1',
  name: 'SMTP integration',
  description: null,
  status: 'PENDING',
  priority: null,
  estimatedMinutes: 120,
  plannedStartDate: null,
  plannedEndDate: null,
  actualStartDate: null,
  actualEndDate: null,
  archivedAt: null,
  createdAt: '2026-09-16T00:00:00.000Z',
  updatedAt: '2026-09-16T00:00:00.000Z',
};
const activity = {
  id: 'activity-1',
  workspaceId: 'workspace-1',
  name: 'Development',
  archivedAt: null,
  createdAt: '2026-09-16T00:00:00.000Z',
};

function makeApplication() {
  return {
    workspace: {
      id: 'workspace-1',
      name: 'Freelance Ops',
      defaultCurrency: 'EUR',
      createdAt: '2026-09-16T00:00:00.000Z',
      updatedAt: '2026-09-16T00:00:00.000Z',
    },
    clientService: {
      listActive: jest.fn(async () => [client]),
      create: jest.fn(async (input) => ({ ...client, id: 'client-2', ...input })),
      update: jest.fn(async (input) => ({ ...client, ...input })),
      archive: jest.fn(async () => undefined),
    },
    projectService: {
      listActiveProjects: jest.fn(async () => [project]),
      create: jest.fn(async (input) => ({ ...project, id: 'project-2', ...input })),
      update: jest.fn(async (input) => ({ ...project, ...input })),
      archive: jest.fn(async () => undefined),
    },
    taskService: {
      listTasksForProject: jest.fn(async () => [task]),
      create: jest.fn(async (input) => ({ ...task, id: 'task-2', ...input })),
      update: jest.fn(async (input) => ({ ...task, ...input })),
      archive: jest.fn(async () => undefined),
    },
    activityService: {
      listActive: jest.fn(async () => [activity]),
      create: jest.fn(async (input) => ({ ...activity, id: 'activity-2', ...input })),
      update: jest.fn(async (input) => ({ ...activity, ...input })),
      archive: jest.fn(async () => undefined),
    },
  };
}

describe('core entity mobile screens', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('manages clients and projects through application services', async () => {
    const { ProjectsManagementScreen } = jest.requireActual(
      '../../src/features/projects/projects-management-screen',
    ) as { ProjectsManagementScreen: React.ComponentType };
    const application = makeApplication();
    const view = await render(
      <ThemeProvider systemColorScheme="light"><ApplicationContextProvider application={application as never}>
        <ProjectsManagementScreen />
      </ApplicationContextProvider></ThemeProvider>,
    );

    expect((await view.findAllByText('Maubank')).length).toBeGreaterThan(0);
    expect(view.getByText('Mailing tool')).toBeTruthy();

    await fireEvent.press(view.getByText('Add client'));
    await fireEvent.changeText(view.getByPlaceholderText('Client name'), 'Nissan');
    await fireEvent.press(view.getAllByText('Add client')[1]);
    expect(application.clientService.create).toHaveBeenCalledWith({
      name: 'Nissan',
      legalName: null,
      notes: null,
    });

    await fireEvent.press(view.getByLabelText('Archive client Maubank'));
    expect(application.clientService.archive).toHaveBeenCalledWith('client-1');

    await fireEvent.press(view.getByText('Add project'));
    await fireEvent.changeText(view.getByPlaceholderText('Project name'), 'Spare parts');
    await fireEvent.press(view.getByText('Save project'));
    expect(application.projectService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-1',
        name: 'Spare parts',
        projectCurrency: 'EUR',
      }),
    );

    await fireEvent.press(view.getByLabelText('Open project Mailing tool'));
    expect(view.getByRole('tab', { name: 'Overview' })).toBeTruthy();
    expect(view.getByRole('tab', { name: 'Tasks' })).toBeTruthy();
    expect(view.getByRole('tab', { name: 'Time' })).toBeTruthy();
    expect(view.getByRole('tab', { name: 'Expenses' })).toBeTruthy();
    expect(view.getByRole('tab', { name: 'Economics' })).toBeTruthy();
    await fireEvent.press(view.getByRole('tab', { name: 'Expenses' }));
    await fireEvent.press(view.getByLabelText('Add expense for Mailing tool'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/expense/edit',
      params: { projectId: 'project-1' },
    });

    await fireEvent.press(view.getByLabelText('Archive project Mailing tool'));
    expect(application.projectService.archive).toHaveBeenCalledWith('project-1');
  }, 10_000);

  it('renders Projects and project detail tabs fully localized in Spanish dark mode', async () => {
    const { ProjectsManagementScreen } = jest.requireActual(
      '../../src/features/projects/projects-management-screen',
    ) as { ProjectsManagementScreen: React.ComponentType };
    await AsyncStorage.setItem('freelance-ops:language', 'es');
    const view = await render(
      <ThemeProvider systemColorScheme="dark"><I18nProvider>
        <ApplicationContextProvider application={makeApplication() as never}>
          <ProjectsManagementScreen />
        </ApplicationContextProvider>
      </I18nProvider></ThemeProvider>,
    );

    expect(await view.findByText('Proyectos')).toBeTruthy();
    expect(view.getByText('Clientes')).toBeTruthy();
    expect(view.getByLabelText('Buscar proyectos')).toHaveStyle({
      color: darkTheme.colors.textPrimary,
      backgroundColor: darkTheme.colors.surface,
    });

    await fireEvent.press(view.getByLabelText('Abrir proyecto Mailing tool'));
    expect(view.getByRole('tab', { name: 'Resumen' })).toBeTruthy();
    expect(view.getByRole('tab', { name: 'Tareas' })).toBeTruthy();
    expect(view.getByRole('tab', { name: 'Tiempo' })).toBeTruthy();
    expect(view.getByRole('tab', { name: 'Gastos' })).toBeTruthy();
    expect(view.getByRole('tab', { name: 'Economía' })).toBeTruthy();
    expect(view.queryByText('Open Time history for recorded entries.')).toBeNull();
  }, 10_000);

  it('manages project tasks through application services', async () => {
    const { TasksManagementScreen } = jest.requireActual(
      '../../src/features/tasks/tasks-management-screen',
    ) as { TasksManagementScreen: React.ComponentType };
    const application = makeApplication();
    const view = await render(
      <ThemeProvider systemColorScheme="light"><ApplicationContextProvider application={application as never}>
        <TasksManagementScreen />
      </ApplicationContextProvider></ThemeProvider>,
    );

    expect(await view.findByText('SMTP integration')).toBeTruthy();
    await fireEvent.press(view.getByText('Add task'));
    await fireEvent.changeText(view.getByPlaceholderText('Task name'), 'Catalogue parser');
    await fireEvent.changeText(view.getByPlaceholderText('Estimated minutes'), '90');
    await fireEvent.press(view.getAllByText('Add task')[1]);

    expect(application.taskService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        name: 'Catalogue parser',
        estimatedMinutes: 90,
      }),
    );

    await fireEvent.press(view.getByLabelText('Archive task SMTP integration'));
    expect(application.taskService.archive).toHaveBeenCalledWith('task-1');
  });

  it('renders Tasks and its editor fully localized in Spanish dark mode', async () => {
    const { TasksManagementScreen } = jest.requireActual(
      '../../src/features/tasks/tasks-management-screen',
    ) as { TasksManagementScreen: React.ComponentType };
    await AsyncStorage.setItem('freelance-ops:language', 'es');
    const view = await render(
      <ThemeProvider systemColorScheme="dark"><I18nProvider>
        <ApplicationContextProvider application={makeApplication() as never}>
          <TasksManagementScreen />
        </ApplicationContextProvider>
      </I18nProvider></ThemeProvider>,
    );

    expect(await view.findByText('Tareas')).toBeTruthy();
    expect(view.getByText('Proyecto')).toBeTruthy();
    expect(await view.findByText('SMTP integration')).toBeTruthy();
    expect(view.getByText('Pendiente')).toBeTruthy();

    await fireEvent.press(view.getByText('Añadir tarea'));
    const nameInput = view.getByLabelText('Nombre de la tarea');
    expect(nameInput).toHaveStyle({
      color: darkTheme.colors.textPrimary,
      backgroundColor: darkTheme.colors.surface,
    });
    expect(view.getByText('Descripción · opcional')).toBeTruthy();
    expect(view.getByText('Prioridad · opcional')).toBeTruthy();
    expect(view.getByText('Esfuerzo estimado (minutos) · opcional')).toBeTruthy();
    expect(view.getByText('Fecha de inicio · opcional')).toBeTruthy();
    expect(view.getByText('Fecha de vencimiento · opcional')).toBeTruthy();
  });

  it('manages configurable activities through application services', async () => {
    const { ActivitiesManagement } = jest.requireActual(
      '../../src/features/activities/activities-management',
    ) as { ActivitiesManagement: React.ComponentType };
    const application = makeApplication();
    const view = await render(
      <ThemeProvider systemColorScheme="light"><ApplicationContextProvider application={application as never}>
        <I18nProvider><ActivitiesManagement /></I18nProvider>
      </ApplicationContextProvider></ThemeProvider>,
    );

    expect(await view.findByText('Development')).toBeTruthy();
    await fireEvent.changeText(view.getByPlaceholderText('Activity name'), 'Research');
    await fireEvent.press(view.getByText('Add activity'));
    expect(application.activityService.create).toHaveBeenCalledWith({ name: 'Research' });

    await fireEvent.press(view.getByLabelText('Edit activity Development'));
    await fireEvent.changeText(view.getByLabelText('Activity name'), 'Review');
    await fireEvent.press(view.getByRole('button', { name: 'Save activity' }));
    expect(application.activityService.update).toHaveBeenCalledWith({ id: 'activity-1', name: 'Review' });

    await fireEvent.press(view.getByLabelText('Archive activity Development'));
    expect(application.activityService.archive).toHaveBeenCalledWith('activity-1');
  });

  it('renders labelled Spanish activities using dark theme and accessible touch targets', async () => {
    const { ActivitiesManagement } = jest.requireActual('../../src/features/activities/activities-management');
    await AsyncStorage.setItem('freelance-ops:language', 'es');
    const view = await render(
      <ThemeProvider systemColorScheme="dark"><I18nProvider>
        <ApplicationContextProvider application={makeApplication() as never}>
          <ActivitiesManagement />
        </ApplicationContextProvider>
      </I18nProvider></ThemeProvider>,
    );
    const input = await view.findByLabelText('Nombre de la actividad');
    expect(view.getByText('Nombre de la actividad')).toBeTruthy();
    expect(input).toHaveStyle({ color: darkTheme.colors.textPrimary, backgroundColor: darkTheme.colors.surface, minHeight: 48 });
    expect(await view.findByText('Development')).toHaveStyle({ color: darkTheme.colors.textPrimary });
    expect(view.getByRole('button', { name: 'Editar actividad Development' })).toHaveStyle({ minHeight: 48 });
    expect(view.getByRole('button', { name: 'Archivar actividad Development' })).toHaveStyle({ minHeight: 48 });
    expect(view.getByRole('button', { name: 'Añadir actividad' })).toBeTruthy();
  });
});
