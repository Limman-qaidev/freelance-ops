import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { DatabaseProvider } from '@/infrastructure/database/database-provider';
import { ApplicationProvider } from '@/providers/application-provider';

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <ApplicationProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style="auto" />
      </ApplicationProvider>
    </DatabaseProvider>
  );
}
