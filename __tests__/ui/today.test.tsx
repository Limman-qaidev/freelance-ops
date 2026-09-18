import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import TodayScreen from '../../app/(tabs)/index';
import { ApplicationContextProvider } from '../../src/providers/application-context';
import { ThemeProvider } from '../../src/ui/theme/theme-provider';

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

const activeProject = {
  id: 'project-active',
  clientId: client.id,
  name: 'Mailing tool',
  description: null,
  status: 'ACTIVE',
  plannedStartDate: null,
  plannedEndDate: '2026-10-01',
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

const completedProject = {
  ...activeProject,
  id: 'project-completed',
  name: 'Finished engagement',
  status: 'COMPLETED',
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
  intervals: [
    {
      id: 'interval-1',
      timeEntryId: 'entry-1',
      startedAtUtc: '2026-09-16T09:00:00.000Z',
      endedAtUtc: null,
      timezoneId: 'Europe/Madrid',
      createdAt: '2026-09-16T09:00:00.000Z',
    },
  ],
};

function makeApplication(activeSession: typeof runningSession | null = null) {
  const pausedSession = {
    ...runningSession,
    state: 'PAUSED',
    intervals: [
      {
        ...runningSession.intervals[0],
        endedAtUtc: '2026-09-16T09:01:30.000Z',
      },
    ],
  };

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
      listActiveProjects: jest.fn(async () => [
        activeProject,
        plannedProject,
        onHoldProject,
        completedProject,
      ]),
      getById: jest.fn(async (id: string) =>
        [activeProject, plannedProject, onHoldProject, completedProject].find(
          (project) => project.id === id,
        ) ?? null,
      ),
    },
    taskService: {},
    activityService: {},
    timeTrackingService: {
      getActiveSession: jest.fn(async () => activeSession),
      getElapsedDuration: jest.fn(async () => (activeSession ? 90_000 : 0)),
      pauseWork: jest.fn(async () => pausedSession),
      resumeWork: jest.fn(async () => runningSession),
      stopWork: jest.fn(async () => undefined),
    },
  };
}

describe('Today', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists trackable projects and exposes work and expense quick actions', async () => {
    const application = makeApplication();
    const view = await render(
      <ThemeProvider systemColorScheme="light"><ApplicationContextProvider application={application as never}>
        <TodayScreen />
      </ApplicationContextProvider></ThemeProvider>,
    );

    expect(await view.findByText('Mailing tool')).toBeTruthy();
    expect(view.getByText('Spare parts')).toBeTruthy();
    expect(view.queryByText('Paused engagement')).toBeNull();
    expect(view.queryByText('Finished engagement')).toBeNull();
    expect(view.getAllByText('Maubank').length).toBeGreaterThan(0);

    await fireEvent.press(view.getByLabelText('Start work on Mailing tool'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/start-work',
      params: { projectId: activeProject.id },
    });


    await fireEvent.press(view.getByLabelText('Add expense'));
    expect(router.push).toHaveBeenCalledWith('/expense/edit');
  });

  it('recovers the persisted active session and exposes pause, resume and stop controls', async () => {
    const application = makeApplication(runningSession);
    const view = await render(
      <ThemeProvider systemColorScheme="light"><ApplicationContextProvider application={application as never}>
        <TodayScreen />
      </ApplicationContextProvider></ThemeProvider>,
    );

    expect(await view.findByText('Running')).toBeTruthy();
    expect(view.getByText('00:01:30')).toBeTruthy();
    expect(view.getByText('Pause')).toBeTruthy();
    expect(view.getByText('Stop')).toBeTruthy();

    await fireEvent.press(view.getByText('Pause'));
    await waitFor(() => expect(application.timeTrackingService.pauseWork).toHaveBeenCalledTimes(1));
    expect(await view.findByText('Resume')).toBeTruthy();

    await fireEvent.press(view.getByText('Resume'));
    await waitFor(() => expect(application.timeTrackingService.resumeWork).toHaveBeenCalledTimes(1));
    expect(await view.findByText('Pause')).toBeTruthy();

    await fireEvent.press(view.getByText('Stop'));
    await waitFor(() => expect(application.timeTrackingService.stopWork).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(view.queryByText('Active session')).toBeNull());
  });
});
