import { ManualTimeService } from '../../../src/application/time-tracking/manual-time-service';
import type {
  TimeHistoryRecord,
  TimeHistoryRepository,
} from '../../../src/domain/time-tracking/time-history';

function makeRecord(id: string, localWorkDate: string, startedAtUtc: string): TimeHistoryRecord {
  return {
    timeEntry: {
      id,
      projectId: 'project-1',
      taskId: null,
      activityId: null,
      description: null,
      billable: true,
      source: 'MANUAL',
      stoppedAtUtc: new Date(Date.parse(startedAtUtc) + 60_000).toISOString(),
      createdAt: startedAtUtc,
      updatedAt: startedAtUtc,
    },
    intervals: [
      {
        id: `${id}-interval`,
        timeEntryId: id,
        startedAtUtc,
        endedAtUtc: new Date(Date.parse(startedAtUtc) + 60_000).toISOString(),
        timezoneId: 'UTC',
        createdAt: startedAtUtc,
      },
    ],
    durationMs: 60_000,
    localWorkDate,
  };
}

describe('manual time history grouping', () => {
  it('coalesces the same local work date even when UTC ordering interleaves dates', async () => {
    const records = [
      makeRecord('entry-a', '2026-09-17', '2026-09-17T12:30:00.000Z'),
      makeRecord('entry-b', '2026-09-16', '2026-09-17T11:30:00.000Z'),
      makeRecord('entry-c', '2026-09-17', '2026-09-17T10:30:00.000Z'),
    ];
    const repository = {
      listRecentHistoricalEntries: jest.fn(async () => records),
    } as unknown as TimeHistoryRepository;
    const service = new ManualTimeService(
      repository,
      {} as never,
      {} as never,
      {} as never,
    );

    const groups = await service.listRecentGrouped(20);

    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.localWorkDate)).toEqual(['2026-09-17', '2026-09-16']);
    expect(groups[0].entries.map((record) => record.timeEntry.id)).toEqual([
      'entry-a',
      'entry-c',
    ]);
  });
});
