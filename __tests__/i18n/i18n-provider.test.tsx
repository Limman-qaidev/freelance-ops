import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Localization from 'expo-localization';
import { Pressable, Text, View } from 'react-native';

import { I18nProvider } from '../../src/i18n/i18n-provider';
import { useI18n } from '../../src/i18n/use-i18n';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(),
}));

const getLocales = Localization.getLocales as jest.MockedFunction<typeof Localization.getLocales>;

function Probe() {
  const { language, setLanguage, t } = useI18n();

  return (
    <View>
      <Text testID="language">{language}</Text>
      <Text testID="today-label">{t('nav.today')}</Text>
      <Pressable testID="set-en" onPress={() => void setLanguage('en')} />
      <Pressable testID="set-es" onPress={() => void setLanguage('es')} />
      <Pressable testID="clear-language" onPress={() => void setLanguage(null)} />
    </View>
  );
}

function renderProbe() {
  return render(
    <I18nProvider>
      <Probe />
    </I18nProvider>,
  );
}

describe('I18nProvider', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('uses Spanish for a Spanish device locale', async () => {
    getLocales.mockReturnValue([{ languageCode: 'es', languageTag: 'es-ES' }] as ReturnType<
      typeof Localization.getLocales
    >);

    const screen = renderProbe();

    await waitFor(() => expect(screen.getByTestId('language').props.children).toBe('es'));
    expect(screen.getByTestId('today-label').props.children).toBe('Hoy');
  });

  it('uses English for an English device locale', async () => {
    getLocales.mockReturnValue([{ languageCode: 'en', languageTag: 'en-GB' }] as ReturnType<
      typeof Localization.getLocales
    >);

    const screen = renderProbe();

    await waitFor(() => expect(screen.getByTestId('language').props.children).toBe('en'));
    expect(screen.getByTestId('today-label').props.children).toBe('Today');
  });

  it('falls back to Spanish for an unsupported device locale', async () => {
    getLocales.mockReturnValue([{ languageCode: 'fr', languageTag: 'fr-FR' }] as ReturnType<
      typeof Localization.getLocales
    >);

    const screen = renderProbe();

    await waitFor(() => expect(screen.getByTestId('language').props.children).toBe('es'));
    expect(screen.getByTestId('today-label').props.children).toBe('Hoy');
  });

  it('applies a persisted manual language override', async () => {
    getLocales.mockReturnValue([{ languageCode: 'es', languageTag: 'es-ES' }] as ReturnType<
      typeof Localization.getLocales
    >);
    await AsyncStorage.setItem('freelance-ops:language', 'en');

    const screen = renderProbe();

    await waitFor(() => expect(screen.getByTestId('language').props.children).toBe('en'));
    expect(screen.getByTestId('today-label').props.children).toBe('Today');
  });

  it('persists a manual override and can clear it back to the device language', async () => {
    getLocales.mockReturnValue([{ languageCode: 'es', languageTag: 'es-ES' }] as ReturnType<
      typeof Localization.getLocales
    >);

    const screen = renderProbe();
    await waitFor(() => expect(screen.getByTestId('language').props.children).toBe('es'));

    fireEvent.press(screen.getByTestId('set-en'));
    await waitFor(() => expect(screen.getByTestId('language').props.children).toBe('en'));
    await expect(AsyncStorage.getItem('freelance-ops:language')).resolves.toBe('en');

    fireEvent.press(screen.getByTestId('clear-language'));
    await waitFor(() => expect(screen.getByTestId('language').props.children).toBe('es'));
    await expect(AsyncStorage.getItem('freelance-ops:language')).resolves.toBeNull();
  });
});
