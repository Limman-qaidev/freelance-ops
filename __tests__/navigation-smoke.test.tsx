import { renderRouter, screen } from 'expo-router/testing-library';

import TabLayout from '../app/(tabs)/_layout';
import TodayScreen from '../app/(tabs)/index';
import MoreScreen from '../app/(tabs)/more';
import PlanningScreen from '../app/(tabs)/planning';
import ProjectsScreen from '../app/(tabs)/projects';
import TasksScreen from '../app/(tabs)/tasks';

describe('application shell', () => {
  it('renders Today and all bottom navigation destinations', async () => {
    await renderRouter(
      {
        '(tabs)/_layout': TabLayout,
        '(tabs)/index': TodayScreen,
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
