import type { ReactNode } from 'react';

import { I18nContext, type I18nContextValue } from '../../src/i18n/i18n-provider';
import { translations } from '../../src/i18n/translations';
import type { SupportedLanguage } from '../../src/preferences/ui-preferences';
import {
  ThemeContext,
  type ThemeContextValue,
} from '../../src/ui/theme/theme-provider';
import { darkTheme, lightTheme, type ResolvedThemeMode } from '../../src/ui/theme/theme';

type UiTestProvidersProps = {
  children: ReactNode;
  language?: SupportedLanguage;
  themeMode?: ResolvedThemeMode;
};

export function UiTestProviders({
  children,
  language = 'en',
  themeMode = 'light',
}: UiTestProvidersProps) {
  const i18nValue: I18nContextValue = {
    language,
    languageOverride: language,
    setLanguage: async () => undefined,
    t: (key) => translations[language][key],
  };
  const themeValue: ThemeContextValue = {
    preference: themeMode,
    resolved: themeMode,
    theme: themeMode === 'dark' ? darkTheme : lightTheme,
    setThemePreference: async () => undefined,
  };

  return (
    <ThemeContext.Provider value={themeValue}>
      <I18nContext.Provider value={i18nValue}>{children}</I18nContext.Provider>
    </ThemeContext.Provider>
  );
}
