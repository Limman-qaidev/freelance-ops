import type { TimeEntry } from './time-entry';
import type { WorkInterval } from './work-interval';

export type ManualTimeWarning = 'OVERLAP';

export type ManualTimeTiming =
  | {
      kind: 'RANGE';
      startedAtUtc: string;
      endedAtUtc: string;
    }
  | {
      kind: 'DURATION';
      startedAtUtc: string;
      durationMinutes: number;
    };

export interface CreateManualTimeInput {
  projectId: string;
  taskId?: string | null;
  activityId?: string | null;
  description?: string | null;
  billable?: boolean;
  timezoneId: string;
  timing: ManualTimeTiming;
}

export interface UpdateHistoricalTimeInput {
  projectId: string;
  taskId: string | null;
  activityId: string | null;
  description: string | null;
  billable: boolean;
  timezoneId: string;
  startedAtUtc: string;
  endedAtUtc: string;
}

export interface TimeHistoryRecord {
  timeEntry: TimeEntry;
  intervals: WorkInterval[];
  durationMs: number;
  localWorkDate: string;
}

export interface TimeHistoryGroup {
  localWorkDate: string;
  entries: TimeHistoryRecord[];
}

export interface ManualTimeMutationResult {
  record: TimeHistoryRecord;
  warnings: ManualTimeWarning[];
}

export interface TimeHistoryRepository {
  createHistoricalEntry(timeEntry: TimeEntry, interval: WorkInterval): Promise<void>;
  replaceHistoricalEntry(timeEntry: TimeEntry, interval: WorkInterval): Promise<void>;
  deleteHistoricalEntry(timeEntryId: string): Promise<void>;
  getHistoricalEntry(timeEntryId: string): Promise<TimeHistoryRecord | null>;
  listRecentHistoricalEntries(limit: number): Promise<TimeHistoryRecord[]>;
  hasOverlap(startedAtUtc: string, endedAtUtc: string, excludeTimeEntryId?: string): Promise<boolean>;
}
