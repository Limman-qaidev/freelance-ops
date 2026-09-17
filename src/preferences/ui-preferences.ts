import AsyncStorage from '@react-native-async-storage/async-storage';

export type SupportedLanguage = 'es' | 'en';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface UiPreferences {
  language: SupportedLanguage | null;
  theme: ThemePreference;
}

const LANGUAGE_KEY = 'freelance-ops:language';
const THEME_KEY = 'freelance-ops:theme';

function isSupportedLanguage(value: string | null): value is SupportedLanguage {
  return value === 'es' || value === 'en';
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export async function loadUiPreferences(): Promise<UiPreferences> {
  const [language, theme] = await Promise.all([
    AsyncStorage.getItem(LANGUAGE_KEY),
    AsyncStorage.getItem(THEME_KEY),
  ]);

  return {
    language: isSupportedLanguage(language) ? language : null,
    theme: isThemePreference(theme) ? theme : 'system',
  };
}

export async function saveLanguageOverride(language: SupportedLanguage | null): Promise<void> {
  if (language === null) {
    await AsyncStorage.removeItem(LANGUAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(LANGUAGE_KEY, language);
}

export async function saveThemePreference(theme: ThemePreference): Promise<void> {
  await AsyncStorage.setItem(THEME_KEY, theme);
}
