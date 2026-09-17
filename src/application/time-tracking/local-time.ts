export type LocalDateTime = {
  date: string;
  time: string;
};

export function systemTimezoneId(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function formatLocalDateTime(instantUtc: string, timezoneId: string): LocalDateTime {
  validateTimezone(timezoneId);
  const instant = new Date(instantUtc);
  if (!Number.isFinite(instant.getTime())) {
    throw new Error(`Invalid UTC instant: ${instantUtc}`);
  }
  const parts = zonedParts(instant, timezoneId);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function localDateTimeToUtc(
  date: string,
  time: string,
  timezoneId: string,
): string {
  validateTimezone(timezoneId);
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!dateMatch) throw new Error('Local date must use YYYY-MM-DD.');
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!timeMatch) throw new Error('Local time must use HH:MM.');

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error('Local date or time is outside its valid range.');
  }

  const requestedAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let candidate = requestedAsUtc;

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const observed = zonedParts(new Date(candidate), timezoneId);
    const observedAsUtc = Date.UTC(
      Number(observed.year),
      Number(observed.month) - 1,
      Number(observed.day),
      Number(observed.hour),
      Number(observed.minute),
      0,
      0,
    );
    const correction = requestedAsUtc - observedAsUtc;
    candidate += correction;
    if (correction === 0) break;
  }

  const resolved = zonedParts(new Date(candidate), timezoneId);
  const requested = {
    year: String(year).padStart(4, '0'),
    month: String(month).padStart(2, '0'),
    day: String(day).padStart(2, '0'),
    hour: String(hour).padStart(2, '0'),
    minute: String(minute).padStart(2, '0'),
  };

  if (
    resolved.year !== requested.year ||
    resolved.month !== requested.month ||
    resolved.day !== requested.day ||
    resolved.hour !== requested.hour ||
    resolved.minute !== requested.minute
  ) {
    throw new Error(`Local time ${date} ${time} does not exist in ${timezoneId}.`);
  }

  return new Date(candidate).toISOString();
}

type ZonedParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
};

function zonedParts(instant: Date, timezoneId: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezoneId,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

function validateTimezone(timezoneId: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezoneId }).format(new Date(0));
  } catch {
    throw new Error(`Timezone ${timezoneId} is not a valid IANA timezone.`);
  }
}
