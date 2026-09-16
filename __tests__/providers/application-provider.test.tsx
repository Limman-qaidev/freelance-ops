import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

const mockDatabase = { id: 'raw-sqlite-handle' };
const mockDataDatabase = { id: 'data-database' };
const mockApplication = {
  workspace: { id: 'workspace-1', name: 'Freelance Ops', defaultCurrency: 'EUR' },
  clientService: {},
  projectService: {},
  taskService: {},
  activityService: {},
};
const mockCreateCoreApplication = jest.fn(
  async (_database: unknown, _options: unknown) => mockApplication,
);

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDatabase,
}));

jest.mock('../../src/infrastructure/database/expo-data-database', () => ({
  createExpoDataDatabase: () => mockDataDatabase,
}));

jest.mock('../../src/infrastructure/application/create-core-application', () => ({
  createCoreApplication: (database: unknown, options: unknown) =>
    mockCreateCoreApplication(database, options),
}));

describe('ApplicationProvider', () => {
  beforeEach(() => {
    mockCreateCoreApplication.mockClear();
    mockCreateCoreApplication.mockResolvedValue(mockApplication);
  });

  it('initializes the core application and then exposes children', async () => {
    const { ApplicationProvider } = jest.requireActual(
      '../../src/providers/application-provider',
    ) as { ApplicationProvider: any };
    const { useApplication } = jest.requireActual(
      '../../src/providers/application-context',
    ) as { useApplication: () => any };

    function Consumer() {
      const application = useApplication();
      return <Text>{application.workspace.name}</Text>;
    }

    const view = await render(
      <ApplicationProvider>
        <Consumer />
      </ApplicationProvider>,
    );

    expect(view.getByText('Preparing your workspace…')).toBeTruthy();
    expect(await view.findByText('Freelance Ops')).toBeTruthy();
    expect(mockCreateCoreApplication).toHaveBeenCalledWith(mockDataDatabase, {
      workspaceName: 'Freelance Ops',
      defaultCurrency: 'EUR',
    });
  });

  it('renders a deterministic initialization error instead of children', async () => {
    mockCreateCoreApplication.mockRejectedValueOnce(new Error('Synthetic failure'));
    const { ApplicationProvider } = jest.requireActual(
      '../../src/providers/application-provider',
    ) as { ApplicationProvider: any };

    const view = await render(
      <ApplicationProvider>
        <Text>Should not render</Text>
      </ApplicationProvider>,
    );

    expect(await view.findByText('Unable to prepare local workspace.')).toBeTruthy();
    expect(view.queryByText('Should not render')).toBeNull();
  });
});
