export const TIME_ENTRY_SOURCES = ['TIMER', 'MANUAL'] as const;

export type TimeEntrySource = (typeof TIME_ENTRY_SOURCES)[number];

export interface TimeEntry {
  id: string;
  projectId: string;
  taskId: string | null;
  activityId: string | null;
  description: string | null;
  billable: boolean;
  source: TimeEntrySource;
  stoppedAtUtc: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StartWorkInput {
  projectId: string;
  taskId?: string | null;
  activityId?: string | null;
  description?: string | null;
}
