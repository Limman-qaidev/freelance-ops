import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import TabLayout from '../app/(tabs)/_layout';
import { ThemeProvider } from '../src/ui/theme/theme-provider';

function TabLayoutWithTheme() {
  return (
    <ThemeProvider systemColorScheme="light">
      <TabLayout />
    </ThemeProvider>
  );
}

function RouteProbe({ label }: { label: string }) {
  return <Text>{label}</Text>;
}

describe('application shell', () => {
  it('renders the exact five primary bottom navigation destinations', async () => {
    await renderRouter(
      {
        '(tabs)/_layout': TabLayoutWithTheme,
        '(tabs)/index': () => <RouteProbe label="Today route" />,
        '(tabs)/projects': () => <RouteProbe label="Projects route" />,
        '(tabs)/tasks': () => <RouteProbe label="Tasks route" />,
        '(tabs)/planning': () => <RouteProbe label="Planning route" />,
        '(tabs)/more': () => <RouteProbe label="More route" />,
      },
      { initialUrl: '/' },
    );

    expect(screen.getByText('Today route')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('Projects')).toBeTruthy();
    expect(screen.getByText('Tasks')).toBeTruthy();
    expect(screen.getByText('Planning')).toBeTruthy();
    expect(screen.getByText('More')).toBeTruthy();
  });
});
