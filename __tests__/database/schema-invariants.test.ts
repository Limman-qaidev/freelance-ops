import { DatabaseSync } from 'node:sqlite';

import type {
  QueryExecutor,
  TransactionDatabase,
} from '../../src/infrastructure/database/database-port';
import { migrateDatabase } from '../../src/infrastructure/database/migrate-database';

function createTestDatabase(database: DatabaseSync): TransactionDatabase {
  const executor: QueryExecutor = {
    execAsync: async (source: string) => {
      database.exec(source);
    },
    getFirstAsync: async <T,>(source: string) => {
      const row = database.prepare(source).get();
      return (row ?? null) as T | null;
    },
  };

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

function seedProjects(database: DatabaseSync): void {
  database
    .prepare(
      'INSERT INTO workspaces (id, name, default_currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    )
    .run('workspace-1', 'Freelance Ops', 'EUR', '2026-09-16', '2026-09-16');
  database
    .prepare(
      'INSERT INTO clients (id, workspace_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    )
    .run('client-1', 'workspace-1', 'Client', '2026-09-16', '2026-09-16');

  const insertProject = database.prepare(
    'INSERT INTO projects (id, client_id, name, status, project_currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  insertProject.run(
    'project-1',
    'client-1',
    'Project 1',
    'ACTIVE',
    'EUR',
    '2026-09-16',
    '2026-09-16',
  );
  insertProject.run(
    'project-2',
    'client-1',
    'Project 2',
    'ACTIVE',
    'EUR',
    '2026-09-16',
    '2026-09-16',
  );
}

describe('database schema invariants', () => {
  it('rejects a task attached to a time entry from another project', async () => {
    const database = new DatabaseSync(':memory:');

    try {
      await migrateDatabase(createTestDatabase(database));
      seedProjects(database);

      database
        .prepare(
          'INSERT INTO tasks (id, project_id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(
          'task-1',
          'project-1',
          'Task',
          'PENDING',
          '2026-09-16',
          '2026-09-16',
        );

      expect(() =>
        database
          .prepare(
            'INSERT INTO time_entries (id, project_id, task_id, billable, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          )
          .run(
            'entry-invalid',
            'project-2',
            'task-1',
            1,
            'TIMER',
            '2026-09-16',
            '2026-09-16',
          ),
      ).toThrow();
    } finally {
      database.close();
    }
  });

  it('allows at most one open work interval globally', async () => {
    const database = new DatabaseSync(':memory:');

    try {
      await migrateDatabase(createTestDatabase(database));
      seedProjects(database);

      const insertEntry = database.prepare(
        'INSERT INTO time_entries (id, project_id, billable, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      );
      insertEntry.run(
        'entry-1',
        'project-1',
        1,
        'TIMER',
        '2026-09-16',
        '2026-09-16',
      );
      insertEntry.run(
        'entry-2',
        'project-2',
        1,
        'TIMER',
        '2026-09-16',
        '2026-09-16',
      );

      const insertInterval = database.prepare(
        'INSERT INTO work_intervals (id, time_entry_id, started_at_utc, timezone_id, created_at) VALUES (?, ?, ?, ?, ?)',
      );
      insertInterval.run(
        'interval-1',
        'entry-1',
        '2026-09-16T08:00:00Z',
        'Europe/Madrid',
        '2026-09-16T08:00:00Z',
      );

      expect(() =>
        insertInterval.run(
          'interval-2',
          'entry-2',
          '2026-09-16T09:00:00Z',
          'Europe/Madrid',
          '2026-09-16T09:00:00Z',
        ),
      ).toThrow();

      database
        .prepare('UPDATE work_intervals SET ended_at_utc = ? WHERE id = ?')
        .run('2026-09-16T08:30:00Z', 'interval-1');

      expect(() =>
        insertInterval.run(
          'interval-2',
          'entry-2',
          '2026-09-16T09:00:00Z',
          'Europe/Madrid',
          '2026-09-16T09:00:00Z',
        ),
      ).not.toThrow();
    } finally {
      database.close();
    }
  });
});
