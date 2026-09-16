import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type {
  QueryExecutor,
  TransactionDatabase,
} from '../../../src/infrastructure/database/database-port';
import { migrateDatabase } from '../../../src/infrastructure/database/migrate-database';
import { SqliteProjectRepository } from '../../../src/infrastructure/repositories/sqlite-project-repository';
import { SqliteTaskRepository } from '../../../src/infrastructure/repositories/sqlite-task-repository';

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
  const createExecutor = () => ({
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
  });

  return {
    ...createExecutor(),
    withExclusiveTransactionAsync: async <T,>(task: (transaction: ReturnType<typeof createExecutor>) => Promise<T>) => {
      database.exec('BEGIN EXCLUSIVE;');
      try {
        const result = await task(createExecutor());
        database.exec('COMMIT;');
        return result;
      } catch (error) {
        database.exec('ROLLBACK;');
        throw error;
      }
    },
  };
}

const IDS = {
  workspace: '11111111-1111-4111-8111-111111111111',
  client: '22222222-2222-4222-8222-222222222222',
  project: '33333333-3333-4333-8333-333333333333',
  otherProject: '33333333-3333-4333-8333-333333333334',
  task: '44444444-4444-4444-8444-444444444444',
  activity: '55555555-5555-4555-8555-555555555555',
};

async function seed(database: ReturnType<typeof createDataDatabase>) {
  const timestamp = '2026-09-16T08:00:00.000Z';
  await database.runAsync(
    'INSERT INTO workspaces (id, name, default_currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    IDS.workspace,
    'Freelance Ops',
    'EUR',
    timestamp,
    timestamp,
  );
  await database.runAsync(
    'INSERT INTO clients (id, workspace_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    IDS.client,
    IDS.workspace,
    'Synthetic Client',
    timestamp,
    timestamp,
  );
  await database.runAsync(
    `INSERT INTO projects (
      id, client_id, name, status, project_currency, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    IDS.project,
    IDS.client,
    'Planned project',
    'PLANNED',
    'EUR',
    timestamp,
    timestamp,
  );
  await database.runAsync(
    `INSERT INTO projects (
      id, client_id, name, status, project_currency, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    IDS.otherProject,
    IDS.client,
    'Other project',
    'ACTIVE',
    'EUR',
    timestamp,
    timestamp,
  );
  await database.runAsync(
    `INSERT INTO tasks (
      id, project_id, name, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    IDS.task,
    IDS.project,
    'Timer task',
    'PENDING',
    timestamp,
    timestamp,
  );
  await database.runAsync(
    'INSERT INTO activities (id, workspace_id, name, created_at) VALUES (?, ?, ?, ?)',
    IDS.activity,
    IDS.workspace,
    'Development',
    timestamp,
  );
}

function loadTimerTypes() {
  const { SqliteTimeTrackingRepository } = jest.requireActual(
    '../../../src/infrastructure/repositories/sqlite-time-tracking-repository',
  ) as { SqliteTimeTrackingRepository: new (...args: any[]) => any };
  const { TimeTrackingService } = jest.requireActual(
    '../../../src/application/time-tracking/time-tracking-service',
  ) as { TimeTrackingService: new (...args: any[]) => any };

  return { SqliteTimeTrackingRepository, TimeTrackingService };
}

function sequentialIds() {
  let next = 0;
  const values = [
    '66666666-6666-4666-8666-666666666661',
    '66666666-6666-4666-8666-666666666662',
    '66666666-6666-4666-8666-666666666663',
    '66666666-6666-4666-8666-666666666664',
  ];
  return () => values[next++] ?? `66666666-6666-4666-8666-${String(next).padStart(12, '0')}`;
}

describe('persistent time tracking service', () => {
  it('persists start, pause, resume and stop and reconstructs running/paused state', async () => {
    const { SqliteTimeTrackingRepository, TimeTrackingService } = loadTimerTypes();
    const directory = mkdtempSync(join(tmpdir(), 'freelance-ops-timer-'));
    const databasePath = join(directory, 'timer.sqlite');

    try {
      let sqlite = new DatabaseSync(databasePath);
      await migrateDatabase(createMigrationDatabase(sqlite));
      let dataDatabase = createDataDatabase(sqlite);
      await seed(dataDatabase);

      let now = '2026-09-16T09:00:00.000Z';
      const createService = () =>
        new TimeTrackingService(
          new SqliteTimeTrackingRepository(dataDatabase),
          new SqliteProjectRepository(dataDatabase),
          new SqliteTaskRepository(dataDatabase),
          sequentialIds(),
          () => now,
          () => 'Indian/Mauritius',
        );

      let service = createService();
      const started = await service.startWork({
        projectId: IDS.project,
        taskId: IDS.task,
        activityId: IDS.activity,
        description: 'Build parser',
      });

      expect(started.state).toBe('RUNNING');
      expect(started.timeEntry.projectId).toBe(IDS.project);
      expect(started.intervals).toHaveLength(1);
      expect(started.intervals[0]).toMatchObject({
        startedAtUtc: '2026-09-16T09:00:00.000Z',
        endedAtUtc: null,
        timezoneId: 'Indian/Mauritius',
      });
      expect((await new SqliteProjectRepository(dataDatabase).getById(IDS.project))?.status).toBe('ACTIVE');
      await expect(service.startWork({ projectId: IDS.otherProject })).rejects.toThrow(/active timer/i);

      now = '2026-09-16T09:30:00.000Z';
      expect(await service.getElapsedDuration(now)).toBe(30 * 60 * 1000);
      const paused = await service.pauseWork();
      expect(paused.state).toBe('PAUSED');
      expect(paused.intervals[0].endedAtUtc).toBe(now);

      sqlite.close();
      sqlite = new DatabaseSync(databasePath);
      await migrateDatabase(createMigrationDatabase(sqlite));
      dataDatabase = createDataDatabase(sqlite);
      service = createService();

      expect((await service.getActiveSession())?.state).toBe('PAUSED');
      expect(await service.getElapsedDuration('2026-09-16T10:00:00.000Z')).toBe(30 * 60 * 1000);

      now = '2026-09-16T10:00:00.000Z';
      const resumed = await service.resumeWork();
      expect(resumed.state).toBe('RUNNING');
      expect(resumed.intervals).toHaveLength(2);
      expect(resumed.intervals[1].timezoneId).toBe('Indian/Mauritius');

      now = '2026-09-16T10:15:00.000Z';
      expect(await service.getElapsedDuration(now)).toBe(45 * 60 * 1000);

      sqlite.close();
      sqlite = new DatabaseSync(databasePath);
      await migrateDatabase(createMigrationDatabase(sqlite));
      dataDatabase = createDataDatabase(sqlite);
      service = createService();

      expect((await service.getActiveSession())?.state).toBe('RUNNING');
      await service.stopWork();
      expect(await service.getActiveSession()).toBeNull();

      sqlite.close();
      sqlite = new DatabaseSync(databasePath);
      await migrateDatabase(createMigrationDatabase(sqlite));
      dataDatabase = createDataDatabase(sqlite);
      service = createService();
      expect(await service.getActiveSession()).toBeNull();

      sqlite.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects a task that belongs to another project without creating timer data', async () => {
    const { SqliteTimeTrackingRepository, TimeTrackingService } = loadTimerTypes();
    const directory = mkdtempSync(join(tmpdir(), 'freelance-ops-timer-mismatch-'));
    const databasePath = join(directory, 'timer.sqlite');

    try {
      const sqlite = new DatabaseSync(databasePath);
      await migrateDatabase(createMigrationDatabase(sqlite));
      const dataDatabase = createDataDatabase(sqlite);
      await seed(dataDatabase);

      const service = new TimeTrackingService(
        new SqliteTimeTrackingRepository(dataDatabase),
        new SqliteProjectRepository(dataDatabase),
        new SqliteTaskRepository(dataDatabase),
        sequentialIds(),
        () => '2026-09-16T09:00:00.000Z',
        () => 'Indian/Mauritius',
      );

      await expect(
        service.startWork({ projectId: IDS.otherProject, taskId: IDS.task }),
      ).rejects.toThrow(/same project/i);

      expect(await service.getActiveSession()).toBeNull();
      sqlite.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
