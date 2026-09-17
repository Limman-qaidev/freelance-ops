import { renderRouter, screen } from 'expo-router/testing-library';

import TabLayout from '../app/(tabs)/_layout';
import TodayScreen from '../app/(tabs)/index';
import MoreScreen from '../app/(tabs)/more';
import PlanningScreen from '../app/(tabs)/planning';
import ProjectsScreen from '../app/(tabs)/projects';
import TasksScreen from '../app/(tabs)/tasks';
import { UiTestProviders } from './helpers/ui-test-providers';
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
  taskService: {},
  activityService: {},
  timeTrackingService: {
    getActiveSession: jest.fn(async () => null),
    getElapsedDuration: jest.fn(async () => 0),
  },
};

function AppTabLayout() {
  return (
    <UiTestProviders language="en" themeMode="light">
      <TabLayout />
    </UiTestProviders>
  );
}

function TodayWithApplication() {
  return (
    <UiTestProviders language="en" themeMode="light">
      <ApplicationContextProvider application={shellApplication as never}>
        <TodayScreen />
      </ApplicationContextProvider>
    </UiTestProviders>
  );
}

describe('application shell', () => {
  it('renders Today and all five localized bottom navigation destinations', async () => {
    await renderRouter(
      {
        '(tabs)/_layout': AppTabLayout,
        '(tabs)/index': TodayWithApplication,
        '(tabs)/projects': ProjectsScreen,
        '(tabs)/tasks': TasksScreen,
        '(tabs)/planning': PlanningScreen,
        '(tabs)/more': MoreScreen,
      },
      { initialUrl: '/' },
    );

    expect(screen.getByText('Active projects')).toBeTruthy();
    expect(screen.getAllByText('Today').length).toBeGreaterThan(0);
    expect(screen.getByText('Projects')).toBeTruthy();
    expect(screen.getByText('Tasks')).toBeTruthy();
    expect(screen.getByText('Planning')).toBeTruthy();
    expect(screen.getByText('More')).toBeTruthy();
  });
});
