import { DatabaseSync } from 'node:sqlite';

import type {
  QueryExecutor,
  TransactionDatabase,
} from '../../src/infrastructure/database/database-port';
import { migrateDatabase } from '../../src/infrastructure/database/migrate-database';

function createMigrationDatabase(database: DatabaseSync): TransactionDatabase {
  const executor: QueryExecutor = {
    execAsync: async (source) => {
      database.exec(source);
    },
    getFirstAsync: async <T,>(source: string) =>
      (database.prepare(source).get() ?? null) as T | null,
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

function createDataDatabase(database: DatabaseSync) {
  return {
    runAsync: async (source: string, ...params: (string | number | null)[]) => {
      database.prepare(source).run(...params);
    },
    getFirstAsync: async <T,>(
      source: string,
      ...params: (string | number | null)[]
    ) => (database.prepare(source).get(...params) ?? null) as T | null,
    getAllAsync: async <T,>(
      source: string,
      ...params: (string | number | null)[]
    ) => database.prepare(source).all(...params) as T[],
  };
}

describe('createCoreApplication', () => {
  it('bootstraps one workspace and seven configurable default activities idempotently', async () => {
    const { createCoreApplication } = jest.requireActual(
      '../../src/infrastructure/application/create-core-application',
    ) as {
      createCoreApplication: (...args: any[]) => Promise<any>;
    };
    const database = new DatabaseSync(':memory:');

    try {
      await migrateDatabase(createMigrationDatabase(database));
      const dataDatabase = createDataDatabase(database);

      const first = await createCoreApplication(dataDatabase, {
        workspaceName: 'Freelance Ops',
        defaultCurrency: 'EUR',
      });
      const second = await createCoreApplication(dataDatabase, {
        workspaceName: 'Should not replace existing',
        defaultCurrency: 'USD',
      });

      expect(second.workspace.id).toBe(first.workspace.id);
      expect(second.workspace).toMatchObject({
        name: 'Freelance Ops',
        defaultCurrency: 'EUR',
      });
      expect(await second.activityService.listActive()).toHaveLength(7);

      const workspaceCount = database
        .prepare('SELECT COUNT(*) AS count FROM workspaces')
        .get() as { count: number };
      const activityCount = database
        .prepare('SELECT COUNT(*) AS count FROM activities')
        .get() as { count: number };

      expect(workspaceCount.count).toBe(1);
      expect(activityCount.count).toBe(7);
      expect(second.clientService).toBeDefined();
      expect(second.projectService).toBeDefined();
      expect(second.taskService).toBeDefined();
    } finally {
      database.close();
    }
  });
});
