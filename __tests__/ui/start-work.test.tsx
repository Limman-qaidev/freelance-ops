import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ComponentType } from 'react';

import { ApplicationContextProvider } from '../../src/providers/application-context';

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
  description: 'Internal email automation tool',
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
  const module = jest.requireActual('../../app/(tabs)/start-work') as {
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
      listTasksForProject: jest.fn(async () => [activeTask]),
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

describe('Start Work canonical composition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps project fixed and starts with optional enrichment empty', async () => {
    const StartWorkScreen = loadStartWorkScreen();
    const application = makeApplication();
    const view = await render(
      <ApplicationContextProvider application={application as never}>
        <StartWorkScreen />
      </ApplicationContextProvider>,
    );

    expect(await view.findByText('Mailing tool')).toBeTruthy();
    expect(view.getByText('Maubank')).toBeTruthy();
    expect(view.getByText('Task (optional)')).toBeTruthy();
    expect(view.getByText('Activity (optional)')).toBeTruthy();
    expect(view.queryByText('Change project')).toBeNull();

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

  it('uses labelled selector fields for optional task and activity', async () => {
    const StartWorkScreen = loadStartWorkScreen();
    const application = makeApplication();
    const view = await render(
      <ApplicationContextProvider application={application as never}>
        <StartWorkScreen />
      </ApplicationContextProvider>,
    );

    await view.findByText('Mailing tool');

    await fireEvent.press(view.getByLabelText('Task, optional'));
    await fireEvent.press(view.getByLabelText('Select task SMTP integration'));

    await fireEvent.press(view.getByLabelText('Activity, optional'));
    await fireEvent.press(view.getByLabelText('Select activity Development'));

    await fireEvent.changeText(
      view.getByPlaceholderText('What are you working on?'),
      'Build SMTP integration',
    );
    await fireEvent.press(view.getByLabelText('Start Work'));

    await waitFor(() =>
      expect(application.timeTrackingService.startWork).toHaveBeenCalledWith({
        projectId: activeProject.id,
        taskId: activeTask.id,
        activityId: activity.id,
        description: 'Build SMTP integration',
      }),
    );
  });

  it('requires an explicit stop-current decision when another timer is active', async () => {
    const StartWorkScreen = loadStartWorkScreen();
    const application = makeApplication(runningSession);
    const view = await render(
      <ApplicationContextProvider application={application as never}>
        <StartWorkScreen />
      </ApplicationContextProvider>,
    );

    await view.findByText('Mailing tool');
    await fireEvent.press(view.getByLabelText('Start Work'));

    expect(await view.findByText('Timer already active')).toBeTruthy();
    expect(application.timeTrackingService.startWork).not.toHaveBeenCalled();

    await fireEvent.press(view.getByText('Cancel'));
    await waitFor(() => expect(view.queryByText('Timer already active')).toBeNull());

    await fireEvent.press(view.getByLabelText('Start Work'));
    await view.findByText('Timer already active');
    await fireEvent.press(view.getByText('Stop current & start selected'));

    await waitFor(() => expect(application.timeTrackingService.stopWork).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(application.timeTrackingService.startWork).toHaveBeenCalledTimes(1));
    expect(application.timeTrackingService.stopWork.mock.invocationCallOrder[0]).toBeLessThan(
      application.timeTrackingService.startWork.mock.invocationCallOrder[0],
    );
  });
});
