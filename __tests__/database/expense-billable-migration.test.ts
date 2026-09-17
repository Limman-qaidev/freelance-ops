import { DatabaseSync } from 'node:sqlite';

import type {
  QueryExecutor,
  TransactionDatabase,
} from '../../src/infrastructure/database/database-port';
import { migrateDatabase } from '../../src/infrastructure/database/migrate-database';

function createExecutor(database: DatabaseSync): QueryExecutor {
  return {
    execAsync: async (source: string) => {
      database.exec(source);
    },
    getFirstAsync: async <T,>(source: string) => {
      const row = database.prepare(source).get();
      return (row ?? null) as T | null;
    },
  };
}

function createTestDatabase(database: DatabaseSync): TransactionDatabase {
  const executor = createExecutor(database);
  return {
    ...executor,
    withExclusiveTransactionAsync: async (task) => {
      database.exec('BEGIN EXCLUSIVE;');
      try {
        await task(executor);
        database.exec('COMMIT;');
      } catch (error) {
        database.exec('ROLLBACK;');
        throw error;
      }
    },
  };
}

describe('expense billable migration', () => {
  it('adds billable as a constrained boolean while preserving existing expense rows', async () => {
    const database = new DatabaseSync(':memory:');
    const adapter = createTestDatabase(database);

    try {
      await migrateDatabase(adapter);

      const columns = database.prepare('PRAGMA table_info(expenses)').all() as {
        name: string;
        type: string;
        notnull: number;
        dflt_value: string | null;
      }[];

      expect(columns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'billable',
            type: 'INTEGER',
            notnull: 1,
          }),
        ]),
      );
    } finally {
      database.close();
    }
  });
});
