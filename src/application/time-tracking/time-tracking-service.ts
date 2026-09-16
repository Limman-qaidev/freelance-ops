import type { ProjectRepository } from '@/domain/projects/project';
import { generateUuid } from '@/domain/shared/id';
import type { TaskRepository } from '@/domain/tasks/task';
import type { StartWorkInput, TimeEntry } from '@/domain/time-tracking/time-entry';
import type { TimeTrackingRepository } from '@/domain/time-tracking/time-tracking-repository';
import type { TimerSession, WorkInterval } from '@/domain/time-tracking/work-interval';

type IdGenerator = () => string;
type Clock = () => string;
type TimezoneProvider = () => string;

const systemClock: Clock = () => new Date().toISOString();
const systemTimezone: TimezoneProvider = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export class TimeTrackingService {
  constructor(
    private readonly repository: TimeTrackingRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly taskRepository: TaskRepository,
    private readonly generateId: IdGenerator = generateUuid,
    private readonly now: Clock = systemClock,
    private readonly timezone: TimezoneProvider = systemTimezone,
  ) {}

  async startWork(input: StartWorkInput): Promise<TimerSession> {
    if (await this.repository.getActiveTimerSession()) {
      throw new Error('An active timer session already exists.');
    }

    const project = await this.projectRepository.getById(input.projectId);
    if (!project || project.archivedAt) {
      throw new Error(`Project ${input.projectId} is not available for time tracking.`);
    }
    if (project.status === 'ON_HOLD') {
      throw new Error('The project is on hold and must be resumed before tracking work.');
    }
    if (project.status === 'COMPLETED' || project.status === 'CANCELLED') {
      throw new Error(`Cannot track work on a ${project.status.toLowerCase()} project.`);
    }

    if (input.taskId) {
      const task = await this.taskRepository.getById(input.taskId);
      if (!task || task.archivedAt) {
        throw new Error(`Task ${input.taskId} is not available for time tracking.`);
      }
      if (task.projectId !== input.projectId) {
        throw new Error('The selected task must belong to the same project as the time entry.');
      }
      if (task.status === 'COMPLETED' || task.status === 'CANCELLED') {
        throw new Error(`Cannot track work on a ${task.status.toLowerCase()} task without changing its status first.`);
      }
    }

    const startedAtUtc = this.now();
    const timezoneId = this.timezone();
    const timeEntryId = this.generateId();
    const timeEntry: TimeEntry = {
      id: timeEntryId,
      projectId: input.projectId,
      taskId: input.taskId ?? null,
      activityId: input.activityId ?? null,
      description: input.description?.trim() || null,
      billable: true,
      source: 'TIMER',
      stoppedAtUtc: null,
      createdAt: startedAtUtc,
      updatedAt: startedAtUtc,
    };
    const interval: WorkInterval = {
      id: this.generateId(),
      timeEntryId,
      startedAtUtc,
      endedAtUtc: null,
      timezoneId,
      createdAt: startedAtUtc,
    };

    await this.repository.startTimer({
      timeEntry,
      interval,
      activateProject: project.status === 'PLANNED',
      projectActualStartDate:
        project.status === 'PLANNED' && project.actualStartDate === null
          ? localDate(startedAtUtc, timezoneId)
          : project.actualStartDate,
    });

    return this.requireActiveSession();
  }

  async pauseWork(): Promise<TimerSession> {
    const session = await this.requireActiveSession();
    if (session.state === 'PAUSED') {
      throw new Error('The active timer is already paused.');
    }

    const timestamp = this.now();
    await this.repository.pauseTimer(session.timeEntry.id, timestamp, timestamp);
    return this.requireActiveSession();
  }

  async resumeWork(): Promise<TimerSession> {
    const session = await this.requireActiveSession();
    if (session.state === 'RUNNING') {
      throw new Error('The active timer is already running.');
    }

    const timestamp = this.now();
    const interval: WorkInterval = {
      id: this.generateId(),
      timeEntryId: session.timeEntry.id,
      startedAtUtc: timestamp,
      endedAtUtc: null,
      timezoneId: this.timezone(),
      createdAt: timestamp,
    };
    await this.repository.resumeTimer(session.timeEntry.id, interval, timestamp);
    return this.requireActiveSession();
  }

  async stopWork(): Promise<void> {
    const session = await this.requireActiveSession();
    const timestamp = this.now();
    await this.repository.stopTimer(session.timeEntry.id, timestamp, timestamp);
  }

  getActiveSession(): Promise<TimerSession | null> {
    return this.repository.getActiveTimerSession();
  }

  async getElapsedDuration(now: string): Promise<number> {
    const session = await this.repository.getActiveTimerSession();
    if (!session) return 0;

    const current = parseInstant(now);
    return session.intervals.reduce((total, interval) => {
      const start = parseInstant(interval.startedAtUtc);
      const end = interval.endedAtUtc ? parseInstant(interval.endedAtUtc) : current;
      if (end < start) {
        throw new Error('Timer interval end cannot be before its start.');
      }
      return total + (end - start);
    }, 0);
  }

  private async requireActiveSession(): Promise<TimerSession> {
    const session = await this.repository.getActiveTimerSession();
    if (!session) throw new Error('There is no active timer session.');
    return session;
  }
}

function parseInstant(value: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(`Invalid timestamp: ${value}`);
  return timestamp;
}

function localDate(instantUtc: string, timezoneId: string): string {
  const date = new Date(instantUtc);
  if (!Number.isFinite(date.getTime())) throw new Error(`Invalid timestamp: ${instantUtc}`);
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: timezoneId,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) throw new Error(`Cannot resolve local date for ${timezoneId}.`);
  return `${year}-${month}-${day}`;
}
