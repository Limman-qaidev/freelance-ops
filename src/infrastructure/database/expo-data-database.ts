import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  DataDatabase,
  DatabaseValue,
  TransactionalDataDatabase,
} from '@/infrastructure/database/data-database';

function createExecutor(database: SQLiteDatabase): DataDatabase {
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

export function createExpoDataDatabase(
  database: SQLiteDatabase,
): TransactionalDataDatabase {
  return {
    ...createExecutor(database),
    withExclusiveTransactionAsync: async <T,>(
      task: (transaction: DataDatabase) => Promise<T>,
    ): Promise<T> => {
      let result: T | undefined;
      let completed = false;
      await database.withExclusiveTransactionAsync(async (transaction) => {
        result = await task(createExecutor(transaction));
        completed = true;
      });
      if (!completed) throw new Error('Exclusive data transaction did not complete.');
      return result as T;
    },
  };
}
