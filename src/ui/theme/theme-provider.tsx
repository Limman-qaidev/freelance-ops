import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { type ColorSchemeName, useColorScheme } from 'react-native';

import {
  loadUiPreferences,
  saveThemePreference,
  type ThemePreference,
} from '@/preferences/ui-preferences';
import {
  darkTheme,
  lightTheme,
  resolveThemeMode,
  type AppTheme,
  type ResolvedThemeMode,
} from '@/ui/theme/theme';

export type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedThemeMode;
  theme: AppTheme;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
  systemColorScheme?: ColorSchemeName;
};

export function ThemeProvider({ children, systemColorScheme }: ThemeProviderProps) {
  const detectedColorScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    let active = true;

    void loadUiPreferences().then((preferences) => {
      if (active) {
        setPreference(preferences.theme);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const setThemePreference = useCallback(async (nextPreference: ThemePreference) => {
    await saveThemePreference(nextPreference);
    setPreference(nextPreference);
  }, []);

  const resolved = resolveThemeMode(preference, systemColorScheme ?? detectedColorScheme);
  const theme = resolved === 'dark' ? darkTheme : lightTheme;

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, theme, setThemePreference }),
    [preference, resolved, theme, setThemePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
