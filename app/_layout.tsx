import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { I18nProvider } from '@/i18n/i18n-provider';
import { DatabaseProvider } from '@/infrastructure/database/database-provider';
import { ApplicationProvider } from '@/providers/application-provider';
import { ThemeProvider } from '@/ui/theme/theme-provider';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <DatabaseProvider>
          <ApplicationProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="time-history" />
              <Stack.Screen name="time-entry/[id]" />
              <Stack.Screen name="expenses" />
              <Stack.Screen name="expense/edit" />
            </Stack>
            <StatusBar style="auto" />
          </ApplicationProvider>
        </DatabaseProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
