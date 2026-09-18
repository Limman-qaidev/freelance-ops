import { useContext } from 'react';
import { I18nContext } from './i18n-provider';
import type { TranslationKey } from './translations';

export function useUiCopy() {
  const context = useContext(I18nContext);
  return (key: TranslationKey, fallback: string) => context?.t(key) ?? fallback;
}
