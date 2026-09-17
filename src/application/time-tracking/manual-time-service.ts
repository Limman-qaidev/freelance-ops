import type { ActivityRepository } from '@/domain/activities/activity';
import type { ProjectRepository } from '@/domain/projects/project';
import { generateUuid } from '@/domain/shared/id';
import type { TaskRepository } from '@/domain/tasks/task';
import type {
  CreateManualTimeInput,
  ManualTimeMutationResult,
  TimeHistoryGroup,
  TimeHistoryRecord,
  TimeHistoryRepository,
  UpdateHistoricalTimeInput,
} from '@/domain/time-tracking/time-history';
import type { TimeEntry } from '@/domain/time-tracking/time-entry';
import type { WorkInterval } from '@/domain/time-tracking/work-interval';

type IdGenerator = () => string;
type Clock = () => string;

const systemClock: Clock = () => new Date().toISOString();

export class ManualTimeService {
  constructor(
    private readonly repository: TimeHistoryRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly taskRepository: TaskRepository,
    private readonly activityRepository: ActivityRepository,
    private readonly generateId: IdGenerator = generateUuid,
    private readonly now: Clock = systemClock,
  ) {}

  async create(input: CreateManualTimeInput): Promise<ManualTimeMutationResult> {
    await this.validateRelationships(input.projectId, input.taskId ?? null, input.activityId ?? null);
    const timing = resolveTiming(input.timing);
    validateTimezone(input.timezoneId);

    const timestamp = this.now();
    const timeEntryId = this.generateId();
    const timeEntry: TimeEntry = {
      id: timeEntryId,
      projectId: input.projectId,
      taskId: input.taskId ?? null,
      activityId: input.activityId ?? null,
      description: input.description?.trim() || null,
      billable: input.billable ?? true,
      source: 'MANUAL',
      stoppedAtUtc: timing.endedAtUtc,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const interval: WorkInterval = {
      id: this.generateId(),
      timeEntryId,
      startedAtUtc: timing.startedAtUtc,
      endedAtUtc: timing.endedAtUtc,
      timezoneId: input.timezoneId,
      createdAt: timestamp,
    };

    const overlaps = await this.repository.hasOverlap(
      timing.startedAtUtc,
      timing.endedAtUtc,
    );
    await this.repository.createHistoricalEntry(timeEntry, interval);
    const record = await this.requireRecord(timeEntryId);
    return { record, warnings: overlaps ? ['OVERLAP'] : [] };
  }

  async update(
    timeEntryId: string,
    input: UpdateHistoricalTimeInput,
  ): Promise<ManualTimeMutationResult> {
    const current = await this.requireRecord(timeEntryId);
    await this.validateRelationships(input.projectId, input.taskId, input.activityId);

    const timestamp = this.now();
    const metadata: TimeEntry = {
      ...current.timeEntry,
      projectId: input.projectId,
      taskId: input.taskId,
      activityId: input.activityId,
      description: input.description?.trim() || null,
      billable: input.billable,
      updatedAt: timestamp,
    };

    if (!input.timing) {
      await this.repository.updateHistoricalMetadata(metadata);
      return { record: await this.requireRecord(timeEntryId), warnings: [] };
    }

    if (current.intervals.length !== 1) {
      throw new Error(
        'Timing edits are not supported for sessions with multiple work intervals. Edit metadata only.',
      );
    }

    validateTimezone(input.timing.timezoneId);
    const timing = resolveRange(input.timing.startedAtUtc, input.timing.endedAtUtc);
    const timeEntry: TimeEntry = {
      ...metadata,
      stoppedAtUtc: timing.endedAtUtc,
    };
    const interval: WorkInterval = {
      id: current.intervals[0]?.id ?? this.generateId(),
      timeEntryId,
      startedAtUtc: timing.startedAtUtc,
      endedAtUtc: timing.endedAtUtc,
      timezoneId: input.timing.timezoneId,
      createdAt: current.intervals[0]?.createdAt ?? current.timeEntry.createdAt,
    };

    const overlaps = await this.repository.hasOverlap(
      timing.startedAtUtc,
      timing.endedAtUtc,
      timeEntryId,
    );
    await this.repository.replaceHistoricalEntry(timeEntry, interval);
    const record = await this.requireRecord(timeEntryId);
    return { record, warnings: overlaps ? ['OVERLAP'] : [] };
  }

  delete(timeEntryId: string): Promise<void> {
    return this.repository.deleteHistoricalEntry(timeEntryId);
  }

  getById(timeEntryId: string): Promise<TimeHistoryRecord | null> {
    return this.repository.getHistoricalEntry(timeEntryId);
  }

  async listRecentGrouped(limit = 50): Promise<TimeHistoryGroup[]> {
    const records = await this.repository.listRecentHistoricalEntries(limit);
    const groups: TimeHistoryGroup[] = [];
    for (const record of records) {
      const current = groups.at(-1);
      if (current?.localWorkDate === record.localWorkDate) {
        current.entries.push(record);
      } else {
        groups.push({ localWorkDate: record.localWorkDate, entries: [record] });
      }
    }
    return groups;
  }

  private async validateRelationships(
    projectId: string,
    taskId: string | null,
    activityId: string | null,
  ): Promise<void> {
    const project = await this.projectRepository.getById(projectId);
    if (!project) throw new Error(`Project ${projectId} was not found.`);

    if (taskId) {
      const task = await this.taskRepository.getById(taskId);
      if (!task) throw new Error(`Task ${taskId} was not found.`);
      if (task.projectId !== projectId) {
        throw new Error('The selected task must belong to the same project as the time entry.');
      }
    }

    if (activityId) {
      const activity = await this.activityRepository.getById(activityId);
      if (!activity) throw new Error(`Activity ${activityId} was not found.`);
    }
  }

  private async requireRecord(timeEntryId: string): Promise<TimeHistoryRecord> {
    const record = await this.repository.getHistoricalEntry(timeEntryId);
    if (!record) throw new Error(`Time entry ${timeEntryId} was not found.`);
    return record;
  }
}

function resolveTiming(input: CreateManualTimeInput['timing']): {
  startedAtUtc: string;
  endedAtUtc: string;
} {
  if (input.kind === 'RANGE') {
    return resolveRange(input.startedAtUtc, input.endedAtUtc);
  }
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
    throw new Error('Manual duration must be a positive whole number of minutes.');
  }
  const startedMs = parseInstant(input.startedAtUtc, 'start');
  return {
    startedAtUtc: new Date(startedMs).toISOString(),
    endedAtUtc: new Date(startedMs + input.durationMinutes * 60_000).toISOString(),
  };
}

function resolveRange(startedAtUtc: string, endedAtUtc: string): {
  startedAtUtc: string;
  endedAtUtc: string;
} {
  const startedMs = parseInstant(startedAtUtc, 'start');
  const endedMs = parseInstant(endedAtUtc, 'end');
  if (endedMs <= startedMs) {
    throw new Error('Manual time end must be after its start.');
  }
  return {
    startedAtUtc: new Date(startedMs).toISOString(),
    endedAtUtc: new Date(endedMs).toISOString(),
  };
}

function parseInstant(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`Manual time ${label} is not a valid instant.`);
  return parsed;
}

function validateTimezone(timezoneId: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezoneId }).format(new Date(0));
  } catch {
    throw new Error(`Timezone ${timezoneId} is not a valid IANA timezone.`);
  }
}
