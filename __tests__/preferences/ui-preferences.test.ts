import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  loadUiPreferences,
  saveLanguageOverride,
  saveThemePreference,
} from '../../src/preferences/ui-preferences';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const LANGUAGE_KEY = 'freelance-ops:language';
const THEME_KEY = 'freelance-ops:theme';

describe('UI preferences', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('uses automatic language and system theme when nothing is persisted', async () => {
    await expect(loadUiPreferences()).resolves.toEqual({
      language: null,
      theme: 'system',
    });
  });

  it.each(['es', 'en'] as const)('persists the %s language override', async (language) => {
    await saveLanguageOverride(language);

    await expect(loadUiPreferences()).resolves.toEqual({
      language,
      theme: 'system',
    });
    await expect(AsyncStorage.getItem(LANGUAGE_KEY)).resolves.toBe(language);
  });

  it('clears the language override and returns to automatic language', async () => {
    await saveLanguageOverride('en');
    await saveLanguageOverride(null);

    await expect(loadUiPreferences()).resolves.toEqual({
      language: null,
      theme: 'system',
    });
    await expect(AsyncStorage.getItem(LANGUAGE_KEY)).resolves.toBeNull();
  });

  it.each(['system', 'light', 'dark'] as const)('persists the %s theme preference', async (theme) => {
    await saveThemePreference(theme);

    await expect(loadUiPreferences()).resolves.toEqual({
      language: null,
      theme,
    });
    await expect(AsyncStorage.getItem(THEME_KEY)).resolves.toBe(theme);
  });

  it('falls back safely when persisted values are invalid', async () => {
    await AsyncStorage.multiSet([
      [LANGUAGE_KEY, 'fr'],
      [THEME_KEY, 'amoled'],
    ]);

    await expect(loadUiPreferences()).resolves.toEqual({
      language: null,
      theme: 'system',
    });
  });
});
