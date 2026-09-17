import {
  formatLocalDateTime,
  localDateTimeToUtc,
} from '../../../src/application/time-tracking/local-time';

describe('local time conversion', () => {
  it('round-trips local wall time through the supplied IANA timezone', () => {
    expect(formatLocalDateTime('2026-09-16T07:30:00.000Z', 'Europe/Madrid')).toEqual({
      date: '2026-09-16',
      time: '09:30',
    });
    expect(localDateTimeToUtc('2026-09-16', '09:30', 'Europe/Madrid')).toBe(
      '2026-09-16T07:30:00.000Z',
    );

    expect(localDateTimeToUtc('2026-01-16', '09:30', 'Europe/Madrid')).toBe(
      '2026-01-16T08:30:00.000Z',
    );
  });

  it('rejects malformed or nonexistent local wall times', () => {
    expect(() => localDateTimeToUtc('2026/09/16', '09:30', 'Europe/Madrid')).toThrow(
      /date/i,
    );
    expect(() => localDateTimeToUtc('2026-09-16', '9:30', 'Europe/Madrid')).toThrow(
      /time/i,
    );
    expect(() => localDateTimeToUtc('2026-03-29', '02:30', 'Europe/Madrid')).toThrow(
      /does not exist/i,
    );
  });
});
