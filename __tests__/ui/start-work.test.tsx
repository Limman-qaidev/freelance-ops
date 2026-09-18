import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ComponentType } from 'react';

import { I18nProvider } from '../../src/i18n/i18n-provider';
import { ApplicationContextProvider } from '../../src/providers/application-context';
import { ThemeProvider } from '../../src/ui/theme/theme-provider';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'es' }] }));

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    back: jest.fn(),
  },
  useLocalSearchParams: () => ({ projectId: 'project-active' }),
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

const activeProject = {
  id: 'project-active',
  clientId: client.id,
  name: 'Mailing tool',
  description: null,
  status: 'ACTIVE',
  plannedStartDate: null,
  plannedEndDate: null,
  actualStartDate: '2026-09-15',
  actualEndDate: null,
  projectCurrency: 'EUR',
  archivedAt: null,
  createdAt: '2026-09-15T00:00:00.000Z',
  updatedAt: '2026-09-15T00:00:00.000Z',
};

const plannedProject = {
  ...activeProject,
  id: 'project-planned',
  name: 'Spare parts',
  status: 'PLANNED',
  actualStartDate: null,
};

const onHoldProject = {
  ...activeProject,
  id: 'project-hold',
  name: 'Paused engagement',
  status: 'ON_HOLD',
};

const activeTask = {
  id: 'task-active',
  projectId: activeProject.id,
  name: 'SMTP integration',
  description: null,
  status: 'IN_PROGRESS',
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

const plannedTask = {
  ...activeTask,
  id: 'task-planned',
  projectId: plannedProject.id,
  name: 'Catalogue parser',
  status: 'PENDING',
};

const completedTask = {
  ...plannedTask,
  id: 'task-completed',
  name: 'Finished task',
  status: 'COMPLETED',
};

const activity = {
  id: 'activity-1',
  workspaceId: 'workspace-1',
  name: 'Development',
  archivedAt: null,
  createdAt: '2026-09-16T00:00:00.000Z',
};

const runningSession = {
  state: 'RUNNING',
  timeEntry: {
    id: 'entry-1',
    projectId: activeProject.id,
    taskId: null,
    activityId: null,
    description: null,
    billable: true,
    source: 'TIMER',
    stoppedAtUtc: null,
    createdAt: '2026-09-16T09:00:00.000Z',
    updatedAt: '2026-09-16T09:00:00.000Z',
  },
  intervals: [],
};

function loadStartWorkScreen(): ComponentType {
  const module = jest.requireActual('../../app/start-work') as {
    default: ComponentType;
  };
  return module.default;
}

function makeApplication(activeSession: typeof runningSession | null = null) {
  return {
    workspace: {
      id: 'workspace-1',
      name: 'Freelance Ops',
      defaultCurrency: 'EUR',
      createdAt: '2026-09-16T00:00:00.000Z',
      updatedAt: '2026-09-16T00:00:00.000Z',
    },
    clientService: {
      getById: jest.fn(async () => client),
    },
    projectService: {
      listActiveProjects: jest.fn(async () => [activeProject, plannedProject, onHoldProject]),
    },
    taskService: {
      listTasksForProject: jest.fn(async (projectId: string) => {
        if (projectId === plannedProject.id) return [plannedTask, completedTask];
        return [activeTask];
      }),
    },
    activityService: {
      listActive: jest.fn(async () => [activity]),
    },
    timeTrackingService: {
      getActiveSession: jest.fn(async () => activeSession),
      startWork: jest.fn(async (input) => ({
        state: 'RUNNING',
        timeEntry: {
          ...runningSession.timeEntry,
          projectId: input.projectId,
          taskId: input.taskId,
          activityId: input.activityId,
          description: input.description,
        },
        intervals: [],
      })),
      stopWork: jest.fn(async () => undefined),
    },
  };
}

describe('Start Work', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts immediately with only the preselected project when no timer is active', async () => {
    const StartWorkScreen = loadStartWorkScreen();
    const application = makeApplication();
    const view = await render(
      <ThemeProvider systemColorScheme="light"><ApplicationContextProvider application={application as never}>
        <StartWorkScreen />
      </ApplicationContextProvider></ThemeProvider>,
    );

    expect(await view.findByText('Mailing tool')).toBeTruthy();
    expect(view.getByText('Task (optional)')).toBeTruthy();
    expect(view.getByText('Activity (optional)')).toBeTruthy();

    await fireEvent.press(view.getByLabelText('Start Work'));

    await waitFor(() =>
      expect(application.timeTrackingService.startWork).toHaveBeenCalledWith({
        projectId: activeProject.id,
        taskId: null,
        activityId: null,
        description: null,
      }),
    );
    expect(application.timeTrackingService.stopWork).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('lets the user change project and optionally select task, activity and description', async () => {
    const StartWorkScreen = loadStartWorkScreen();
    const application = makeApplication();
    const view = await render(
      <ThemeProvider systemColorScheme="light"><ApplicationContextProvider application={application as never}>
        <StartWorkScreen />
      </ApplicationContextProvider></ThemeProvider>,
    );

    await view.findByText('Mailing tool');
    expect(view.queryByText('Paused engagement')).toBeNull();

    await fireEvent.press(view.getByLabelText('Change project'));
    await fireEvent.press(view.getByText('Spare parts')); 
    await fireEvent.press(view.getByLabelText('Task'));
    expect(await view.findByText('Catalogue parser')).toBeTruthy();
    expect(view.queryByText('Finished task')).toBeNull();

    await fireEvent.press(view.getByText('Catalogue parser'));
    await fireEvent.press(view.getByLabelText('Activity'));
    await fireEvent.press(view.getByText('Development'));
    await fireEvent.changeText(
      view.getByLabelText('Description'),
      'Build catalogue parser',
    );
    await fireEvent.press(view.getByLabelText('Start Work'));

    await waitFor(() =>
      expect(application.timeTrackingService.startWork).toHaveBeenCalledWith({
        projectId: plannedProject.id,
        taskId: plannedTask.id,
        activityId: activity.id,
        description: 'Build catalogue parser',
      }),
    );
  });

  it('uses fully localized Spanish copy for optional fields and timer conflict', async () => {
    await AsyncStorage.setItem('freelance-ops:language', 'es');
    const StartWorkScreen = loadStartWorkScreen();
    const application = makeApplication(runningSession);
    const view = await render(
      <ThemeProvider systemColorScheme="dark"><I18nProvider><ApplicationContextProvider application={application as never}>
        <StartWorkScreen />
      </ApplicationContextProvider></I18nProvider></ThemeProvider>,
    );

    expect(await view.findByText('Iniciar trabajo')).toBeTruthy();
    expect(view.getByText('Tarea · opcional')).toBeTruthy();
    expect(view.getByText('Actividad · opcional')).toBeTruthy();
    expect(view.getByText('Descripción · opcional')).toBeTruthy();
    expect(view.getByLabelText('Cambiar proyecto')).toBeTruthy();

    await fireEvent.press(view.getByLabelText('Iniciar trabajo'));
    expect(await view.findByText('Ya hay un temporizador activo')).toBeTruthy();
    expect(view.getByText('Detener actual e iniciar seleccionado')).toBeTruthy();
    expect(view.getByText('Cancelar')).toBeTruthy();
  });

  it('requires an explicit stop-current decision when another timer is active', async () => {
    const StartWorkScreen = loadStartWorkScreen();
    const application = makeApplication(runningSession);
    const view = await render(
      <ThemeProvider systemColorScheme="light"><ApplicationContextProvider application={application as never}>
        <StartWorkScreen />
      </ApplicationContextProvider></ThemeProvider>,
    );

    await view.findByText('Mailing tool');
    await fireEvent.press(view.getByLabelText('Start Work'));

    expect(await view.findByText('Timer already active')).toBeTruthy();
    expect(application.timeTrackingService.startWork).not.toHaveBeenCalled();

    await fireEvent.press(view.getByText('Cancel'));
    await waitFor(() => expect(view.queryByText('Timer already active')).toBeNull());
    expect(application.timeTrackingService.stopWork).not.toHaveBeenCalled();

    await fireEvent.press(view.getByLabelText('Start Work'));
    await view.findByText('Timer already active');
    await fireEvent.press(view.getByText('Stop current & start selected'));

    await waitFor(() => expect(application.timeTrackingService.stopWork).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(application.timeTrackingService.startWork).toHaveBeenCalledTimes(1));
    expect(application.timeTrackingService.stopWork.mock.invocationCallOrder[0]).toBeLessThan(
      application.timeTrackingService.startWork.mock.invocationCallOrder[0],
    );
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});
