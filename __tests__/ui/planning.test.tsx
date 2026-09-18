import AsyncStorage from '@react-native-async-storage/async-storage';
import { render } from '@testing-library/react-native';

import PlanningScreen from '../../app/(tabs)/planning';
import { I18nProvider } from '../../src/i18n/i18n-provider';
import { ApplicationContextProvider } from '../../src/providers/application-context';
import { ThemeProvider } from '../../src/ui/theme/theme-provider';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'es' }] }));

const project = {
  id: 'project-1',
  clientId: 'client-1',
  name: 'Mailing tool',
  description: null,
  status: 'ACTIVE',
  plannedStartDate: '2026-09-18',
  plannedEndDate: '2026-09-22',
  actualStartDate: null,
  actualEndDate: null,
  projectCurrency: 'EUR',
  archivedAt: null,
  createdAt: '2026-09-18T00:00:00.000Z',
  updatedAt: '2026-09-18T00:00:00.000Z',
};

const task = {
  id: 'task-1',
  projectId: project.id,
  name: 'SMTP integration',
  description: null,
  status: 'IN_PROGRESS',
  priority: null,
  estimatedMinutes: 120,
  plannedStartDate: '2026-09-19',
  plannedEndDate: '2026-09-20',
  actualStartDate: null,
  actualEndDate: null,
  archivedAt: null,
  createdAt: '2026-09-18T00:00:00.000Z',
  updatedAt: '2026-09-18T00:00:00.000Z',
};

describe('Planning', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem('freelance-ops:language', 'es');
  });

  it('localizes timeline metadata, project marker and status labels', async () => {
    const application = {
      projectService: { listActiveProjects: jest.fn(async () => [project]) },
      taskService: { listTasksForProject: jest.fn(async () => [task]) },
    };
    const view = await render(
      <ThemeProvider systemColorScheme="dark"><I18nProvider><ApplicationContextProvider application={application as never}>
        <PlanningScreen />
      </ApplicationContextProvider></I18nProvider></ThemeProvider>,
    );

    expect(await view.findByText('Planificación')).toBeTruthy();
    expect(await view.findByText('2 elementos planificados')).toBeTruthy();
    expect(view.getByText('Proyecto')).toBeTruthy();
    expect(view.getByText('Activo')).toBeTruthy();
    expect(view.getByText('En curso')).toBeTruthy();
  });
});
