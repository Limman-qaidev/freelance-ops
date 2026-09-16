import type {
  TimeHistoryRecord,
  TimeHistoryRepository,
} from '@/domain/time-tracking/time-history';
import type { TimeEntry } from '@/domain/time-tracking/time-entry';
import type { WorkInterval } from '@/domain/time-tracking/work-interval';
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

const ENTRY_COLUMNS = `
  id, project_id, task_id, activity_id, description, billable, source,
  stopped_at_utc, created_at, updated_at
`;

const INTERVAL_COLUMNS = `
  id, time_entry_id, started_at_utc, ended_at_utc, timezone_id, created_at
`;

export class SqliteTimeHistoryRepository implements TimeHistoryRepository {
  constructor(private readonly database: TransactionalDataDatabase) {}

  async createHistoricalEntry(timeEntry: TimeEntry, interval: WorkInterval): Promise<void> {
    if (interval.endedAtUtc === null) {
      throw new Error('Historical time entries must contain only closed intervals.');
    }

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await insertTimeEntry(transaction, timeEntry);
      await insertInterval(transaction, interval);
    });
  }

  async replaceHistoricalEntry(timeEntry: TimeEntry, interval: WorkInterval): Promise<void> {
    if (interval.endedAtUtc === null) {
      throw new Error('Historical time entries must contain only closed intervals.');
    }

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await requireMutableHistoricalEntry(transaction, timeEntry.id);

      await transaction.runAsync(
        `UPDATE time_entries
            SET project_id = ?, task_id = ?, activity_id = ?, description = ?,
                billable = ?, stopped_at_utc = ?, updated_at = ?
          WHERE id = ?`,
        timeEntry.projectId,
        timeEntry.taskId,
        timeEntry.activityId,
        timeEntry.description,
        timeEntry.billable ? 1 : 0,
        timeEntry.stoppedAtUtc,
        timeEntry.updatedAt,
        timeEntry.id,
      );
      await transaction.runAsync('DELETE FROM work_intervals WHERE time_entry_id = ?', timeEntry.id);
      await insertInterval(transaction, interval);
    });
  }

  async deleteHistoricalEntry(timeEntryId: string): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await requireMutableHistoricalEntry(transaction, timeEntryId);
      await transaction.runAsync('DELETE FROM time_entries WHERE id = ?', timeEntryId);
    });
  }

  async getHistoricalEntry(timeEntryId: string): Promise<TimeHistoryRecord | null> {
    const row = await this.database.getFirstAsync<TimeEntryRow>(
      `SELECT ${ENTRY_COLUMNS} FROM time_entries WHERE id = ?`,
      timeEntryId,
    );
    if (!row) return null;
    return this.loadRecord(mapTimeEntry(row));
  }

  async listRecentHistoricalEntries(limit: number): Promise<TimeHistoryRecord[]> {
    const safeLimit = Math.max(1, Math.floor(limit));
    const rows = await this.database.getAllAsync<TimeEntryRow>(
      `SELECT ${ENTRY_COLUMNS}
         FROM time_entries
        WHERE NOT (source = 'TIMER' AND stopped_at_utc IS NULL)
        ORDER BY (
          SELECT MIN(started_at_utc)
            FROM work_intervals
           WHERE work_intervals.time_entry_id = time_entries.id
        ) DESC,
        created_at DESC
        LIMIT ?`,
      safeLimit,
    );

    return Promise.all(rows.map((row) => this.loadRecord(mapTimeEntry(row))));
  }

  async hasOverlap(
    startedAtUtc: string,
    endedAtUtc: string,
    excludeTimeEntryId?: string,
  ): Promise<boolean> {
    const base = `
      SELECT work_intervals.id
        FROM work_intervals
       WHERE work_intervals.started_at_utc < ?
         AND (work_intervals.ended_at_utc IS NULL OR work_intervals.ended_at_utc > ?)`;

    const row = excludeTimeEntryId
      ? await this.database.getFirstAsync<{ id: string }>(
          `${base} AND work_intervals.time_entry_id <> ? LIMIT 1`,
          endedAtUtc,
          startedAtUtc,
          excludeTimeEntryId,
        )
      : await this.database.getFirstAsync<{ id: string }>(
          `${base} LIMIT 1`,
          endedAtUtc,
          startedAtUtc,
        );

    return row !== null;
  }

  private async loadRecord(timeEntry: TimeEntry): Promise<TimeHistoryRecord> {
    const rows = await this.database.getAllAsync<WorkIntervalRow>(
      `SELECT ${INTERVAL_COLUMNS}
         FROM work_intervals
        WHERE time_entry_id = ?
        ORDER BY started_at_utc ASC, created_at ASC`,
      timeEntry.id,
    );
    const intervals = rows.map(mapInterval);
    const first = intervals[0];
    const durationMs = intervals.reduce((total, interval) => {
      if (!interval.endedAtUtc) return total;
      return total + (Date.parse(interval.endedAtUtc) - Date.parse(interval.startedAtUtc));
    }, 0);

    return {
      timeEntry,
      intervals,
      durationMs,
      localWorkDate: first
        ? formatLocalWorkDate(first.startedAtUtc, first.timezoneId)
        : timeEntry.createdAt.slice(0, 10),
    };
  }
}

async function requireMutableHistoricalEntry(
  database: DataDatabase,
  timeEntryId: string,
): Promise<TimeEntryRow> {
  const row = await database.getFirstAsync<TimeEntryRow>(
    `SELECT ${ENTRY_COLUMNS} FROM time_entries WHERE id = ?`,
    timeEntryId,
  );
  if (!row) throw new Error(`Time entry ${timeEntryId} was not found.`);

  const openInterval = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM work_intervals WHERE time_entry_id = ? AND ended_at_utc IS NULL LIMIT 1',
    timeEntryId,
  );
  if ((row.source === 'TIMER' && row.stopped_at_utc === null) || openInterval) {
    throw new Error('An active timer session cannot be edited or deleted from history.');
  }
  return row;
}

async function insertTimeEntry(database: DataDatabase, timeEntry: TimeEntry): Promise<void> {
  await database.runAsync(
    `INSERT INTO time_entries (
      id, project_id, task_id, activity_id, description, billable, source,
      stopped_at_utc, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    timeEntry.id,
    timeEntry.projectId,
    timeEntry.taskId,
    timeEntry.activityId,
    timeEntry.description,
    timeEntry.billable ? 1 : 0,
    timeEntry.source,
    timeEntry.stoppedAtUtc,
    timeEntry.createdAt,
    timeEntry.updatedAt,
  );
}

async function insertInterval(database: DataDatabase, interval: WorkInterval): Promise<void> {
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

function formatLocalWorkDate(instant: string, timezoneId: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezoneId,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
