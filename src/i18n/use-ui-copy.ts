import { useCallback, useContext } from 'react';

import { I18nContext } from './i18n-provider';
import type { TranslationKey } from './translations';

export function useUiCopy() {
  const context = useContext(I18nContext);
  const translate = context?.t;

  return useCallback(
    (key: TranslationKey, fallback: string) => translate?.(key) ?? fallback,
    [translate],
  );
}
