import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  QueryExecutor,
  TransactionDatabase,
} from './database-port';

function createQueryExecutor(database: SQLiteDatabase): QueryExecutor {
  return {
    execAsync: (source: string) => database.execAsync(source),
    getFirstAsync: <T,>(source: string) => database.getFirstAsync<T>(source),
  };
}

export function createTransactionDatabase(
  database: SQLiteDatabase,
): TransactionDatabase {
  return {
    ...createQueryExecutor(database),
    withExclusiveTransactionAsync: async (task) => {
      await database.withExclusiveTransactionAsync(async (transaction) => {
        await task(createQueryExecutor(transaction));
      });
    },
  };
}
