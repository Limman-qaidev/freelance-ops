import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import MoreScreen from '../../app/(tabs)/more';
import { ApplicationContextProvider } from '../../src/providers/application-context';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

const application = {
  activityService: {
    listActive: jest.fn(async () => []),
  },
};

describe('More time actions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens time history and manual time entry', async () => {
    const view = await render(
      <ApplicationContextProvider application={application as never}>
        <MoreScreen />
      </ApplicationContextProvider>,
    );

    await fireEvent.press(view.getByLabelText('Open time history'));
    expect(router.push).toHaveBeenCalledWith('/time-history');

    await fireEvent.press(view.getByLabelText('Add manual time from More'));
    expect(router.push).toHaveBeenCalledWith('/time-entry/new');
  });
});
