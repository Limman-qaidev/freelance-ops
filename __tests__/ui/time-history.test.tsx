import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import TimeHistoryScreen from '../../app/time-history';
import { I18nProvider } from '../../src/i18n/i18n-provider';
import { ApplicationContextProvider } from '../../src/providers/application-context';
import { darkTheme } from '../../src/ui/theme/theme';
import { ThemeProvider } from '../../src/ui/theme/theme-provider';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'es' }] }));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
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

const record = {
  timeEntry: {
    id: 'entry-1',
    projectId: project.id,
    taskId: null,
    activityId: null,
    description: 'Build parser',
    billable: true,
    source: 'MANUAL',
    stoppedAtUtc: '2026-09-16T08:30:00.000Z',
    createdAt: '2026-09-16T09:00:00.000Z',
    updatedAt: '2026-09-16T09:00:00.000Z',
  },
  intervals: [
    {
      id: 'interval-1',
      timeEntryId: 'entry-1',
      startedAtUtc: '2026-09-16T07:00:00.000Z',
      endedAtUtc: '2026-09-16T08:30:00.000Z',
      timezoneId: 'Europe/Madrid',
      createdAt: '2026-09-16T09:00:00.000Z',
    },
  ],
  durationMs: 90 * 60 * 1000,
  localWorkDate: '2026-09-16',
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
    projectService: {
      getById: jest.fn(async () => project),
    },
    manualTimeService: {
      listRecentGrouped: jest.fn(async () => [
        { localWorkDate: '2026-09-16', entries: [record] },
      ]),
    },
  };
}

describe('Time history', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem('freelance-ops:language', 'es');
    jest.clearAllMocks();
  });

  it('uses the current theme and language while preserving create/edit navigation', async () => {
    const application = makeApplication();
    const view = await render(
      <ThemeProvider systemColorScheme="dark">
        <I18nProvider>
          <ApplicationContextProvider application={application as never}>
            <TimeHistoryScreen />
          </ApplicationContextProvider>
        </I18nProvider>
      </ThemeProvider>,
    );

    expect(await view.findByText('Historial de tiempo')).toBeTruthy();
    expect(await view.findByText('Mailing tool')).toBeTruthy();
    expect(view.getByText('Build parser')).toBeTruthy();
    expect(view.getByText('1 h 30 min')).toBeTruthy();
    expect(view.getByText('Manual')).toBeTruthy();

    const entry = view.getByLabelText('Editar registro de tiempo Build parser');
    expect(entry).toHaveStyle({ backgroundColor: darkTheme.colors.surface });

    await fireEvent.press(view.getByLabelText('Añadir tiempo manual'));
    expect(router.push).toHaveBeenCalledWith('/time-entry/new');

    await fireEvent.press(entry);
    expect(router.push).toHaveBeenCalledWith('/time-entry/entry-1');

    await waitFor(() => expect(application.manualTimeService.listRecentGrouped).toHaveBeenCalled());
  });
});
