import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import type { PropsWithChildren } from 'react';

import { createTransactionDatabase } from './expo-sqlite-adapter';
import { migrateDatabase } from './migrate-database';

const DATABASE_NAME = 'freelance-ops.db';

async function initializeDatabase(database: SQLiteDatabase): Promise<void> {
  await migrateDatabase(createTransactionDatabase(database));
}

export function DatabaseProvider({ children }: PropsWithChildren) {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabase}>
      {children}
    </SQLiteProvider>
  );
}
