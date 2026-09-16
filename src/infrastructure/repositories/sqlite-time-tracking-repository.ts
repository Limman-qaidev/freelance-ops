import type { TimeEntry } from '@/domain/time-tracking/time-entry';
import type {
  StartTimerCommand,
  TimeTrackingRepository,
} from '@/domain/time-tracking/time-tracking-repository';
import type { TimerSession, WorkInterval } from '@/domain/time-tracking/work-interval';
import type {
  DataDatabase,
  TransactionalDataDatabase,
} from '@/infrastructure/database/data-database';

type TimeEntryRow = {
  id: string;
  project_id: string;
  task_id: string | null;
  activity_id: string | null;
  description: string | null;
  billable: number;
  source: 'TIMER' | 'MANUAL';
  stopped_at_utc: string | null;
  created_at: string;
  updated_at: string;
};

type WorkIntervalRow = {
  id: string;
  time_entry_id: string;
  started_at_utc: string;
  ended_at_utc: string | null;
  timezone_id: string;
  created_at: string;
};

export class SqliteTimeTrackingRepository implements TimeTrackingRepository {
  constructor(private readonly database: TransactionalDataDatabase) {}

  async getActiveTimerSession(): Promise<TimerSession | null> {
    const row = await this.database.getFirstAsync<TimeEntryRow>(
      `SELECT id, project_id, task_id, activity_id, description, billable, source,
              stopped_at_utc, created_at, updated_at
         FROM time_entries
        WHERE source = 'TIMER' AND stopped_at_utc IS NULL
        ORDER BY created_at DESC
        LIMIT 1`,
    );
    if (!row) return null;

    const intervalRows = await this.database.getAllAsync<WorkIntervalRow>(
      `SELECT id, time_entry_id, started_at_utc, ended_at_utc, timezone_id, created_at
         FROM work_intervals
        WHERE time_entry_id = ?
        ORDER BY started_at_utc ASC, created_at ASC`,
      row.id,
    );
    const intervals = intervalRows.map(mapInterval);
    return {
      timeEntry: mapTimeEntry(row),
      intervals,
      state: intervals.some((interval) => interval.endedAtUtc === null) ? 'RUNNING' : 'PAUSED',
    };
  }

  async startTimer(command: StartTimerCommand): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const existing = await transaction.getFirstAsync<{ id: string }>(
        `SELECT id FROM time_entries
          WHERE source = 'TIMER' AND stopped_at_utc IS NULL
          LIMIT 1`,
      );
      if (existing) throw new Error('An active timer session already exists.');

      if (command.activateProject) {
        await transaction.runAsync(
          `UPDATE projects
              SET status = 'ACTIVE',
                  actual_start_date = COALESCE(actual_start_date, ?),
                  updated_at = ?
            WHERE id = ? AND status = 'PLANNED'`,
          command.projectActualStartDate,
          command.timeEntry.updatedAt,
          command.timeEntry.projectId,
        );
      }

      await transaction.runAsync(
        `INSERT INTO time_entries (
          id, project_id, task_id, activity_id, description, billable, source,
          stopped_at_utc, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        command.timeEntry.id,
        command.timeEntry.projectId,
        command.timeEntry.taskId,
        command.timeEntry.activityId,
        command.timeEntry.description,
        command.timeEntry.billable ? 1 : 0,
        command.timeEntry.source,
        command.timeEntry.stoppedAtUtc,
        command.timeEntry.createdAt,
        command.timeEntry.updatedAt,
      );
      await insertInterval(transaction, command.interval);
    });
  }

  async pauseTimer(timeEntryId: string, endedAtUtc: string, updatedAtUtc: string): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await requireUnstoppedSession(transaction, timeEntryId);
      const open = await transaction.getFirstAsync<{ id: string }>(
        `SELECT id FROM work_intervals
          WHERE time_entry_id = ? AND ended_at_utc IS NULL
          LIMIT 1`,
        timeEntryId,
      );
      if (!open) throw new Error('The active timer is already paused.');

      await transaction.runAsync(
        'UPDATE work_intervals SET ended_at_utc = ? WHERE id = ?',
        endedAtUtc,
        open.id,
      );
      await transaction.runAsync(
        'UPDATE time_entries SET updated_at = ? WHERE id = ?',
        updatedAtUtc,
        timeEntryId,
      );
    });
  }

  async resumeTimer(
    timeEntryId: string,
    interval: WorkInterval,
    updatedAtUtc: string,
  ): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await requireUnstoppedSession(transaction, timeEntryId);
      const open = await transaction.getFirstAsync<{ id: string }>(
        'SELECT id FROM work_intervals WHERE ended_at_utc IS NULL LIMIT 1',
      );
      if (open) throw new Error('A work interval is already active.');

      await insertInterval(transaction, interval);
      await transaction.runAsync(
        'UPDATE time_entries SET updated_at = ? WHERE id = ?',
        updatedAtUtc,
        timeEntryId,
      );
    });
  }

  async stopTimer(timeEntryId: string, stoppedAtUtc: string, updatedAtUtc: string): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await requireUnstoppedSession(transaction, timeEntryId);
      await transaction.runAsync(
        `UPDATE work_intervals
            SET ended_at_utc = ?
          WHERE time_entry_id = ? AND ended_at_utc IS NULL`,
        stoppedAtUtc,
        timeEntryId,
      );
      await transaction.runAsync(
        `UPDATE time_entries
            SET stopped_at_utc = ?, updated_at = ?
          WHERE id = ?`,
        stoppedAtUtc,
        updatedAtUtc,
        timeEntryId,
      );
    });
  }
}

async function requireUnstoppedSession(
  database: DataDatabase,
  timeEntryId: string,
): Promise<void> {
  const row = await database.getFirstAsync<{ id: string }>(
    `SELECT id FROM time_entries
      WHERE id = ? AND source = 'TIMER' AND stopped_at_utc IS NULL`,
    timeEntryId,
  );
  if (!row) throw new Error('There is no active timer session.');
}

async function insertInterval(
  database: DataDatabase,
  interval: WorkInterval,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO work_intervals (
      id, time_entry_id, started_at_utc, ended_at_utc, timezone_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    interval.id,
    interval.timeEntryId,
    interval.startedAtUtc,
    interval.endedAtUtc,
    interval.timezoneId,
    interval.createdAt,
  );
}

function mapTimeEntry(row: TimeEntryRow): TimeEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    taskId: row.task_id,
    activityId: row.activity_id,
    description: row.description,
    billable: row.billable === 1,
    source: row.source,
    stoppedAtUtc: row.stopped_at_utc,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInterval(row: WorkIntervalRow): WorkInterval {
  return {
    id: row.id,
    timeEntryId: row.time_entry_id,
    startedAtUtc: row.started_at_utc,
    endedAtUtc: row.ended_at_utc,
    timezoneId: row.timezone_id,
    createdAt: row.created_at,
  };
}
