const cache = new Map<string, Intl.DateTimeFormat>();

function getCachedFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key =
    locale + '|' + JSON.stringify(options, Object.keys(options).sort());
  let fmt = cache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, options);
    cache.set(key, fmt);
  }
  return fmt;
}

/** hour:minute 2-digit (en-US) — used for entry time display */
export function getTimeFormatter(timezone: string): Intl.DateTimeFormat {
  return getCachedFormatter('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

/** hour:minute numeric (en-US) — used for timezone-aware time extraction */
export function getTimePartsFormatter(timezone: string): Intl.DateTimeFormat {
  return getCachedFormatter('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  });
}

/** full date+time numeric (en-US) — used for timezone offset calculation */
export function getDateTimePartsFormatter(
  timezone: string,
): Intl.DateTimeFormat {
  return getCachedFormatter('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  });
}

/** full date+time 2-digit (en-CA) — used for datetime-local formatting */
export function getDateTimeLocalFormatter(
  timezone: string,
): Intl.DateTimeFormat {
  return getCachedFormatter('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

/** date-only 2-digit (en-CA) — used for slot time creation */
export function getDatePartsFormatter(timezone: string): Intl.DateTimeFormat {
  return getCachedFormatter('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
