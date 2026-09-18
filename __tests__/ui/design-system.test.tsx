import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';

import { ActiveTimerCard } from '../../src/ui/components/active-timer-card';
import { ActionButton } from '../../src/ui/components/action-button';
import { AppHeader } from '../../src/ui/components/app-header';
import { EmptyState } from '../../src/ui/components/empty-state';
import { TextField } from '../../src/ui/components/form-fields';
import { IconButton } from '../../src/ui/components/icon-button';
import { ProjectRow } from '../../src/ui/components/project-row';
import { ScreenShell } from '../../src/ui/components/screen-shell';
import { SectionHeader } from '../../src/ui/components/section-header';
import { darkTheme, lightTheme, resolveThemeMode } from '../../src/ui/theme/theme';
import { ThemeProvider } from '../../src/ui/theme/theme-provider';
import { useTheme } from '../../src/ui/theme/use-theme';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@expo/vector-icons', () => {
  const { Text: MockText } = require('react-native');
  return {
    MaterialCommunityIcons: ({ name, ...props }: { name: string }) => (
      <MockText testID={`vector-icon-${name}`} {...props} />
    ),
  };
});

const LIGHT_COLORS = {
  background: '#F5F7F7',
  surface: '#FFFFFF',
  surfaceElevated: '#FBFCFC',
  surfaceMuted: '#EEF2F1',
  textPrimary: '#17211F',
  textSecondary: '#40504C',
  textMuted: '#64716E',
  border: '#D8E0DE',
  borderStrong: '#B8C5C2',
  accent: '#0F766E',
  accentPressed: '#0B5F59',
  accentSoft: '#DDF2EF',
  onAccent: '#FFFFFF',
  success: '#2E7D32',
  warning: '#A86400',
  error: '#B3261E',
  info: '#2F6F8F',
  disabledSurface: '#E7ECEB',
  disabledText: '#88938F',
  focusRing: '#0F766E',
  scrim: 'rgba(11,20,18,0.44)',
} as const;

const DARK_COLORS = {
  background: '#101615',
  surface: '#16201E',
  surfaceElevated: '#1C2825',
  surfaceMuted: '#222F2C',
  textPrimary: '#F1F5F4',
  textSecondary: '#C3CDCA',
  textMuted: '#8FA09C',
  border: '#2E3B38',
  borderStrong: '#465753',
  accent: '#41B7AA',
  accentPressed: '#319A8F',
  accentSoft: '#173C38',
  onAccent: '#07211E',
  success: '#67C96E',
  warning: '#E0A84B',
  error: '#F28482',
  info: '#74B8D4',
  disabledSurface: '#24302E',
  disabledText: '#6F7F7B',
  focusRing: '#63CFC3',
  scrim: 'rgba(0,0,0,0.60)',
} as const;

function ThemeProbe() {
  const { preference, resolved, theme, setThemePreference } = useTheme();

  return (
    <View>
      <Text testID="theme-preference">{preference}</Text>
      <Text testID="theme-resolved">{resolved}</Text>
      <Text testID="theme-background">{theme.colors.background}</Text>
      <ActionButton label="Cambiar a oscuro" onPress={() => void setThemePreference('dark')} />
    </View>
  );
}

describe('theme contract', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('matches the approved semantic palettes exactly', () => {
    expect(lightTheme.colors).toEqual(LIGHT_COLORS);
    expect(darkTheme.colors).toEqual(DARK_COLORS);
  });

  it('matches the approved density, radius and typography scales', () => {
    expect(lightTheme.spacing).toEqual({ xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 });
    expect(lightTheme.radii).toEqual({ sm: 8, md: 12, lg: 16 });
    expect(lightTheme.typography).toEqual({
      display: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
      title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
      section: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
      body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
      bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
      caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
      micro: { fontSize: 11, lineHeight: 15, fontWeight: '600' },
    });
    expect(lightTheme.sizing).toEqual({ buttonHeight: 48, rowMinHeight: 56, projectRowMinHeight: 68, iconButtonTarget: 44, bottomIcon: 22, inlineIcon: 20, metadataIcon: 16 });
  });

  it.each([
    ['system', 'light', 'light'],
    ['system', 'dark', 'dark'],
    ['system', null, 'light'],
    ['light', 'dark', 'light'],
    ['dark', 'light', 'dark'],
  ] as const)('resolves %s with system %s to %s', (preference, system, expected) => {
    expect(resolveThemeMode(preference, system)).toBe(expected);
  });

  it('loads and persists the theme preference through the provider', async () => {
    await AsyncStorage.setItem('freelance-ops:theme', 'light');
    const screen = await render(
      <ThemeProvider systemColorScheme="dark">
        <ThemeProbe />
      </ThemeProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('theme-preference').props.children).toBe('light'));
    expect(screen.getByTestId('theme-resolved').props.children).toBe('light');
    expect(screen.getByTestId('theme-background').props.children).toBe('#F5F7F7');

    fireEvent.press(screen.getByText('Cambiar a oscuro'));
    await waitFor(() => expect(screen.getByTestId('theme-preference').props.children).toBe('dark'));
    expect(screen.getByTestId('theme-resolved').props.children).toBe('dark');
    await expect(AsyncStorage.getItem('freelance-ops:theme')).resolves.toBe('dark');
  });
});

describe('visual primitives', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  function renderInTheme(node: React.ReactNode) {
    return render(<ThemeProvider systemColorScheme="light">{node}</ThemeProvider>);
  }

  it('renders a real vector icon inside a 44dp accessible icon button', async () => {
    const onPress = jest.fn();
    const screen = await renderInTheme(
      <IconButton icon="settings" accessibilityLabel="Abrir ajustes" onPress={onPress} />,
    );

    const button = screen.getByRole('button', { name: 'Abrir ajustes' });
    expect(button.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ minHeight: 44, minWidth: 44 })]));
    expect(screen.getByTestId('vector-icon-cog-outline')).toBeTruthy();
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes disabled action state and does not fire', async () => {
    const onPress = jest.fn();
    const screen = await renderInTheme(
      <ActionButton label="Guardar" onPress={onPress} disabled accessibilityLabel="Guardar cambios" />,
    );

    const button = screen.getByRole('button', { name: 'Guardar cambios' });
    expect(button.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('uses the compact app header inside ScreenShell instead of document-style title spacing', async () => {
    const screen = await renderInTheme(
      <ScreenShell title="Proyectos" subtitle="Cliente y contexto del proyecto">
        <Text>Contenido</Text>
      </ScreenShell>,
    );

    expect(screen.getByTestId('screen-shell-header')).toBeTruthy();
    expect(screen.getByText('Proyectos')).toHaveStyle(lightTheme.typography.title);
    expect(screen.getByText('Cliente y contexto del proyecto')).toHaveStyle(lightTheme.typography.caption);
    expect(screen.getByTestId('screen-shell-content')).toHaveStyle({ marginTop: lightTheme.spacing.md });
  });

  it('renders caller-provided translated text in structural primitives', async () => {
    const screen = await renderInTheme(
      <View>
        <AppHeader title="Hoy" subtitle="Jueves, 17 de septiembre" />
        <SectionHeader title="Proyectos activos" actionLabel="Ver todos" onActionPress={jest.fn()} />
        <EmptyState title="No hay proyectos activos" body="Crea un proyecto para empezar." actionLabel="Crear proyecto" onActionPress={jest.fn()} />
      </View>,
    );

    expect(screen.getByText('Hoy')).toBeTruthy();
    expect(screen.getByText('Proyectos activos')).toBeTruthy();
    expect(screen.getByText('No hay proyectos activos')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Crear proyecto' })).toBeTruthy();
  });

  it('uses the visible TextField label as the default accessibility label', async () => {
    const screen = await renderInTheme(
      <TextField label="Nombre del proyecto" value="" onChangeText={jest.fn()} />,
    );

    const input = screen.getByLabelText('Nombre del proyecto');
    expect(input).toHaveStyle({
      minHeight: 48,
      backgroundColor: lightTheme.colors.surface,
      color: lightTheme.colors.textPrimary,
    });
  });

  it('keeps ProjectRow display-only and accessible', async () => {
    const onPress = jest.fn();
    const screen = await renderInTheme(
      <ProjectRow
        projectName="Nissan Forecasting"
        clientName="Maubank"
        statusLabel="Activo"
        metadata="Entrega 25 sep"
        accessibilityLabel="Abrir proyecto Nissan Forecasting"
        onPress={onPress}
      />,
    );

    expect(screen.getByText('Nissan Forecasting')).toBeTruthy();
    expect(screen.getByText('Maubank')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Abrir proyecto Nissan Forecasting' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders timer state and caller-supplied controls without business logic', async () => {
    const onPause = jest.fn();
    const onStop = jest.fn();
    const screen = await renderInTheme(
      <ActiveTimerCard
        projectName="Nissan Forecasting"
        context="Maubank · Desarrollo"
        elapsed="01:24:18"
        status="running"
        statusLabel="En curso"
        pauseLabel="Pausar"
        stopLabel="Detener"
        onPause={onPause}
        onStop={onStop}
      />,
    );

    expect(screen.getByText('01:24:18')).toBeTruthy();
    expect(screen.getByText('En curso')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Pausar' }));
    fireEvent.press(screen.getByRole('button', { name: 'Detener' }));
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
