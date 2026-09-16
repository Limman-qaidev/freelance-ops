import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

describe('SQLite core repositories', () => {
  it('persists core entities across reopen and preserves archive semantics', async () => {
    const { SqliteWorkspaceRepository } = jest.requireActual(
      '../../src/infrastructure/repositories/sqlite-workspace-repository',
    ) as { SqliteWorkspaceRepository: new (...args: any[]) => any };
    const { SqliteClientRepository } = jest.requireActual(
      '../../src/infrastructure/repositories/sqlite-client-repository',
    ) as { SqliteClientRepository: new (...args: any[]) => any };
    const { SqliteProjectRepository } = jest.requireActual(
      '../../src/infrastructure/repositories/sqlite-project-repository',
    ) as { SqliteProjectRepository: new (...args: any[]) => any };
    const { SqliteTaskRepository } = jest.requireActual(
      '../../src/infrastructure/repositories/sqlite-task-repository',
    ) as { SqliteTaskRepository: new (...args: any[]) => any };
    const { SqliteActivityRepository } = jest.requireActual(
      '../../src/infrastructure/repositories/sqlite-activity-repository',
    ) as { SqliteActivityRepository: new (...args: any[]) => any };

    const directory = mkdtempSync(join(tmpdir(), 'freelance-ops-core-'));
    const databasePath = join(directory, 'core.sqlite');
    const timestamp = '2026-09-16T19:00:00.000Z';

    try {
      let database = new DatabaseSync(databasePath);
      await migrateDatabase(createMigrationDatabase(database));
      let dataDatabase = createDataDatabase(database);

      let workspaceRepository = new SqliteWorkspaceRepository(dataDatabase);
      let clientRepository = new SqliteClientRepository(dataDatabase);
      let projectRepository = new SqliteProjectRepository(dataDatabase);
      let taskRepository = new SqliteTaskRepository(dataDatabase);
      let activityRepository = new SqliteActivityRepository(dataDatabase);

      await workspaceRepository.create({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Freelance Ops',
        defaultCurrency: 'EUR',
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await clientRepository.create({
        id: '22222222-2222-4222-8222-222222222222',
        workspaceId: '11111111-1111-4111-8111-111111111111',
        name: 'Synthetic Client',
        legalName: null,
        notes: null,
        archivedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await projectRepository.create({
        id: '33333333-3333-4333-8333-333333333333',
        clientId: '22222222-2222-4222-8222-222222222222',
        name: 'Synthetic Project',
        description: null,
        status: 'ACTIVE',
        plannedStartDate: '2026-09-20',
        plannedEndDate: '2026-10-31',
        actualStartDate: null,
        actualEndDate: null,
        projectCurrency: 'EUR',
        archivedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await taskRepository.create({
        id: '44444444-4444-4444-8444-444444444444',
        projectId: '33333333-3333-4333-8333-333333333333',
        name: 'Synthetic Task',
        description: null,
        status: 'PENDING',
        priority: null,
        estimatedMinutes: 120,
        plannedStartDate: null,
        plannedEndDate: null,
        actualStartDate: null,
        actualEndDate: null,
        archivedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await activityRepository.create({
        id: '55555555-5555-4555-8555-555555555555',
        workspaceId: '11111111-1111-4111-8111-111111111111',
        name: 'Development',
        archivedAt: null,
        createdAt: timestamp,
      });

      database.close();

      database = new DatabaseSync(databasePath);
      await migrateDatabase(createMigrationDatabase(database));
      dataDatabase = createDataDatabase(database);
      workspaceRepository = new SqliteWorkspaceRepository(dataDatabase);
      clientRepository = new SqliteClientRepository(dataDatabase);
      projectRepository = new SqliteProjectRepository(dataDatabase);
      taskRepository = new SqliteTaskRepository(dataDatabase);
      activityRepository = new SqliteActivityRepository(dataDatabase);

      expect(await workspaceRepository.getFirst()).toMatchObject({
        id: '11111111-1111-4111-8111-111111111111',
        defaultCurrency: 'EUR',
      });
      expect(await projectRepository.listActive('11111111-1111-4111-8111-111111111111')).toHaveLength(1);
      expect(await taskRepository.listForProject('33333333-3333-4333-8333-333333333333')).toHaveLength(1);
      expect(await activityRepository.listActive('11111111-1111-4111-8111-111111111111')).toHaveLength(1);

      await clientRepository.archive(
        '22222222-2222-4222-8222-222222222222',
        timestamp,
        timestamp,
      );
      await taskRepository.archive(
        '44444444-4444-4444-8444-444444444444',
        timestamp,
        timestamp,
      );
      await activityRepository.archive(
        '55555555-5555-4555-8555-555555555555',
        timestamp,
      );

      expect(await clientRepository.listActive('11111111-1111-4111-8111-111111111111')).toHaveLength(0);
      expect(await clientRepository.getById('22222222-2222-4222-8222-222222222222')).toMatchObject({
        archivedAt: timestamp,
      });
      expect(await taskRepository.listForProject('33333333-3333-4333-8333-333333333333')).toHaveLength(0);
      expect(await taskRepository.getById('44444444-4444-4444-8444-444444444444')).toMatchObject({
        archivedAt: timestamp,
      });
      expect(await activityRepository.listActive('11111111-1111-4111-8111-111111111111')).toHaveLength(0);
      expect(await activityRepository.listAll('11111111-1111-4111-8111-111111111111')).toHaveLength(1);

      database.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
