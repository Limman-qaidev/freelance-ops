import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import MoreScreen from '../../app/(tabs)/more';
import { I18nProvider } from '../../src/i18n/i18n-provider';
import { ApplicationContextProvider } from '../../src/providers/application-context';
import { ThemeProvider } from '../../src/ui/theme/theme-provider';

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
      <ThemeProvider systemColorScheme="light"><I18nProvider><ApplicationContextProvider application={application as never}>
        <MoreScreen />
      </ApplicationContextProvider></I18nProvider></ThemeProvider>,
    );

    await fireEvent.press(view.getByLabelText('Time history'));
    expect(router.push).toHaveBeenCalledWith('/time-history');

    await fireEvent.press(view.getByLabelText('Add manual time'));
    expect(router.push).toHaveBeenCalledWith('/time-entry/new');
  });
});
