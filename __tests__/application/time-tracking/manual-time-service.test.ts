import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type {
  QueryExecutor,
  TransactionDatabase,
} from '../../../src/infrastructure/database/database-port';
import { migrateDatabase } from '../../../src/infrastructure/database/migrate-database';
import { SqliteActivityRepository } from '../../../src/infrastructure/repositories/sqlite-activity-repository';
import { SqliteProjectRepository } from '../../../src/infrastructure/repositories/sqlite-project-repository';
import { SqliteTaskRepository } from '../../../src/infrastructure/repositories/sqlite-task-repository';
import { SqliteTimeTrackingRepository } from '../../../src/infrastructure/repositories/sqlite-time-tracking-repository';

function createMigrationDatabase(database: DatabaseSync): TransactionDatabase {
  const executor: QueryExecutor = {
    execAsync: async (source) => database.exec(source),
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
    withExclusiveTransactionAsync: async <T,>(
      task: (transaction: ReturnType<typeof createExecutor>) => Promise<T>,
    ) => {
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
  projectA: '33333333-3333-4333-8333-333333333331',
  projectB: '33333333-3333-4333-8333-333333333332',
  taskA: '44444444-4444-4444-8444-444444444441',
  activity: '55555555-5555-4555-8555-555555555555',
};

async function seed(database: ReturnType<typeof createDataDatabase>) {
  const at = '2026-09-16T07:00:00.000Z';
  await database.runAsync(
    'INSERT INTO workspaces (id, name, default_currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    IDS.workspace,
    'Freelance Ops',
    'EUR',
    at,
    at,
  );
  await database.runAsync(
    'INSERT INTO clients (id, workspace_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    IDS.client,
    IDS.workspace,
    'Synthetic Client',
    at,
    at,
  );
  for (const [id, name] of [
    [IDS.projectA, 'Project A'],
    [IDS.projectB, 'Project B'],
  ]) {
    await database.runAsync(
      `INSERT INTO projects (
        id, client_id, name, status, project_currency, created_at, updated_at
      ) VALUES (?, ?, ?, 'ACTIVE', 'EUR', ?, ?)`,
      id,
      IDS.client,
      name,
      at,
      at,
    );
  }
  await database.runAsync(
    `INSERT INTO tasks (id, project_id, name, status, created_at, updated_at)
     VALUES (?, ?, ?, 'PENDING', ?, ?)`,
    IDS.taskA,
    IDS.projectA,
    'Task A',
    at,
    at,
  );
  await database.runAsync(
    'INSERT INTO activities (id, workspace_id, name, created_at) VALUES (?, ?, ?, ?)',
    IDS.activity,
    IDS.workspace,
    'Development',
    at,
  );
}

function loadManualTimeTypes() {
  const { SqliteTimeHistoryRepository } = jest.requireActual(
    '../../../src/infrastructure/repositories/sqlite-time-history-repository',
  ) as { SqliteTimeHistoryRepository: new (...args: any[]) => any };
  const { ManualTimeService } = jest.requireActual(
    '../../../src/application/time-tracking/manual-time-service',
  ) as { ManualTimeService: new (...args: any[]) => any };
  return { SqliteTimeHistoryRepository, ManualTimeService };
}

function idGenerator() {
  let next = 1;
  return () => `66666666-6666-4666-8666-${String(next++).padStart(12, '0')}`;
}

describe('manual time and history service', () => {
  it('creates range and duration entries as closed intervals and warns without blocking overlaps', async () => {
    const { SqliteTimeHistoryRepository, ManualTimeService } = loadManualTimeTypes();
    const directory = mkdtempSync(join(tmpdir(), 'freelance-ops-manual-'));
    const path = join(directory, 'manual.sqlite');

    try {
      const sqlite = new DatabaseSync(path);
      await migrateDatabase(createMigrationDatabase(sqlite));
      const database = createDataDatabase(sqlite);
      await seed(database);

      const service = new ManualTimeService(
        new SqliteTimeHistoryRepository(database),
        new SqliteProjectRepository(database),
        new SqliteTaskRepository(database),
        new SqliteActivityRepository(database),
        idGenerator(),
        () => '2026-09-16T12:00:00.000Z',
      );

      const first = await service.create({
        projectId: IDS.projectA,
        taskId: IDS.taskA,
        activityId: IDS.activity,
        description: 'Historical analysis',
        timezoneId: 'Europe/Madrid',
        timing: {
          kind: 'RANGE',
          startedAtUtc: '2026-09-16T07:00:00.000Z',
          endedAtUtc: '2026-09-16T08:00:00.000Z',
        },
      });

      expect(first.warnings).toEqual([]);
      expect(first.record.timeEntry.source).toBe('MANUAL');
      expect(first.record.timeEntry.stoppedAtUtc).toBe('2026-09-16T08:00:00.000Z');
      expect(first.record.intervals).toHaveLength(1);
      expect(first.record.intervals[0]).toMatchObject({
        startedAtUtc: '2026-09-16T07:00:00.000Z',
        endedAtUtc: '2026-09-16T08:00:00.000Z',
        timezoneId: 'Europe/Madrid',
      });
      expect(first.record.durationMs).toBe(60 * 60 * 1000);
      expect(first.record.localWorkDate).toBe('2026-09-16');

      const overlapping = await service.create({
        projectId: IDS.projectA,
        timezoneId: 'Europe/Madrid',
        timing: {
          kind: 'DURATION',
          startedAtUtc: '2026-09-16T07:30:00.000Z',
          durationMinutes: 30,
        },
      });

      expect(overlapping.warnings).toEqual(['OVERLAP']);
      expect(overlapping.record.intervals[0].endedAtUtc).toBe('2026-09-16T08:00:00.000Z');
      expect(overlapping.record.durationMs).toBe(30 * 60 * 1000);
      expect(await new SqliteTimeTrackingRepository(database).getActiveTimerSession()).toBeNull();

      const groups = await service.listRecentGrouped(20);
      expect(groups).toHaveLength(1);
      expect(groups[0].localWorkDate).toBe('2026-09-16');
      expect(groups[0].entries).toHaveLength(2);

      sqlite.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('validates relationships and supports controlled historical edit and delete', async () => {
    const { SqliteTimeHistoryRepository, ManualTimeService } = loadManualTimeTypes();
    const directory = mkdtempSync(join(tmpdir(), 'freelance-ops-history-edit-'));
    const path = join(directory, 'history.sqlite');

    try {
      const sqlite = new DatabaseSync(path);
      await migrateDatabase(createMigrationDatabase(sqlite));
      const database = createDataDatabase(sqlite);
      await seed(database);

      const service = new ManualTimeService(
        new SqliteTimeHistoryRepository(database),
        new SqliteProjectRepository(database),
        new SqliteTaskRepository(database),
        new SqliteActivityRepository(database),
        idGenerator(),
        () => '2026-09-16T12:00:00.000Z',
      );

      await expect(
        service.create({
          projectId: IDS.projectB,
          taskId: IDS.taskA,
          timezoneId: 'Europe/Madrid',
          timing: {
            kind: 'DURATION',
            startedAtUtc: '2026-09-15T10:00:00.000Z',
            durationMinutes: 45,
          },
        }),
      ).rejects.toThrow(/same project/i);

      const created = await service.create({
        projectId: IDS.projectA,
        taskId: IDS.taskA,
        timezoneId: 'Europe/Madrid',
        timing: {
          kind: 'DURATION',
          startedAtUtc: '2026-09-15T10:00:00.000Z',
          durationMinutes: 45,
        },
      });

      await expect(
        service.update(created.record.timeEntry.id, {
          projectId: IDS.projectB,
          taskId: IDS.taskA,
          activityId: null,
          description: 'Wrong project',
          billable: true,
          timezoneId: 'Europe/Madrid',
          startedAtUtc: '2026-09-15T10:00:00.000Z',
          endedAtUtc: '2026-09-15T11:00:00.000Z',
        }),
      ).rejects.toThrow(/same project/i);

      const updated = await service.update(created.record.timeEntry.id, {
        projectId: IDS.projectB,
        taskId: null,
        activityId: IDS.activity,
        description: 'Corrected historical work',
        billable: false,
        timezoneId: 'Indian/Mauritius',
        startedAtUtc: '2026-09-15T09:00:00.000Z',
        endedAtUtc: '2026-09-15T10:15:00.000Z',
      });

      expect(updated.record.timeEntry).toMatchObject({
        id: created.record.timeEntry.id,
        projectId: IDS.projectB,
        taskId: null,
        activityId: IDS.activity,
        description: 'Corrected historical work',
        billable: false,
      });
      expect(updated.record.durationMs).toBe(75 * 60 * 1000);
      expect(updated.record.intervals[0].timezoneId).toBe('Indian/Mauritius');

      await database.runAsync(
        'UPDATE projects SET archived_at = ? WHERE id = ?',
        '2026-09-16T13:00:00.000Z',
        IDS.projectB,
      );
      expect((await service.getById(created.record.timeEntry.id))?.timeEntry.projectId).toBe(
        IDS.projectB,
      );

      await service.delete(created.record.timeEntry.id);
      expect(await service.getById(created.record.timeEntry.id)).toBeNull();

      sqlite.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('refuses historical mutation of a live timer session', async () => {
    const { SqliteTimeHistoryRepository, ManualTimeService } = loadManualTimeTypes();
    const directory = mkdtempSync(join(tmpdir(), 'freelance-ops-history-live-'));
    const path = join(directory, 'history.sqlite');

    try {
      const sqlite = new DatabaseSync(path);
      await migrateDatabase(createMigrationDatabase(sqlite));
      const database = createDataDatabase(sqlite);
      await seed(database);

      const at = '2026-09-16T09:00:00.000Z';
      await database.runAsync(
        `INSERT INTO time_entries (
          id, project_id, description, billable, source, stopped_at_utc, created_at, updated_at
        ) VALUES (?, ?, NULL, 1, 'TIMER', NULL, ?, ?)`,
        '77777777-7777-4777-8777-777777777777',
        IDS.projectA,
        at,
        at,
      );
      await database.runAsync(
        `INSERT INTO work_intervals (
          id, time_entry_id, started_at_utc, ended_at_utc, timezone_id, created_at
        ) VALUES (?, ?, ?, NULL, ?, ?)`,
        '88888888-8888-4888-8888-888888888888',
        '77777777-7777-4777-8777-777777777777',
        at,
        'Europe/Madrid',
        at,
      );

      const service = new ManualTimeService(
        new SqliteTimeHistoryRepository(database),
        new SqliteProjectRepository(database),
        new SqliteTaskRepository(database),
        new SqliteActivityRepository(database),
        idGenerator(),
        () => '2026-09-16T12:00:00.000Z',
      );

      await expect(service.delete('77777777-7777-4777-8777-777777777777')).rejects.toThrow(
        /active timer/i,
      );
      expect(await service.getById('77777777-7777-4777-8777-777777777777')).not.toBeNull();

      sqlite.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
