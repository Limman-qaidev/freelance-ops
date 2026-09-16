import type { TimeEntry } from './time-entry';

export interface WorkInterval {
  id: string;
  timeEntryId: string;
  startedAtUtc: string;
  endedAtUtc: string | null;
  timezoneId: string;
  createdAt: string;
}

export type TimerSessionState = 'RUNNING' | 'PAUSED';

export interface TimerSession {
  timeEntry: TimeEntry;
  intervals: WorkInterval[];
  state: TimerSessionState;
}
