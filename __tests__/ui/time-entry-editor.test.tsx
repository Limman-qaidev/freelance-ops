import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ApplicationContextProvider } from '../../src/providers/application-context';

let mockEntryId = 'new';

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    back: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: mockEntryId }),
}));

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

const archivedProject = { ...project, archivedAt: '2026-09-17T00:00:00.000Z' };

const task = {
  id: 'task-1',
  projectId: project.id,
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

const archivedTask = { ...task, archivedAt: '2026-09-17T00:00:00.000Z' };

const activity = {
  id: 'activity-1',
  workspaceId: 'workspace-1',
  name: 'Development',
  archivedAt: null,
  createdAt: '2026-09-16T00:00:00.000Z',
};

const archivedActivity = { ...activity, archivedAt: '2026-09-17T00:00:00.000Z' };

const baseRecord = {
  timeEntry: {
    id: 'entry-1',
    projectId: project.id,
    taskId: task.id,
    activityId: activity.id,
    description: 'Original description',
    billable: true,
    source: 'TIMER',
    stoppedAtUtc: '2026-09-16T08:00:00.000Z',
    createdAt: '2026-09-16T07:00:00.000Z',
    updatedAt: '2026-09-16T08:00:00.000Z',
  },
  intervals: [
    {
      id: 'interval-1',
      timeEntryId: 'entry-1',
      startedAtUtc: '2026-09-16T07:00:00.000Z',
      endedAtUtc: '2026-09-16T08:00:00.000Z',
      timezoneId: 'Europe/Madrid',
      createdAt: '2026-09-16T07:00:00.000Z',
    },
  ],
  durationMs: 60 * 60 * 1000,
  localWorkDate: '2026-09-16',
};

function loadEditor() {
  return (jest.requireActual('../../app/time-entry/[id]') as { default: React.ComponentType }).default;
}

function makeApplication(record = baseRecord) {
  return {
    workspace: {
      id: 'workspace-1',
      name: 'Freelance Ops',
      defaultCurrency: 'EUR',
      createdAt: '2026-09-16T00:00:00.000Z',
      updatedAt: '2026-09-16T00:00:00.000Z',
    },
    projectService: {
      listActiveProjects: jest.fn(async () => (mockEntryId === 'new' ? [project] : [])),
      getById: jest.fn(async () => (mockEntryId === 'new' ? project : archivedProject)),
    },
    taskService: {
      listTasksForProject: jest.fn(async () => (mockEntryId === 'new' ? [task] : [])),
      getById: jest.fn(async () => archivedTask),
    },
    activityService: {
      listActive: jest.fn(async () => (mockEntryId === 'new' ? [activity] : [])),
      getById: jest.fn(async () => archivedActivity),
    },
    manualTimeService: {
      create: jest.fn(async () => ({ record: baseRecord, warnings: ['OVERLAP'] })),
      getById: jest.fn(async () => record),
      update: jest.fn(async () => ({ record, warnings: [] })),
      delete: jest.fn(async () => undefined),
    },
  };
}

describe('time entry editor', () => {
  beforeEach(() => {
    mockEntryId = 'new';
    jest.clearAllMocks();
  });

  it('creates manual time from a local start plus duration and surfaces overlap warnings', async () => {
    const TimeEntryEditor = loadEditor();
    const application = makeApplication();
    const view = await render(
      <ApplicationContextProvider application={application as never}>
        <TimeEntryEditor />
      </ApplicationContextProvider>,
    );

    expect(await view.findByText('Mailing tool')).toBeTruthy();
    await fireEvent.press(view.getByLabelText('Select task SMTP integration'));
    await fireEvent.press(view.getByLabelText('Select activity Development'));
    await fireEvent.changeText(view.getByLabelText('Work date'), '2026-09-16');
    await fireEvent.changeText(view.getByLabelText('Start time'), '09:00');
    await fireEvent.changeText(view.getByLabelText('Duration minutes'), '60');
    await fireEvent.changeText(view.getByLabelText('Timezone'), 'Europe/London');
    await fireEvent.changeText(view.getByLabelText('Description'), 'Manual repair');
    await fireEvent.press(view.getByLabelText('Save time entry'));

    await waitFor(() => expect(application.manualTimeService.create).toHaveBeenCalledTimes(1));
    expect(application.manualTimeService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: project.id,
        taskId: task.id,
        activityId: activity.id,
        description: 'Manual repair',
        timezoneId: 'Europe/London',
        timing: expect.objectContaining({ kind: 'DURATION', durationMinutes: 60 }),
      }),
    );
    expect(await view.findByText(/overlaps existing recorded time/i)).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
    expect(view.queryByLabelText('Save time entry')).toBeNull();
  });

  it('loads archived master-data references, edits a single-interval record and deletes it explicitly', async () => {
    mockEntryId = 'entry-1';
    const TimeEntryEditor = loadEditor();
    const application = makeApplication();
    const view = await render(
      <ApplicationContextProvider application={application as never}>
        <TimeEntryEditor />
      </ApplicationContextProvider>,
    );

    expect(await view.findByText('Mailing tool')).toBeTruthy();
    expect(await view.findByText('SMTP integration')).toBeTruthy();
    expect(await view.findByText('Development')).toBeTruthy();

    await fireEvent.changeText(view.getByLabelText('Description'), 'Corrected metadata');
    await fireEvent.press(view.getByLabelText('Save time entry'));

    await waitFor(() => expect(application.manualTimeService.update).toHaveBeenCalledTimes(1));
    expect(application.manualTimeService.update).toHaveBeenCalledWith(
      'entry-1',
      expect.objectContaining({
        projectId: project.id,
        taskId: task.id,
        activityId: activity.id,
        description: 'Corrected metadata',
        timing: expect.objectContaining({
          timezoneId: 'Europe/Madrid',
        }),
      }),
    );
    expect(router.replace).toHaveBeenCalledWith('/time-history');

    await fireEvent.press(view.getByLabelText('Delete time entry'));
    expect(await view.findByText('Delete this time entry?')).toBeTruthy();
    await fireEvent.press(view.getByLabelText('Confirm delete time entry'));
    await waitFor(() => expect(application.manualTimeService.delete).toHaveBeenCalledWith('entry-1'));
  });

  it('keeps timing locked for sessions that contain pauses while allowing metadata edits', async () => {
    mockEntryId = 'entry-1';
    const pausedRecord = {
      ...baseRecord,
      intervals: [
        {
          ...baseRecord.intervals[0],
          endedAtUtc: '2026-09-16T07:30:00.000Z',
        },
        {
          ...baseRecord.intervals[0],
          id: 'interval-2',
          startedAtUtc: '2026-09-16T07:45:00.000Z',
          endedAtUtc: '2026-09-16T08:00:00.000Z',
        },
      ],
      durationMs: 45 * 60 * 1000,
    };
    const TimeEntryEditor = loadEditor();
    const application = makeApplication(pausedRecord);
    const view = await render(
      <ApplicationContextProvider application={application as never}>
        <TimeEntryEditor />
      </ApplicationContextProvider>,
    );

    expect(await view.findByText(/timing is locked because this session contains pauses/i)).toBeTruthy();
    expect(view.queryByLabelText('Work date')).toBeNull();
    expect(view.queryByLabelText('Timezone')).toBeNull();
    await fireEvent.changeText(view.getByLabelText('Description'), 'Keep pause structure');
    await fireEvent.press(view.getByLabelText('Save time entry'));

    await waitFor(() => expect(application.manualTimeService.update).toHaveBeenCalledTimes(1));
    expect(application.manualTimeService.update).toHaveBeenCalledWith('entry-1', {
      projectId: project.id,
      taskId: task.id,
      activityId: activity.id,
      description: 'Keep pause structure',
      billable: true,
    });
  });
});
