import type { TimeEntry } from './time-entry';
import type { TimerSession, WorkInterval } from './work-interval';

export interface StartTimerCommand {
  timeEntry: TimeEntry;
  interval: WorkInterval;
  activateProject: boolean;
  projectActualStartDate: string | null;
}

export interface TimeTrackingRepository {
  getActiveTimerSession(): Promise<TimerSession | null>;
  startTimer(command: StartTimerCommand): Promise<void>;
  pauseTimer(timeEntryId: string, endedAtUtc: string, updatedAtUtc: string): Promise<void>;
  resumeTimer(timeEntryId: string, interval: WorkInterval, updatedAtUtc: string): Promise<void>;
  stopTimer(timeEntryId: string, stoppedAtUtc: string, updatedAtUtc: string): Promise<void>;
}
