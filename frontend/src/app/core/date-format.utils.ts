const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const DAY_MONTH_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
});

function parseApiDate(dateValue: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
  if (!match) {
    return null;
  }
  const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** "19 Apr 2026" for an API date (YYYY-MM-DD); other strings pass through. */
export function formatApiDate(dateValue: string): string {
  const parsed = parseApiDate(dateValue);
  return parsed ? SHORT_DATE_FORMATTER.format(parsed) : dateValue;
}

/** "19 Apr" for an API date (YYYY-MM-DD); other strings pass through. */
export function formatDayMonth(dateValue: string): string {
  const parsed = parseApiDate(dateValue);
  return parsed ? DAY_MONTH_FORMATTER.format(parsed) : dateValue;
}
