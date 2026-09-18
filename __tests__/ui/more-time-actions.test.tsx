import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import MoreScreen from '../../app/(tabs)/more';
import { I18nProvider } from '../../src/i18n/i18n-provider';
import { ApplicationContextProvider } from '../../src/providers/application-context';
import { ThemeProvider } from '../../src/ui/theme/theme-provider';
import * as preferences from '../../src/preferences/ui-preferences';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

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
  beforeEach(async () => {
    jest.restoreAllMocks();
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  async function renderMore() {
    return render(
      <ThemeProvider systemColorScheme="light"><I18nProvider>
        <ApplicationContextProvider application={application as never}>
          <MoreScreen />
        </ApplicationContextProvider>
      </I18nProvider></ThemeProvider>,
    );
  }

  it.each(['en', 'es'] as const)('offers explicit persisted language choices in %s', async (language) => {
    await preferences.saveLanguageOverride(language);
    const save = jest.spyOn(preferences, 'saveLanguageOverride');
    const view = await renderMore();
    const row = language === 'en' ? 'Language' : 'Idioma';
    await fireEvent.press(await view.findByLabelText(row));
    expect(save).not.toHaveBeenCalled();
    expect(view.getByRole('radio', { name: language === 'en' ? 'Automatic' : 'Automático' })).toBeTruthy();
    expect(view.getByRole('radio', { name: 'Español' })).toBeTruthy();
    expect(view.getByRole('radio', { name: 'English' })).toBeTruthy();
    expect(view.getByRole('radio', { name: language === 'en' ? 'English' : 'Español', checked: true })).toBeTruthy();

    await fireEvent.press(view.getByRole('radio', { name: 'Español' }));
    await waitFor(() => expect(save).toHaveBeenLastCalledWith('es'));
    expect((await preferences.loadUiPreferences()).language).toBe('es');
    await fireEvent.press(await view.findByLabelText('Idioma'));
    await fireEvent.press(view.getByRole('radio', { name: 'English' }));
    await waitFor(() => expect(save).toHaveBeenLastCalledWith('en'));
    await fireEvent.press(await view.findByLabelText('Language'));
    await fireEvent.press(view.getByRole('radio', { name: 'Automatic' }));
    await waitFor(() => expect(save).toHaveBeenLastCalledWith(null));
    expect((await preferences.loadUiPreferences()).language).toBeNull();
  });

  it.each(['en', 'es'] as const)('offers explicit persisted appearance choices in %s', async (language) => {
    await preferences.saveLanguageOverride(language);
    const save = jest.spyOn(preferences, 'saveThemePreference');
    const view = await renderMore();
    const row = language === 'en' ? 'Appearance' : 'Apariencia';
    const options = language === 'en' ? ['System', 'Light', 'Dark'] : ['Sistema', 'Claro', 'Oscuro'];
    await fireEvent.press(await view.findByLabelText(row));
    expect(save).not.toHaveBeenCalled();
    for (const label of options) expect(view.getByRole('radio', { name: label })).toBeTruthy();
    expect(view.getByRole('radio', { name: options[0], checked: true })).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: language === 'en' ? 'Cancel' : 'Cancelar' }));
    expect(save).not.toHaveBeenCalled();

    for (const [index, value] of [[2, 'dark'], [1, 'light'], [0, 'system']] as const) {
      await fireEvent.press(view.getByLabelText(row));
      await fireEvent.press(view.getByRole('radio', { name: options[index] }));
      await waitFor(() => expect(save).toHaveBeenLastCalledWith(value));
      expect((await preferences.loadUiPreferences()).theme).toBe(value);
    }
  });

  it('keeps the preference chooser open on persistence failure and allows retry', async () => {
    const save = jest.spyOn(preferences, 'saveThemePreference').mockRejectedValueOnce(new Error('storage unavailable'));
    const view = await renderMore();
    await fireEvent.press(view.getByLabelText('Appearance'));
    await fireEvent.press(view.getByRole('radio', { name: 'Dark' }));
    expect(await view.findByRole('alert')).toHaveTextContent('Could not save this preference. Try again.');
    expect(view.getByRole('radio', { name: 'System', checked: true })).toBeTruthy();
    await fireEvent.press(view.getByRole('radio', { name: 'Dark' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(view.queryByRole('radio', { name: 'Dark' })).toBeNull());
  });

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
