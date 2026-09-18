import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import TabLayout from '../app/(tabs)/_layout';
import TodayScreen from '../app/(tabs)/index';
import MoreScreen from '../app/(tabs)/more';
import PlanningScreen from '../app/(tabs)/planning';
import ProjectsScreen from '../app/(tabs)/projects';
import TasksScreen from '../app/(tabs)/tasks';
import { ApplicationContextProvider } from '../src/providers/application-context';

const shellApplication = {
  workspace: {
    id: 'workspace-shell',
    name: 'Freelance Ops',
    defaultCurrency: 'EUR',
    createdAt: '2026-09-16T00:00:00.000Z',
    updatedAt: '2026-09-16T00:00:00.000Z',
  },
  clientService: {
    getById: jest.fn(async () => null),
  },
  projectService: {
    listActiveProjects: jest.fn(async () => []),
    getById: jest.fn(async () => null),
  },
  taskService: {
    listTasksForProject: jest.fn(async () => []),
  },
  activityService: {},
  timeTrackingService: {
    getActiveSession: jest.fn(async () => null),
    getElapsedDuration: jest.fn(async () => 0),
  },
};

function TodayWithApplication() {
  return (
    <ApplicationContextProvider application={shellApplication as never}>
      <TodayScreen />
    </ApplicationContextProvider>
  );
}

function StartWorkStub() {
  return <Text>Start Work form</Text>;
}

describe('application shell', () => {
  const routes = {
    '(tabs)/_layout': TabLayout,
    '(tabs)/index': TodayWithApplication,
    '(tabs)/projects': ProjectsScreen,
    '(tabs)/tasks': TasksScreen,
    '(tabs)/planning': PlanningScreen,
    '(tabs)/more': MoreScreen,
    '(tabs)/start-work': StartWorkStub,
  };

  it('renders Today and all five primary bottom destinations', async () => {
    await renderRouter(routes, { initialUrl: '/' });

    expect(screen.getByText('Active projects')).toBeTruthy();
    expect(screen.getAllByText('Today').length).toBeGreaterThan(0);
    expect(screen.getByText('Projects')).toBeTruthy();
    expect(screen.getByText('Tasks')).toBeTruthy();
    expect(screen.getByText('Planning')).toBeTruthy();
    expect(screen.getByText('More')).toBeTruthy();
  });

  it('keeps the bottom tab shell visible on the hidden Start Work route', async () => {
    await renderRouter(routes, { initialUrl: '/start-work' });

    expect(screen.getByText('Start Work form')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('Projects')).toBeTruthy();
    expect(screen.getByText('Tasks')).toBeTruthy();
    expect(screen.getByText('Planning')).toBeTruthy();
    expect(screen.getByText('More')).toBeTruthy();
  });
});
