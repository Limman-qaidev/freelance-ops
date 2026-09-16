import { DatabaseSync } from 'node:sqlite';

import type {
  QueryExecutor,
  TransactionDatabase,
} from '../../src/infrastructure/database/database-port';
import {
  DATABASE_VERSION,
  migrateDatabase,
} from '../../src/infrastructure/database/migrate-database';

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

function createTestDatabase(
  database: DatabaseSync,
  options: { failBeforeVersionCommit?: boolean } = {},
): TransactionDatabase {
  const executor = createExecutor(database);

  return {
    ...executor,
    withExclusiveTransactionAsync: async (task) => {
      database.exec('BEGIN EXCLUSIVE;');

      try {
        const transaction: QueryExecutor = {
          ...executor,
          execAsync: async (source: string) => {
            if (
              options.failBeforeVersionCommit &&
              source.startsWith('PRAGMA user_version')
            ) {
              throw new Error('Injected migration failure');
            }

            database.exec(source);
          },
        };

        await task(transaction);
        database.exec('COMMIT;');
      } catch (error) {
        database.exec('ROLLBACK;');
        throw error;
      }
    },
  };
}

function readUserVersion(database: DatabaseSync): number {
  const row = database.prepare('PRAGMA user_version').get() as {
    user_version: number;
  };
  return row.user_version;
}

function tableExists(database: DatabaseSync, tableName: string): boolean {
  const row = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName);
  return row !== undefined;
}

describe('database migrations', () => {
  it('creates the current schema version on a fresh database', async () => {
    const database = new DatabaseSync(':memory:');

    try {
      await migrateDatabase(createTestDatabase(database));

      expect(readUserVersion(database)).toBe(DATABASE_VERSION);

      const tables = database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all() as { name: string }[];

      expect(tables.map(({ name }) => name)).toEqual([
        'activities',
        'clients',
        'expense_attachments',
        'expenses',
        'projects',
        'tasks',
        'time_entries',
        'work_intervals',
        'workspaces',
      ]);
    } finally {
      database.close();
    }
  });

  it('is idempotent and preserves existing data after reopening', async () => {
    const database = new DatabaseSync(':memory:');
    const adapter = createTestDatabase(database);

    try {
      await migrateDatabase(adapter);
      database
        .prepare(
          'INSERT INTO workspaces (id, name, default_currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        )
        .run('workspace-1', 'Freelance Ops', 'EUR', '2026-09-16', '2026-09-16');

      await migrateDatabase(adapter);

      const row = database
        .prepare('SELECT COUNT(*) AS count FROM workspaces')
        .get() as { count: number };

      expect(row.count).toBe(1);
      expect(readUserVersion(database)).toBe(DATABASE_VERSION);
    } finally {
      database.close();
    }
  });

  it('enforces foreign keys', async () => {
    const database = new DatabaseSync(':memory:');

    try {
      await migrateDatabase(createTestDatabase(database));

      expect(() =>
        database
          .prepare(
            'INSERT INTO clients (id, workspace_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          )
          .run('client-1', 'missing-workspace', 'Client', '2026-09-16', '2026-09-16'),
      ).toThrow();
    } finally {
      database.close();
    }
  });

  it('stores money as integer minor units and time with UTC plus timezone context', async () => {
    const database = new DatabaseSync(':memory:');

    try {
      await migrateDatabase(createTestDatabase(database));

      const expenseColumns = database.prepare('PRAGMA table_info(expenses)').all() as {
        name: string;
        type: string;
      }[];
      const intervalColumns = database
        .prepare('PRAGMA table_info(work_intervals)')
        .all() as { name: string; type: string }[];
      const timeEntryColumns = database
        .prepare('PRAGMA table_info(time_entries)')
        .all() as { name: string; type: string }[];

      expect(
        expenseColumns.find(({ name }) => name === 'original_amount_minor')?.type,
      ).toBe('INTEGER');
      expect(
        expenseColumns.find(({ name }) => name === 'project_amount_minor')?.type,
      ).toBe('INTEGER');
      expect(
        expenseColumns.find(({ name }) => name === 'exchange_rate_decimal')?.type,
      ).toBe('TEXT');

      expect(intervalColumns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'started_at_utc', type: 'TEXT' }),
          expect.objectContaining({ name: 'ended_at_utc', type: 'TEXT' }),
          expect.objectContaining({ name: 'timezone_id', type: 'TEXT' }),
        ]),
      );
      expect(timeEntryColumns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'stopped_at_utc', type: 'TEXT' }),
        ]),
      );
    } finally {
      database.close();
    }
  });

  it('rolls back the entire migration if version advancement fails', async () => {
    const database = new DatabaseSync(':memory:');

    try {
      await expect(
        migrateDatabase(
          createTestDatabase(database, { failBeforeVersionCommit: true }),
        ),
      ).rejects.toThrow('Injected migration failure');

      expect(readUserVersion(database)).toBe(0);
      expect(tableExists(database, 'workspaces')).toBe(false);
    } finally {
      database.close();
    }
  });
});
