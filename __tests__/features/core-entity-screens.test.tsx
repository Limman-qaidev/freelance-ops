import { fireEvent, render } from '@testing-library/react-native';

import { ApplicationContextProvider } from '../../src/providers/application-context';

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
  it('manages clients and projects through application services', async () => {
    const { ProjectsManagementScreen } = jest.requireActual(
      '../../src/features/projects/projects-management-screen',
    ) as { ProjectsManagementScreen: React.ComponentType };
    const application = makeApplication();
    const view = await render(
      <ApplicationContextProvider application={application as never}>
        <ProjectsManagementScreen />
      </ApplicationContextProvider>,
    );

    expect(await view.findByText('Maubank')).toBeTruthy();
    expect(view.getByText('Mailing tool')).toBeTruthy();

    fireEvent.changeText(view.getByPlaceholderText('Client name'), 'Nissan');
    fireEvent.press(view.getByText('Add client'));
    expect(application.clientService.create).toHaveBeenCalledWith({
      name: 'Nissan',
      legalName: null,
      notes: null,
    });

    fireEvent.press(view.getByLabelText('Archive client Maubank'));
    expect(application.clientService.archive).toHaveBeenCalledWith('client-1');

    fireEvent.changeText(view.getByPlaceholderText('Project name'), 'Spare parts');
    fireEvent.press(view.getByText('Add project'));
    expect(application.projectService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-1',
        name: 'Spare parts',
        projectCurrency: 'EUR',
      }),
    );

    fireEvent.press(view.getByLabelText('Archive project Mailing tool'));
    expect(application.projectService.archive).toHaveBeenCalledWith('project-1');
  });

  it('manages project tasks through application services', async () => {
    const { TasksManagementScreen } = jest.requireActual(
      '../../src/features/tasks/tasks-management-screen',
    ) as { TasksManagementScreen: React.ComponentType };
    const application = makeApplication();
    const view = await render(
      <ApplicationContextProvider application={application as never}>
        <TasksManagementScreen />
      </ApplicationContextProvider>,
    );

    expect(await view.findByText('SMTP integration')).toBeTruthy();
    fireEvent.changeText(view.getByPlaceholderText('Task name'), 'Catalogue parser');
    fireEvent.changeText(view.getByPlaceholderText('Estimated minutes'), '90');
    fireEvent.press(view.getByText('Add task'));

    expect(application.taskService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        name: 'Catalogue parser',
        estimatedMinutes: 90,
      }),
    );

    fireEvent.press(view.getByLabelText('Archive task SMTP integration'));
    expect(application.taskService.archive).toHaveBeenCalledWith('task-1');
  });

  it('manages configurable activities through application services', async () => {
    const { ActivitiesManagement } = jest.requireActual(
      '../../src/features/activities/activities-management',
    ) as { ActivitiesManagement: React.ComponentType };
    const application = makeApplication();
    const view = await render(
      <ApplicationContextProvider application={application as never}>
        <ActivitiesManagement />
      </ApplicationContextProvider>,
    );

    expect(await view.findByText('Development')).toBeTruthy();
    fireEvent.changeText(view.getByPlaceholderText('Activity name'), 'Research');
    fireEvent.press(view.getByText('Add activity'));
    expect(application.activityService.create).toHaveBeenCalledWith({ name: 'Research' });

    fireEvent.press(view.getByLabelText('Archive activity Development'));
    expect(application.activityService.archive).toHaveBeenCalledWith('activity-1');
  });
});
