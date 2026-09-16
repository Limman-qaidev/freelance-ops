import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

describe('application context', () => {
  it('exposes core services to UI without exposing a database handle', () => {
    const {
      ApplicationContextProvider,
      useApplication,
    } = jest.requireActual('../../src/providers/application-context') as {
      ApplicationContextProvider: any;
      useApplication: () => any;
    };

    const application = {
      workspace: { id: 'workspace-1', name: 'Freelance Ops' },
      clientService: { listActive: jest.fn() },
      projectService: { listActiveProjects: jest.fn() },
      taskService: { listTasksForProject: jest.fn() },
      activityService: { listActive: jest.fn() },
    };

    function Consumer() {
      const current = useApplication();
      return (
        <Text>
          {current.workspace.name}:{current.projectService ? 'services' : 'missing'}:
          {'database' in current ? 'leaked' : 'isolated'}
        </Text>
      );
    }

    render(
      <ApplicationContextProvider application={application}>
        <Consumer />
      </ApplicationContextProvider>,
    );

    expect(screen.getByText('Freelance Ops:services:isolated')).toBeTruthy();
  });
});
