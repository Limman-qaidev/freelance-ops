export const TIMER_LIFECYCLE_SCHEMA_VERSION = 2;

export const TIMER_LIFECYCLE_SQL = `
ALTER TABLE time_entries ADD COLUMN stopped_at_utc TEXT;

CREATE UNIQUE INDEX idx_time_entries_single_unstopped_timer
  ON time_entries ((1))
  WHERE source = 'TIMER' AND stopped_at_utc IS NULL;
`;
