import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { CoreApplication } from '@/infrastructure/application/create-core-application';
import { createCoreApplication } from '@/infrastructure/application/create-core-application';
import { createExpoDataDatabase } from '@/infrastructure/database/expo-data-database';
import { colors, spacing, typography } from '@/ui/theme/tokens';

import { ApplicationContextProvider } from './application-context';

const DEFAULT_WORKSPACE_NAME = 'Freelance Ops';
const DEFAULT_CURRENCY = 'EUR';

export function ApplicationProvider({ children }: PropsWithChildren) {
  const sqliteDatabase = useSQLiteContext();
  const [application, setApplication] = useState<CoreApplication | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function initialize(): Promise<void> {
      try {
        const dataDatabase = createExpoDataDatabase(sqliteDatabase);
        const coreApplication = await createCoreApplication(dataDatabase, {
          workspaceName: DEFAULT_WORKSPACE_NAME,
          defaultCurrency: DEFAULT_CURRENCY,
        });

        if (active) {
          setApplication(coreApplication);
        }
      } catch {
        if (active) {
          setFailed(true);
        }
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [sqliteDatabase]);

  if (failed) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.errorTitle}>Unable to prepare local workspace.</Text>
        <Text style={styles.stateText}>
          Your local database could not be initialized. Restart the app and try again.
        </Text>
      </View>
    );
  }

  if (!application) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator />
        <Text style={styles.stateText}>Preparing your workspace…</Text>
      </View>
    );
  }

  return (
    <ApplicationContextProvider application={application}>
      {children}
    </ApplicationContextProvider>
  );
}

const styles = StyleSheet.create({
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  stateText: {
    color: colors.textMuted,
    fontSize: typography.body,
    textAlign: 'center',
  },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: '700',
    textAlign: 'center',
  },
});
