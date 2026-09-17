import * as Localization from 'expo-localization';
import { createContext, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import {
  loadUiPreferences,
  saveLanguageOverride,
  type SupportedLanguage,
} from '../preferences/ui-preferences';
import { translations, type TranslationKey } from './translations';

export interface I18nContextValue {
  language: SupportedLanguage;
  languageOverride: SupportedLanguage | null;
  setLanguage(language: SupportedLanguage | null): Promise<void>;
  t(key: TranslationKey): string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function getDeviceLanguage(): SupportedLanguage {
  const locale = Localization.getLocales()[0];
  const languageCode = locale?.languageCode?.toLowerCase();
  const languageTag = locale?.languageTag?.toLowerCase();

  if (languageCode === 'en' || languageTag?.startsWith('en-')) {
    return 'en';
  }

  return 'es';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [languageOverride, setLanguageOverride] = useState<SupportedLanguage | null>(null);
  const [language, setResolvedLanguage] = useState<SupportedLanguage>(() => getDeviceLanguage());

  useEffect(() => {
    let active = true;

    void loadUiPreferences().then((preferences) => {
      if (!active) {
        return;
      }

      setLanguageOverride(preferences.language);
      setResolvedLanguage(preferences.language ?? getDeviceLanguage());
    });

    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback(async (nextLanguage: SupportedLanguage | null) => {
    await saveLanguageOverride(nextLanguage);
    setLanguageOverride(nextLanguage);
    setResolvedLanguage(nextLanguage ?? getDeviceLanguage());
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[language][key],
    [language],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ language, languageOverride, setLanguage, t }),
    [language, languageOverride, setLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
