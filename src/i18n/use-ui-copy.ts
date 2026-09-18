import { useCallback, useContext } from 'react';

import { I18nContext } from '@/i18n/i18n-provider';
import { en, type TranslationKey } from '@/i18n/translations';

export function useUiCopy() {
  const context = useContext(I18nContext);
  const translate = context?.t;
  const language = context?.language ?? 'en';

  const t = useCallback(
    (key: TranslationKey) => translate?.(key) ?? en[key],
    [translate],
  );

  return { language, t };
}
