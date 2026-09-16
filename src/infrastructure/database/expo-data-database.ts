import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  DataDatabase,
  DatabaseValue,
} from '@/infrastructure/database/data-database';

export function createExpoDataDatabase(database: SQLiteDatabase): DataDatabase {
  return {
    runAsync: async (source: string, ...params: DatabaseValue[]) => {
      await database.runAsync(source, ...params);
    },
    getFirstAsync: <T,>(source: string, ...params: DatabaseValue[]) =>
      database.getFirstAsync<T>(source, ...params),
    getAllAsync: <T,>(source: string, ...params: DatabaseValue[]) =>
      database.getAllAsync<T>(source, ...params),
  };
}
